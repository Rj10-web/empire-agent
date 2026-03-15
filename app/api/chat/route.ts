import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents'
import { getBestProvider } from '@/lib/ai-provider'
import { getDemoResponse } from '@/lib/demo-responses'

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    const agent = getAgent(agentId ?? 'empire')
    const provider = getBestProvider()
    const encoder = new TextEncoder()

    // Demo mode — no API key configured
    if (!provider) {
      const demoText = getDemoResponse(agentId ?? 'empire')
      const words = demoText.split(' ')

      const readable = new ReadableStream({
        async start(controller) {
          // Stream demo response word by word
          for (const word of words) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`),
            )
            await new Promise((r) => setTimeout(r, 30))
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ text: '\n\n---\n*Demo mode — add GROQ_API_KEY to Vercel for live AI. Free at console.groq.com*' })}\n\n`,
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

    // Pick model based on agent and provider
    const useSmart = agentId === 'researcher' || agentId === 'cinematic'
    const model = useSmart ? provider.models.smart : provider.models.fast

    const stream = await provider.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
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
