import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getAgent } from '@/lib/agents'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://empire-agent.vercel.app',
    'X-Title': 'Empire Agent',
  },
})

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    const agent = getAgent(agentId ?? 'empire')

    const model = agentId === 'researcher' || agentId === 'cinematic'
      ? 'anthropic/claude-opus-4-6'
      : 'anthropic/claude-sonnet-4-6'

    const stream = await client.chat.completions.create({
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

    const encoder = new TextEncoder()
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
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return new Response(JSON.stringify({ error: 'Failed to start stream' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
