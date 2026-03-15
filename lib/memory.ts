/**
 * Empire Agent Memory System
 * Persistent memory across browser sessions (localStorage)
 * Injected into every AI conversation for continuity
 */

export interface MemoryEntry {
  id: string
  key: string
  value: string
  timestamp: string
  category: 'fact' | 'preference' | 'goal' | 'context' | 'decision'
  agentId?: string
}

export const MEMORY_STORAGE_KEY = 'empire_agent_memory'

export function loadMemories(): MemoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry {
  const memories = loadMemories()
  const newEntry: MemoryEntry = {
    ...entry,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
  }

  // Deduplicate by key
  const filtered = memories.filter(m => m.key.toLowerCase() !== entry.key.toLowerCase())
  const updated = [newEntry, ...filtered].slice(0, 100) // Max 100 memories

  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(updated))
  return newEntry
}

export function deleteMemory(id: string): void {
  const memories = loadMemories()
  const updated = memories.filter(m => m.id !== id)
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(updated))
}

export function clearMemories(): void {
  localStorage.removeItem(MEMORY_STORAGE_KEY)
}

export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (!memories.length) return ''

  const byCategory = memories.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m)
    return acc
  }, {} as Record<string, MemoryEntry[]>)

  const sections = Object.entries(byCategory).map(([cat, entries]) => {
    const header = cat.toUpperCase()
    const items = entries.map(e => `  - ${e.key}: ${e.value}`).join('\n')
    return `${header}:\n${items}`
  })

  return sections.join('\n\n')
}

// Parse AI response for memory commands: [REMEMBER: key | value | category]
export function parseMemoryCommands(text: string): Array<Omit<MemoryEntry, 'id' | 'timestamp'>> {
  const commands: Array<Omit<MemoryEntry, 'id' | 'timestamp'>> = []
  const regex = /\[REMEMBER:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(fact|preference|goal|context|decision)\s*\]/gi

  let match
  while ((match = regex.exec(text)) !== null) {
    commands.push({
      key: match[1].trim(),
      value: match[2].trim(),
      category: match[3].trim() as MemoryEntry['category'],
    })
  }
  return commands
}

// Detect if user is asking to remember something
export function detectRememberRequest(text: string): { key: string; value: string } | null {
  const patterns = [
    /remember (?:that )?(.+?) is (.+)/i,
    /remember (.+?): (.+)/i,
    /save (?:that )?(.+?) is (.+)/i,
    /note (?:that )?(.+?) (?:is|=) (.+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return { key: match[1].trim(), value: match[2].trim() }
    }
  }
  return null
}
