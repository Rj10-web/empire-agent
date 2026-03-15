import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents'
import { getBestProvider } from '@/lib/ai-provider'
import { getDemoResponse } from '@/lib/demo-responses'
import { MEMORY_SYSTEM_PROMPT } from '@/lib/roobmy-context'

// Keywords that always trigger a real-time search
const SEARCH_TRIGGERS = [
  'this week', 'today', 'recent', 'latest', 'posted', 'just', 'now',
  'trending', 'right now', 'currently', 'new', '2026', 'this month',
  'what did', 'what is', 'what are', 'find me', 'search for', 'look up',
]

// Agents that should always search for external queries
const SEARCH_AGENTS = ['researcher']

function shouldAutoSearch(agentId: string, userMessage: string): boolean {
  const msg = userMessage.toLowerCase()
  if (SEARCH_AGENTS.includes(agentId)) {
    return SEARCH_TRIGGERS.some(t => msg.includes(t))
  }
  // Other agents search if explicitly asked
  return msg.startsWith('search') || msg.startsWith('look up') || msg.startsWith('find me')
}

function buildSearchQuery(userMessage: string, agentId: string): string {
  // Clean up the user message into a good search query
  const msg = userMessage
    .replace(/^(search for|look up|find me|what did|what is|what are)\s+/i, '')
    .replace(/\?$/, '')
    .trim()

  // Add context for researcher agent
  if (agentId === 'researcher') {
    if (!msg.includes('2026') && !msg.includes('week') && !msg.includes('today')) {
      return `${msg} 2026`
    }
  }
  return msg
}

async function executeSearch(query: string): Promise<{ results: string; source: string }> {
  try {
    const vercelUrl = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL
    const baseUrl = vercelUrl
      ? (vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`)
      : 'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return { results: `Search failed: ${res.status}`, source: 'error' }

    const data = await res.json()
    if (!data.results?.length) return { results: `No results found for: ${query}`, source: 'none' }

    const formatted = data.results
      .map((r: { title: string; url: string; description: string }, i: number) =>
        `[${i + 1}] ${r.title}\n${r.description}\nSource: ${r.url}`,
      )
      .join('\n\n')

    return { results: formatted, source: data.source }
  } catch (err) {
    return { results: `Search error: ${String(err)}`, source: 'error' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId, memories } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    const agent = getAgent(agentId ?? 'empire')
    const provider = getBestProvider()
    const encoder = new TextEncoder()

    // Build system prompt with memory context
    const memoryContext = memories && memories.length > 0
      ? MEMORY_SYSTEM_PROMPT(memories)
      : ''

    // Demo mode — no API key configured
    if (!provider) {
      const demoText = getDemoResponse(agentId ?? 'empire')
      const words = demoText.split(' ')
      const readable = new ReadableStream({
        async start(controller) {
          for (const word of words) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`))
            await new Promise((r) => setTimeout(r, 25))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '\n\n---\n*Demo mode — add GROQ_API_KEY at console.groq.com (free) to unlock full AI*' })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })
      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
      })
    }

    // Pick model based on agent
    const useSmart = agentId === 'researcher' || agentId === 'cinematic'
    const model = useSmart ? provider.models.smart : provider.models.fast

    // Get the last user message for search detection
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    const userText = lastUserMsg?.content ?? ''

    // Pre-search: inject real-time results before AI generates response
    let searchContext = ''
    let searchSource = ''
    if (shouldAutoSearch(agentId ?? 'empire', userText)) {
      const searchQuery = buildSearchQuery(userText, agentId ?? 'empire')
      const { results, source } = await executeSearch(searchQuery)
      searchSource = source
      if (source !== 'error' && source !== 'none') {
        searchContext = `\n\n─── LIVE WEB SEARCH RESULTS ───\nQuery: "${searchQuery}" (via Brave Search)\n\n${results}\n─────────────────────────────\n\nUse these real search results to give a current, accurate answer. Cite sources where relevant.`
      }
    }

    const systemPrompt = `${agent.systemPrompt}\n${memoryContext}${searchContext}`

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // Stream the response
    const stream = await provider.client.chat.completions.create({
      model,
      messages: allMessages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.8,
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Signal if search was used
          if (searchContext && searchSource !== 'error') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ meta: { searched: true, source: searchSource } })}\n\n`))
          }

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Provider': provider.name,
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return new Response(JSON.stringify({ error: 'Failed to start stream', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
