/**
 * Web Search API for Empire Agent
 * Uses Brave Search (if BRAVE_API_KEY set) or DuckDuckGo Instant Answers (free, no key)
 * Gives the AI real-time research capability
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SearchResult {
  title: string
  url: string
  description: string
}

interface SearchResponse {
  query: string
  results: SearchResult[]
  source: 'brave' | 'duckduckgo' | 'error'
  timestamp: string
}

async function searchBrave(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) throw new Error('No Brave API key')

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=en`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`Brave search failed: ${res.status}`)
  const data = await res.json()

  return (data.web?.results ?? []).slice(0, 5).map((r: { title?: string; url?: string; description?: string }) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    description: r.description ?? '',
  }))
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  // DuckDuckGo Instant Answers API — free, no key
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EmpireAgent/1.0' },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`DDG failed: ${res.status}`)
  const data = await res.json()

  const results: SearchResult[] = []

  // Abstract (main answer)
  if (data.AbstractText) {
    results.push({
      title: data.Heading ?? query,
      url: data.AbstractURL ?? '',
      description: data.AbstractText,
    })
  }

  // Related topics
  for (const topic of (data.RelatedTopics ?? []).slice(0, 4)) {
    if (topic.Text && topic.FirstURL) {
      results.push({
        title: topic.Text.split(' - ')[0] ?? topic.Text.slice(0, 60),
        url: topic.FirstURL,
        description: topic.Text,
      })
    }
  }

  return results
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 })
  }

  const response: SearchResponse = {
    query,
    results: [],
    source: 'duckduckgo',
    timestamp: new Date().toISOString(),
  }

  // Try Brave first if API key available
  if (process.env.BRAVE_API_KEY) {
    try {
      response.results = await searchBrave(query)
      response.source = 'brave'
      return NextResponse.json(response)
    } catch {
      // Fall through to DuckDuckGo
    }
  }

  // DuckDuckGo fallback (always free)
  try {
    response.results = await searchDuckDuckGo(query)
    response.source = 'duckduckgo'
    return NextResponse.json(response)
  } catch (err) {
    return NextResponse.json({
      query,
      results: [],
      source: 'error',
      error: String(err),
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
