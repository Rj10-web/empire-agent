import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    api: false,
    model: 'anthropic/claude-sonnet-4-6',
    timestamp: new Date().toISOString(),
  }

  // Test OpenRouter connectivity
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://empire-agent.vercel.app',
      },
      signal: AbortSignal.timeout(5000),
    })
    checks.api = res.ok
  } catch {
    checks.api = false
  }

  const healthy = checks.api

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      checks,
      empire: {
        agent: 'Empire Agent v1.0',
        owner: 'Roobmy Joseph',
        goal: '$1M by 2026',
      },
    },
    { status: healthy ? 200 : 503 }
  )
}
