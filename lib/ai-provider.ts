/**
 * Multi-provider AI client with automatic fallback
 * Priority: Groq (free) → Gemini (free) → Together AI (free) → OpenRouter → Demo mode
 */
import OpenAI from 'openai'

export type Provider = 'groq' | 'gemini' | 'together' | 'openrouter' | 'demo'

export interface ProviderConfig {
  name: Provider
  client: OpenAI
  models: { fast: string; smart: string }
  available: boolean
}

function makeClient(baseURL: string, apiKey: string | undefined, headers?: Record<string, string>) {
  return new OpenAI({
    baseURL,
    apiKey: apiKey ?? 'demo',
    defaultHeaders: headers,
  })
}

export function getProviders(): ProviderConfig[] {
  return [
    {
      name: 'groq',
      client: makeClient('https://api.groq.com/openai/v1', process.env.GROQ_API_KEY),
      models: { fast: 'llama-3.1-8b-instant', smart: 'llama-3.3-70b-versatile' },
      available: !!process.env.GROQ_API_KEY,
    },
    {
      name: 'gemini',
      client: makeClient(
        'https://generativelanguage.googleapis.com/v1beta/openai/',
        process.env.GEMINI_API_KEY,
      ),
      models: { fast: 'gemini-1.5-flash', smart: 'gemini-1.5-pro' },
      available: !!process.env.GEMINI_API_KEY,
    },
    {
      name: 'together',
      client: makeClient('https://api.together.xyz/v1', process.env.TOGETHER_API_KEY),
      models: {
        fast: 'meta-llama/Llama-3.2-3B-Instruct-Turbo',
        smart: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      },
      available: !!process.env.TOGETHER_API_KEY,
    },
    {
      name: 'openrouter',
      client: makeClient('https://openrouter.ai/api/v1', process.env.OPENROUTER_API_KEY, {
        'HTTP-Referer': 'https://empire-agent-eight.vercel.app',
        'X-Title': 'Empire Agent',
      }),
      models: {
        fast: 'anthropic/claude-haiku-4-5-20251001',
        smart: 'anthropic/claude-sonnet-4-6',
      },
      available: !!process.env.OPENROUTER_API_KEY,
    },
  ]
}

export function getBestProvider(preferSmart = false): ProviderConfig | null {
  const providers = getProviders()
  return providers.find((p) => p.available) ?? null
}

export function getProviderStatus() {
  const providers = getProviders()
  const active = providers.find((p) => p.available)
  return {
    activeProvider: active?.name ?? 'demo',
    availableProviders: providers.filter((p) => p.available).map((p) => p.name),
    allProviders: providers.map((p) => ({ name: p.name, available: p.available })),
  }
}
