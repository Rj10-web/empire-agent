import { NextResponse } from 'next/server'
import { getBestProvider } from '@/lib/ai-provider'

export const dynamic = 'force-dynamic'

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

const STATIC_NEWS = {
  updates: [
    { tool: 'Groq', update: 'Free tier: 14,400 req/day — fastest inference available. Llama 3.3 70B runs at 800 tokens/sec.', relevance: 'high', action: 'Sign up at console.groq.com — free API key, no credit card needed', icon: '⚡' },
    { tool: 'ElevenLabs', update: 'Voice cloning in 30 seconds. Free tier available. Scale your content voice without recording everything.', relevance: 'high', action: 'Clone your voice once, generate all future content audio', icon: '🎙️' },
    { tool: 'Kling AI', update: 'Best free video generation right now. 5 sec clips, photorealistic. Free tier included.', relevance: 'high', action: 'Use for Empire Blueprint explainer clips', icon: '🎬' },
    { tool: 'Opus Clip', update: 'AI clip finding + auto-captioning. Repurpose 1 YouTube video into 10 viral shorts automatically.', relevance: 'high', action: 'Run every YouTube upload through Opus Clip same day', icon: '✂️' },
    { tool: 'Gemini 2.0 Flash', update: 'Free tier: 1,500 req/day. Multimodal — reads images, PDFs, video frames. Google AI Studio.', relevance: 'medium', action: 'Use as Empire Agent AI fallback — free, fast, powerful', icon: '💎' },
    { tool: 'HeyGen', update: 'AI avatar videos. Create your digital twin. Scales content 10x without filming.', relevance: 'medium', action: 'Create Roobmy AI avatar for Empire Blueprint course content', icon: '🤖' },
    { tool: 'Captions.ai', update: 'Auto-captions with viral style presets. Best for TikTok/Reels engagement.', relevance: 'medium', action: 'Apply to all short-form content immediately', icon: '📝' },
    { tool: 'Together AI', update: 'Free $25 credits on signup. Run Llama 3.3 70B, Flux image gen, and more. No credit card.', relevance: 'medium', action: 'Sign up for free credits — use as Empire Agent AI backup', icon: '🤝' },
  ],
  topPick: {
    tool: 'Groq + Llama 3.3 70B',
    reason: 'Completely free (14,400 req/day), fastest inference in the world (800 tok/sec), GPT-4 quality. Empire Agent should use this as primary AI — zero cost forever.'
  },
  generatedAt: new Date().toISOString(),
  source: 'static',
}

export async function GET() {
  const provider = getBestProvider()

  if (!provider) {
    return NextResponse.json(STATIC_NEWS)
  }

  try {
    const completion = await provider.client.chat.completions.create({
      model: provider.models.fast,
      messages: [
        {
          role: 'user',
          content: `You are monitoring the AI space for Roobmy Joseph, a 20yo entrepreneur building a content empire (FlipzyX AI agency + Empire Blueprint financial literacy + Grind University YouTube).

Based on your knowledge of these AI tools:
${TRACKED_TOOLS.map((t) => `- ${t}`).join('\n')}

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
    "reason": "why this is the biggest opportunity for Roobmy right now"
  },
  "generatedAt": "${new Date().toISOString()}"
}

Focus on tools that help with: short-form video, voice cloning, AI video generation, caption automation, content distribution. Be specific and actionable.`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.3,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const cleanJson = raw.replace(/```json\n?|\n?```/g, '').trim()

    try {
      const data = JSON.parse(cleanJson)
      return NextResponse.json({ ...data, source: provider.name })
    } catch {
      return NextResponse.json({ ...STATIC_NEWS, raw, source: provider.name })
    }
  } catch (err) {
    return NextResponse.json({ ...STATIC_NEWS, error: String(err) })
  }
}
