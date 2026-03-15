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
  // DuckDuckGo Instant Answers API — free, no key needed
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&t=EmpireAgent`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EmpireAgent/1.0)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) throw new Error(`DDG failed: ${res.status}`)

  const text = await res.text()
  if (!text || text.trim().length < 10) throw new Error('Empty DDG response')

  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('DDG returned invalid JSON')
  }

  const results: SearchResult[] = []

  // Abstract (main answer)
  if (data.AbstractText) {
    results.push({
      title: (data.Heading as string) ?? query,
      url: (data.AbstractURL as string) ?? '',
      description: data.AbstractText as string,
    })
  }

  // Answer (for simple factual queries)
  if (data.Answer && data.AnswerType !== 'calc') {
    results.push({
      title: `Answer: ${query}`,
      url: '',
      description: data.Answer as string,
    })
  }

  // Related topics
  const topics = (data.RelatedTopics as Array<{ Text?: string; FirstURL?: string }>) ?? []
  for (const topic of topics.slice(0, 4)) {
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

// Fallback: use knowledge base synthesis when search fails
function getKnowledgeFallback(query: string): SearchResult[] {
  return [{
    title: `Research: ${query}`,
    url: '',
    description: `Note: Live search is currently unavailable. The AI will answer based on training knowledge. For real-time data, add a BRAVE_API_KEY from search.brave.com (free tier: 2000 queries/month).`,
  }]
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
    if (response.results.length === 0) {
      response.results = getKnowledgeFallback(query)
    }
    return NextResponse.json(response)
  } catch {
    // Ultimate fallback — return knowledge base note
    return NextResponse.json({
      query,
      results: getKnowledgeFallback(query),
      source: 'duckduckgo',
      timestamp: new Date().toISOString(),
    })
  }
}
