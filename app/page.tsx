'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AGENTS } from '@/lib/agents'
import type { Message } from '@/lib/types'
import Dashboard from '@/components/Dashboard'
import { Send, ChevronDown } from 'lucide-react'

function formatMarkdown(text: string): string {
  return text
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

export default function Home() {
  const [activeAgent, setActiveAgent] = useState('empire')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showDashboard, setShowDashboard] = useState(true)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const agent = AGENTS.find(a => a.id === activeAgent) ?? AGENTS[0]

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

  const switchAgent = (id: string) => {
    setActiveAgent(id)
    setMessages([])
    setInput('')
  }

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isStreaming) return

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, agentId: activeAgent }),
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
  }, [input, messages, activeAgent, isStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#080810] text-white overflow-hidden">
      {/* TOP NAV */}
      <header className="flex-shrink-0 bg-[#0f0f1a] border-b border-[#1e1e38] px-3 py-2 flex items-center gap-2">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #00AEEF, #FFD700)', color: '#000' }}>
          R
        </div>
        <span className="font-bold text-[#00AEEF] text-sm hidden sm:block">Empire Agent</span>

        {/* Agent Tabs */}
        <div className="flex items-center gap-1 mx-2 overflow-x-auto flex-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {AGENTS.map(a => (
            <button
              key={a.id}
              onClick={() => switchAgent(a.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                activeAgent === a.id
                  ? 'text-black'
                  : 'bg-[#16162a] text-gray-400 hover:text-white hover:bg-[#1e1e38]'
              }`}
              style={activeAgent === a.id ? {
                background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)`,
              } : {}}
            >
              <span>{a.icon}</span>
              <span className="hidden sm:block">{a.name}</span>
            </button>
          ))}
        </div>

        {/* Dashboard toggle (mobile) */}
        <button
          onClick={() => setDashboardOpen(!dashboardOpen)}
          className="lg:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#16162a] text-xs text-gray-400 hover:text-white"
        >
          📊 <ChevronDown size={12} className={`transition-transform ${dashboardOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Status */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 hidden md:flex">
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
        {/* CHAT PANEL */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Agent Header */}
          <div className="flex-shrink-0 px-4 py-3 bg-[#0f0f1a] border-b border-[#1e1e38] flex items-center gap-3">
            <span className="text-2xl">{agent.icon}</span>
            <div>
              <div className="font-bold text-sm" style={{ color: agent.color }}>{agent.name}</div>
              <div className="text-xs text-gray-500">{agent.tagline}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center pb-8">
                <div className="text-5xl">{agent.icon}</div>
                <div>
                  <p className="font-bold text-lg" style={{ color: agent.color }}>{agent.name}</p>
                  <p className="text-gray-500 text-sm mt-1">{agent.tagline}</p>
                </div>
                {/* Quick suggestions */}
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
                    msg.role === 'user'
                      ? 'text-white rounded-tr-sm'
                      : 'text-gray-200 rounded-tl-sm'
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
                  placeholder={`Message ${agent.name}…`}
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
              Powered by Claude via OpenRouter • Enter to send • Shift+Enter for newline
            </p>
          </div>
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
