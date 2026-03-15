import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents'
import { getBestProvider } from '@/lib/ai-provider'
import { getDemoResponse } from '@/lib/demo-responses'
import { MEMORY_SYSTEM_PROMPT } from '@/lib/roobmy-context'

// Keywords that trigger auto-search for the researcher agent
const SEARCH_TRIGGERS = [
  'this week', 'today', 'recent', 'latest', 'posted', 'just posted',
  'right now', 'currently', 'this month', 'trending', '2026',
  'what did', 'what is', 'what are', 'find me', 'search', 'look up',
]

const SEARCH_AGENTS = new Set(['researcher'])

function shouldAutoSearch(agentId: string, msg: string): boolean {
  const lower = msg.toLowerCase()
  if (SEARCH_AGENTS.has(agentId)) {
    return SEARCH_TRIGGERS.some((t) => lower.includes(t))
  }
  return lower.startsWith('search') || lower.startsWith('look up') || lower.startsWith('find me')
}

function buildSearchQuery(msg: string, agentId: string): string {
  const cleaned = msg
    .replace(/^(search for|look up|find me|what did|what is|what are)\s+/i, '')
    .replace(/[?!]$/, '')
    .trim()
  // Add recency context for researcher queries
  if (SEARCH_AGENTS.has(agentId) && !cleaned.match(/\b(2026|week|today|month)\b/i)) {
    return `${cleaned} 2026`
  }
  return cleaned
}

// Direct Brave Search call — no HTTP self-calling
async function searchBrave(query: string): Promise<{ results: string; source: string }> {
  const apiKey = process.env.BRAVE_API_KEY
  if (!apiKey) return { results: '', source: 'no_key' }

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=en`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return { results: `Search unavailable (${res.status})`, source: 'error' }

    const text = await res.text()
    const data = JSON.parse(text)
    const hits = (data.web?.results ?? []).slice(0, 5)
    if (!hits.length) return { results: '', source: 'empty' }

    const formatted = hits
      .map((r: { title?: string; description?: string; url?: string }, i: number) =>
        `[${i + 1}] ${r.title ?? ''}\n${r.description ?? ''}\nURL: ${r.url ?? ''}`,
      )
      .join('\n\n')

    return { results: formatted, source: 'brave' }
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

    const memoryContext = memories && memories.length > 0 ? MEMORY_SYSTEM_PROMPT(memories) : ''

    // Demo mode
    if (!provider) {
      const demoText = getDemoResponse(agentId ?? 'empire')
      const words = demoText.split(' ')
      const readable = new ReadableStream({
        async start(controller) {
          for (const word of words) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`))
            await new Promise((r) => setTimeout(r, 25))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: '\n\n---\n*Demo mode — add GROQ_API_KEY at console.groq.com to unlock full AI*' })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })
      return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
      })
    }

    const useSmart = agentId === 'researcher' || agentId === 'cinematic'
    const model = useSmart ? provider.models.smart : provider.models.fast

    // Get last user message for search detection
    const userText = [...messages].reverse().find((m: { role: string }) => m.role === 'user')?.content ?? ''

    // Auto-search: call Brave directly (no HTTP self-call)
    let searchContext = ''
    let searchSource = ''
    if (shouldAutoSearch(agentId ?? 'empire', userText)) {
      const query = buildSearchQuery(userText, agentId ?? 'empire')
      const { results, source } = await searchBrave(query)
      searchSource = source
      if (results && source === 'brave') {
        searchContext = `\n\n─── LIVE WEB SEARCH RESULTS (Brave Search) ───
Query: "${query}"

${results}
──────────────────────────────────────────────

Use these real-time search results in your response. Reference specific findings from the results above. Cite URLs where helpful.`
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
          // Send search metadata first if search was used
          if (searchSource === 'brave') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ meta: { searched: true, source: 'brave' } })}\n\n`),
            )
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
        'X-Searched': searchSource === 'brave' ? 'true' : 'false',
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
