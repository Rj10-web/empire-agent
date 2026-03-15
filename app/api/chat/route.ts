import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents'
import { getBestProvider } from '@/lib/ai-provider'
import { getDemoResponse } from '@/lib/demo-responses'
import { MEMORY_SYSTEM_PROMPT } from '@/lib/roobmy-context'

// Web search tool definition (for providers that support function calling)
const SEARCH_TOOL = {
  type: 'function' as const,
  function: {
    name: 'web_search',
    description: 'Search the web for real-time information about competitors, trends, AI tools, news, or anything that may have changed since training data cutoff.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Be specific and include relevant context.',
        },
      },
      required: ['query'],
    },
  },
}

async function executeSearch(query: string): Promise<string> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) return `Search failed: ${res.status}`

    const data = await res.json()
    if (!data.results?.length) return `No results found for: ${query}`

    return data.results
      .map((r: { title: string; url: string; description: string }, i: number) =>
        `[${i + 1}] ${r.title}\n${r.description}\nSource: ${r.url}`,
      )
      .join('\n\n')
  } catch (err) {
    return `Search error: ${String(err)}`
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

    const systemPrompt = `${agent.systemPrompt}\n${memoryContext}`

    // Demo mode — no API key configured
    if (!provider) {
      const demoText = getDemoResponse(agentId ?? 'empire')
      const words = demoText.split(' ')

      const readable = new ReadableStream({
        async start(controller) {
          for (const word of words) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`),
            )
            await new Promise((r) => setTimeout(r, 25))
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ text: '\n\n---\n*Demo mode — add GROQ_API_KEY at console.groq.com (free) to unlock full AI*' })}\n\n`,
            ),
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // Pick model based on agent
    const useSmart = agentId === 'researcher' || agentId === 'cinematic'
    const model = useSmart ? provider.models.smart : provider.models.fast

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // Try with tool calling (search) — Groq and Gemini support this
    // If tool call needed, execute search then continue
    let finalMessages = allMessages
    let searchUsed = false

    try {
      // Non-streaming first pass to check for tool calls
      const toolCheckResponse = await provider.client.chat.completions.create({
        model,
        messages: allMessages,
        tools: [SEARCH_TOOL],
        tool_choice: 'auto',
        max_tokens: 200, // Just to check if it wants to search
        temperature: 0.3,
        stream: false,
      })

      const choice = toolCheckResponse.choices[0]
      if (choice?.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
        // Execute the search
        const toolCall = choice.message.tool_calls[0]
        const args = JSON.parse(toolCall.function.arguments)
        const searchResults = await executeSearch(args.query)
        searchUsed = true

        // Add tool result to messages
        finalMessages = [
          ...allMessages,
          {
            role: 'assistant' as const,
            content: choice.message.content ?? '',
            tool_calls: choice.message.tool_calls,
          } as never,
          {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: searchResults,
          } as never,
        ]
      }
    } catch {
      // Tool calling not supported by this provider — continue without search
    }

    // Stream the final response
    const stream = await provider.client.chat.completions.create({
      model,
      messages: finalMessages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.8,
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Signal search was used
          if (searchUsed) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ meta: { searched: true } })}\n\n`),
            )
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`),
          )
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
