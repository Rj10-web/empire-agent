import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://empire-agent.vercel.app',
    'X-Title': 'Empire Agent',
  },
})

// AI tools Roobmy should track
const TRACKED_TOOLS = [
  'Claude (Anthropic)',
  'GPT (OpenAI)',
  'Runway ML',
  'Kling AI',
  'Sora',
  'HeyGen',
  'ElevenLabs',
  'Pika Labs',
  'Captions.ai',
  'Opus Clip',
]

export async function GET() {
  try {
    const completion = await client.chat.completions.create({
      model: 'anthropic/claude-sonnet-4-6',
      messages: [
        {
          role: 'user',
          content: `You are monitoring the AI space for Roobmy Joseph, a 20yo entrepreneur building a content empire (FlipzyX + Empire Blueprint + Grind University YouTube).

Based on your knowledge of these AI tools as of your training cutoff:
${TRACKED_TOOLS.map(t => `- ${t}`).join('\n')}

Return a JSON object with this exact structure (no markdown, just JSON):
{
  "updates": [
    {
      "tool": "tool name",
      "update": "what's new or notable",
      "relevance": "high|medium|low",
      "action": "specific action Roobmy should take",
      "icon": "emoji"
    }
  ],
  "topPick": {
    "tool": "tool name",
    "reason": "why this is the biggest opportunity for Roobmy's content empire right now"
  },
  "generatedAt": "${new Date().toISOString()}"
}

Focus on tools that help with:
1. Short-form video content (TikTok/Reels/Shorts)
2. Voice cloning for scalable content
3. AI video generation
4. Caption automation
5. Content distribution

Be specific and actionable. Think about what gives Roobmy an unfair advantage.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const cleanJson = raw.replace(/```json\n?|\n?```/g, '').trim()

    try {
      const data = JSON.parse(cleanJson)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ raw, error: 'Parse failed' }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
