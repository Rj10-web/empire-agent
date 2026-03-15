'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AGENTS } from '@/lib/agents'
import type { Message } from '@/lib/types'
import Dashboard from '@/components/Dashboard'
import SkillsDashboard from '@/components/SkillsDashboard'
import { findSkill, SKILLS_REGISTRY } from '@/lib/skills-registry'
import {
  loadMemories,
  saveMemory,
  deleteMemory,
  formatMemoriesForPrompt,
  parseMemoryCommands,
  detectRememberRequest,
  type MemoryEntry,
} from '@/lib/memory'
import { Send, ChevronDown, Zap, Brain, X, Trash2 } from 'lucide-react'

function formatMarkdown(text: string): string {
  return text
    .replace(/\[REMEMBER:[^\]]+\]/gi, '') // Strip memory commands from display
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>'
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, (rows) => `<table>${rows}</table>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (items) => `<ul>${items}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[a-z])/gm, '')
    .replace(/(<\/ul>|<\/table>|<\/h[123]>|<\/blockquote>|<hr\/>)\n?<\/p>/g, '$1')
    .replace(/<p>(<[a-z])/g, '$1')
}

function detectSkillCommand(text: string): string | null {
  const match = text.match(/^use\s+([\w-]+)/i)
  return match ? match[1].toLowerCase() : null
}

type ViewMode = 'chat' | 'skills'

export default function Home() {
  const [activeAgent, setActiveAgent] = useState('empire')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showDashboard, setShowDashboard] = useState(true)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [showMemory, setShowMemory] = useState(false)
  const [memoryNotification, setMemoryNotification] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const agent = AGENTS.find(a => a.id === activeAgent) ?? AGENTS[0]

  // Load memories from localStorage on mount
  useEffect(() => {
    setMemories(loadMemories())
  }, [])

  // Responsive layout
  useEffect(() => {
    const check = () => setShowDashboard(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  const showMemoryNotif = (text: string) => {
    setMemoryNotification(text)
    setTimeout(() => setMemoryNotification(null), 3000)
  }

  const handleSaveMemory = (key: string, value: string, category: MemoryEntry['category'] = 'fact') => {
    const entry = saveMemory({ key, value, category, agentId: activeAgent })
    setMemories(loadMemories())
    showMemoryNotif(`Remembered: "${key}"`)
    return entry
  }

  const handleDeleteMemory = (id: string) => {
    deleteMemory(id)
    setMemories(loadMemories())
  }

  const switchAgent = (id: string) => {
    setActiveAgent(id)
    setMessages([])
    setInput('')
    setViewMode('chat')
  }

  const sendMessage = useCallback(async (text?: string) => {
    const rawContent = (text ?? input).trim()
    if (!rawContent || isStreaming) return

    // Check for explicit remember request
    const rememberReq = detectRememberRequest(rawContent)
    if (rememberReq) {
      handleSaveMemory(rememberReq.key, rememberReq.value, 'fact')
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: rawContent,
        timestamp: new Date(),
        agentId: activeAgent,
      }
      const ackMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Got it. I'll remember that **${rememberReq.key}** is **${rememberReq.value}**. This is saved to my memory and will persist across all future conversations.`,
        timestamp: new Date(),
        agentId: activeAgent,
      }
      setMessages(prev => [...prev, userMsg, ackMsg])
      setInput('')
      return
    }

    // Check for skill command: "use [skill-name]"
    const skillCmd = detectSkillCommand(rawContent)
    if (skillCmd) {
      const skill = findSkill(skillCmd)
      if (skill) {
        const skillEnrichedContent = `[Using skill: ${skill.id}] Apply the methodology and expertise of the "${skill.name}" skill. Description: ${skill.description}\n\nTask: ${rawContent.replace(/^use\s+[\w-]+\s*/i, '') || `Help me with ${skill.name}`}`
        return sendMessage(skillEnrichedContent)
      }
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: rawContent,
      timestamp: new Date(),
      agentId: activeAgent,
    }

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      agentId: activeAgent,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Format memories for injection
    const currentMemories = loadMemories()
    const memoryText = formatMemoriesForPrompt(currentMemories)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          agentId: activeAgent,
          memories: memoryText,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              fullContent += parsed.text
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id ? { ...m, content: fullContent } : m
              ))
            }
          } catch { /* skip malformed */ }
        }
      }

      // Parse memory commands from AI response
      const memCmds = parseMemoryCommands(fullContent)
      for (const cmd of memCmds) {
        handleSaveMemory(cmd.key, cmd.value, cmd.category)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: '⚠️ Connection error. Check your API key and try again.' }
          : m
      ))
    } finally {
      setIsStreaming(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, messages, activeAgent, isStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleUseSkill = (skillId: string) => {
    setViewMode('chat')
    setInput(`use ${skillId} `)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  return (
    <div className="flex flex-col h-screen bg-[#080810] text-white overflow-hidden">
      {/* Memory Notification */}
      {memoryNotification && (
        <div className="fixed top-4 right-4 z-50 bg-[#FFD700] text-black text-xs font-bold px-4 py-2 rounded-xl shadow-lg animate-[fadeIn_0.2s_ease-out]">
          🧠 {memoryNotification}
        </div>
      )}

      {/* TOP NAV */}
      <header className="flex-shrink-0 bg-[#0f0f1a] border-b border-[#1e1e38] px-3 py-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #00AEEF, #FFD700)', color: '#000' }}>
          R
        </div>
        <span className="font-bold text-[#00AEEF] text-sm hidden sm:block flex-shrink-0">Empire Agent</span>

        {/* Agent Tabs */}
        <div className="flex items-center gap-1 mx-2 overflow-x-auto flex-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {AGENTS.map(a => (
            <button
              key={a.id}
              onClick={() => switchAgent(a.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                activeAgent === a.id && viewMode === 'chat'
                  ? 'text-black'
                  : 'bg-[#16162a] text-gray-400 hover:text-white hover:bg-[#1e1e38]'
              }`}
              style={activeAgent === a.id && viewMode === 'chat' ? {
                background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)`,
              } : {}}
            >
              <span>{a.icon}</span>
              <span className="hidden sm:block">{a.name}</span>
            </button>
          ))}

          {/* Skills Tab */}
          <button
            onClick={() => setViewMode(viewMode === 'skills' ? 'chat' : 'skills')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              viewMode === 'skills'
                ? 'bg-[#FFD700] text-black'
                : 'bg-[#16162a] text-gray-400 hover:text-white hover:bg-[#1e1e38]'
            }`}
          >
            <Zap size={12} />
            <span className="hidden sm:block">Skills</span>
            <span className="opacity-70">({SKILLS_REGISTRY.length})</span>
          </button>
        </div>

        {/* Memory Button */}
        <button
          onClick={() => setShowMemory(!showMemory)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
            showMemory ? 'bg-[#FFD70033] text-[#FFD700] border border-[#FFD70044]' : 'bg-[#16162a] text-gray-500 hover:text-white'
          }`}
          title="Memory"
        >
          <Brain size={13} />
          {memories.length > 0 && (
            <span className="text-[#FFD700] font-bold">{memories.length}</span>
          )}
        </button>

        {/* Dashboard toggle (mobile) */}
        <button
          onClick={() => setDashboardOpen(!dashboardOpen)}
          className="lg:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#16162a] text-xs text-gray-400 hover:text-white flex-shrink-0"
        >
          📊 <ChevronDown size={12} className={`transition-transform ${dashboardOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="items-center gap-1.5 text-xs text-gray-500 hidden md:flex flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Online</span>
        </div>
      </header>

      {/* MOBILE DASHBOARD DRAWER */}
      {dashboardOpen && !showDashboard && (
        <div className="flex-shrink-0 max-h-64 overflow-y-auto border-b border-[#1e1e38]">
          <Dashboard />
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Chat or Skills */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {viewMode === 'skills' ? (
            <SkillsDashboard onUseSkill={handleUseSkill} />
          ) : (
            <>
              {/* Agent Header */}
              <div className="flex-shrink-0 px-4 py-3 bg-[#0f0f1a] border-b border-[#1e1e38] flex items-center gap-3">
                <span className="text-2xl">{agent.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-sm" style={{ color: agent.color }}>{agent.name}</div>
                  <div className="text-xs text-gray-500">{agent.tagline}</div>
                </div>
                {memories.length > 0 && (
                  <div className="text-xs text-[#FFD700] bg-[#FFD70011] border border-[#FFD70022] px-2 py-1 rounded-lg">
                    🧠 {memories.length} memories loaded
                  </div>
                )}
              </div>

              {/* Memory Panel (inline) */}
              {showMemory && (
                <div className="flex-shrink-0 border-b border-[#1e1e38] bg-[#0d0d1a] max-h-48 overflow-y-auto">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#FFD700]">🧠 Memory ({memories.length} entries)</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { if (window.confirm('Clear all memories?')) { localStorage.removeItem('empire_agent_memory'); setMemories([]) } }}
                        className="text-xs text-gray-600 hover:text-red-400 flex items-center gap-1"
                      >
                        <Trash2 size={11} /> Clear all
                      </button>
                      <button onClick={() => setShowMemory(false)} className="text-gray-600 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {memories.length === 0 ? (
                    <p className="px-4 pb-3 text-xs text-gray-600">No memories yet. Tell me something to remember: &quot;Remember that my client is called Apex Digital&quot;</p>
                  ) : (
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                      {memories.map(m => (
                        <div key={m.id} className="flex items-center gap-1.5 bg-[#16162a] border border-[#1e1e38] rounded-lg px-2 py-1">
                          <span className="text-xs text-gray-400"><strong className="text-white">{m.key}:</strong> {m.value.slice(0, 40)}{m.value.length > 40 ? '...' : ''}</span>
                          <button onClick={() => handleDeleteMemory(m.id)} className="text-gray-700 hover:text-red-400 ml-1">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-6 text-center pb-8">
                    <div className="text-5xl">{agent.icon}</div>
                    <div>
                      <p className="font-bold text-lg" style={{ color: agent.color }}>{agent.name}</p>
                      <p className="text-gray-500 text-sm mt-1">{agent.tagline}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                      {agent.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s)}
                          className="px-3 py-2 rounded-xl text-xs bg-[#16162a] border border-[#1e1e38] text-gray-400 hover:text-white hover:border-[#00AEEF] transition-all text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-gray-700">
                      <p>💡 Type <code className="text-[#FFD700] bg-[#16162a] px-1 rounded">use [skill-name]</code> to activate any of {SKILLS_REGISTRY.length} skills</p>
                      <p>🧠 Type <code className="text-[#FFD700] bg-[#16162a] px-1 rounded">remember [thing] is [value]</code> for persistent memory</p>
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.2s_ease-out]`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2 flex items-center justify-center text-sm mt-0.5"
                        style={{ background: `linear-gradient(135deg, ${agent.color}33, ${agent.color}22)`, border: `1px solid ${agent.color}44` }}>
                        {agent.icon}
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user' ? 'text-white rounded-tr-sm' : 'text-gray-200 rounded-tl-sm'
                      } ${msg.role === 'assistant' && !msg.content ? 'typing-cursor' : ''}`}
                      style={msg.role === 'user'
                        ? { background: `linear-gradient(135deg, ${agent.color}cc, ${agent.color}99)`, color: '#000', fontWeight: 500 }
                        : { background: '#16162a', border: '1px solid #1e1e38' }
                      }
                    >
                      {msg.role === 'assistant' ? (
                        <div
                          className="prose-empire"
                          dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) || '' }}
                        />
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-[#1e1e38] bg-[#0f0f1a] px-4 py-3 pb-safe">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => { setInput(e.target.value); autoResize() }}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${agent.name}… or "use [skill]" or "remember [thing] is [value]"`}
                      rows={1}
                      className="w-full bg-[#16162a] border border-[#1e1e38] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none outline-none focus:border-[#00AEEF] transition-colors"
                      style={{ minHeight: '44px', maxHeight: '160px' }}
                      disabled={isStreaming}
                    />
                  </div>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isStreaming}
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                    style={{
                      background: input.trim() && !isStreaming
                        ? `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`
                        : '#1e1e38',
                      color: input.trim() && !isStreaming ? '#000' : '#444',
                    }}
                  >
                    {isStreaming ? (
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: agent.color, borderTopColor: 'transparent' }} />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
                <p className="text-center text-xs text-gray-700 mt-2">
                  Twin of Claude Code • Groq free AI • {memories.length} memories • {SKILLS_REGISTRY.length} skills
                </p>
              </div>
            </>
          )}
        </div>

        {/* DASHBOARD PANEL (desktop) */}
        {showDashboard && (
          <div className="w-80 xl:w-96 flex-shrink-0 border-l border-[#1e1e38] overflow-y-auto bg-[#0a0a14]">
            <Dashboard />
          </div>
        )}
      </div>
    </div>
  )
}
