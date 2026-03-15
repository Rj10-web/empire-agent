import { NextResponse } from 'next/server'
import { getProviderStatus } from '@/lib/ai-provider'

export const dynamic = 'force-dynamic'

export async function GET() {
  const providerStatus = getProviderStatus()
  const isHealthy = providerStatus.activeProvider !== 'demo'

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'demo',
      checks: {
        api: isHealthy,
        activeProvider: providerStatus.activeProvider,
        availableProviders: providerStatus.availableProviders,
        timestamp: new Date().toISOString(),
      },
      empire: {
        agent: 'Empire Agent v2.0',
        owner: 'Roobmy Joseph',
        goal: '$1M by 2026',
        freeAI: true,
      },
      setup: isHealthy
        ? null
        : {
            message: 'Running in demo mode. Add a free API key to unlock full AI.',
            options: [
              { provider: 'Groq (recommended)', url: 'https://console.groq.com', env: 'GROQ_API_KEY', free: true },
              { provider: 'Google Gemini', url: 'https://aistudio.google.com', env: 'GEMINI_API_KEY', free: true },
              { provider: 'Together AI', url: 'https://api.together.xyz', env: 'TOGETHER_API_KEY', free: '$25 credits' },
            ],
          },
    },
    { status: 200 },
  )
}
