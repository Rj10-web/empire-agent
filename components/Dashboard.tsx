'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Clock, Zap, DollarSign, Activity, Eye } from 'lucide-react'

const PLATFORMS = [
  {
    name: 'YouTube',
    icon: '▶️',
    handle: '@Grinduniversity_1',
    followers: 7080,
    growth: null,
    views: '6.1M lifetime',
    connected: false,
    color: '#FF0000',
    statusNote: 'Connect YouTube API',
  },
  {
    name: 'TikTok',
    icon: '🎵',
    handle: '@roobmy.j',
    followers: null,
    growth: null,
    views: null,
    connected: false,
    color: '#69C9D0',
    statusNote: 'Connect TikTok API',
  },
  {
    name: 'Instagram',
    icon: '📸',
    handle: '@roobmy.j',
    followers: null,
    growth: null,
    views: null,
    connected: false,
    color: '#E1306C',
    statusNote: 'Connect Instagram API',
  },
  {
    name: 'LinkedIn',
    icon: '💼',
    handle: 'Roobmy Joseph',
    followers: null,
    growth: null,
    views: null,
    connected: false,
    color: '#0A66C2',
    statusNote: 'Connect LinkedIn API',
  },
  {
    name: 'Twitter/X',
    icon: '𝕏',
    handle: '@roobmy.j',
    followers: null,
    growth: null,
    views: null,
    connected: false,
    color: '#FFFFFF',
    statusNote: 'Connect Twitter API',
  },
]

const REVENUE_GOAL = 1_000_000
const REVENUE_CURRENT = 0

const COMPETITOR_FEED = [
  {
    creator: 'Alex Hormozi',
    platform: 'Instagram',
    content: '"The problem isn\'t your idea. It\'s your execution speed."',
    insight: 'Brutal simplicity. He posts raw truths with zero fluff.',
    ago: '2h ago',
    icon: '🔥',
  },
  {
    creator: 'Gary Vee',
    platform: 'LinkedIn',
    content: 'Document don\'t create — 47K impressions in 6 hours',
    insight: 'Consistency beats quality. He posts 10x/day and wins on volume.',
    ago: '5h ago',
    icon: '⚡',
  },
  {
    creator: 'Myron Golden',
    platform: 'YouTube',
    content: '"Why Poor People Buy Stuff Rich People Get For Free"',
    insight: 'Contrast + curiosity in title. This formula gets 500K+ views.',
    ago: '1d ago',
    icon: '💎',
  },
  {
    creator: 'David Goggins',
    platform: 'Instagram',
    content: 'No caption, just a 2AM run photo',
    insight: 'Authenticity wins. No caption needed when the visual tells the story.',
    ago: '1d ago',
    icon: '💪',
  },
]

const UPCOMING_CONTENT: { time: string; platform: string; title: string; status: 'scheduled' | 'draft' | 'overdue' }[] = [
  { time: 'Today 8AM', platform: 'YouTube', title: 'My First $1K Online Story', status: 'draft' },
  { time: 'Today 12PM', platform: 'TikTok', title: 'Empire Blueprint: Credit Score 101', status: 'scheduled' },
  { time: 'Today 6PM', platform: 'Instagram', title: 'Grind > Talent (Carousel)', status: 'draft' },
  { time: 'Tomorrow 8AM', platform: 'LinkedIn', title: 'How AI saved my client 20hrs/week', status: 'draft' },
]

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

export default function Dashboard() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const progressPct = Math.min((REVENUE_CURRENT / REVENUE_GOAL) * 100, 100)

  return (
    <div className="p-3 space-y-3 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-1">
        <div>
          <div className="font-bold text-white text-base">Empire Dashboard</div>
          <div className="text-xs text-gray-500">{date}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[#00AEEF] font-bold">{time}</div>
          <div className="text-xs text-gray-600">EST</div>
        </div>
      </div>

      {/* Revenue Goal */}
      <div className="bg-[#16162a] border border-[#1e1e38] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={14} className="text-[#FFD700]" />
          <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">Revenue Goal 2026</span>
        </div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-2xl font-black text-white">${formatNum(REVENUE_CURRENT)}</div>
            <div className="text-xs text-gray-500">of $1M goal</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Q2 target</div>
            <div className="font-bold text-[#FFD700]">$15K</div>
          </div>
        </div>
        <div className="w-full h-2 bg-[#0f0f1a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(progressPct, 2)}%`,
              background: 'linear-gradient(90deg, #00AEEF, #FFD700)',
            }}
          />
        </div>
        <div className="mt-1.5 text-xs text-gray-600">
          {progressPct.toFixed(2)}% complete • 3 paying clients = $15K milestone
        </div>
      </div>

      {/* Platform Stats */}
      <div className="bg-[#16162a] border border-[#1e1e38] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-[#00AEEF]" />
          <span className="text-xs font-semibold text-[#00AEEF] uppercase tracking-wide">Platform Stats</span>
        </div>
        <div className="space-y-2">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{p.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{p.handle}</div>
                  <div className="text-xs text-gray-600 truncate">{p.name}</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                {p.followers ? (
                  <div className="font-bold text-white">{formatNum(p.followers)}</div>
                ) : (
                  <div className="text-xs text-gray-600">—</div>
                )}
                {!p.connected && (
                  <div className="text-xs" style={{ color: '#FF6B35' }}>Not linked</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-[#1e1e38] text-xs text-gray-600">
          Ask Vault agent to connect platforms
        </div>
      </div>

      {/* Today's Content */}
      <div className="bg-[#16162a] border border-[#1e1e38] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-[#00AEEF]" />
          <span className="text-xs font-semibold text-[#00AEEF] uppercase tracking-wide">Today's Content</span>
        </div>
        <div className="space-y-2">
          {UPCOMING_CONTENT.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{
                  background: item.status === 'scheduled' ? '#22c55e'
                    : item.status === 'overdue' ? '#FF6B35'
                    : '#FFD700'
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white font-medium truncate">{item.title}</div>
                <div className="text-xs text-gray-500">{item.time} · {item.platform}</div>
              </div>
              <span
                className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: item.status === 'scheduled' ? '#22c55e22'
                    : item.status === 'overdue' ? '#FF6B3522'
                    : '#FFD70022',
                  color: item.status === 'scheduled' ? '#22c55e'
                    : item.status === 'overdue' ? '#FF6B35'
                    : '#FFD700'
                }}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-[#1e1e38] text-xs text-gray-600">
          Ask Calendar agent to schedule posts
        </div>
      </div>

      {/* Competitor Feed */}
      <div className="bg-[#16162a] border border-[#1e1e38] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={14} className="text-[#FFD700]" />
          <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">Competitor Feed</span>
        </div>
        <div className="space-y-3">
          {COMPETITOR_FEED.map((item, i) => (
            <div key={i} className="border-b border-[#1e1e38] pb-2 last:border-0 last:pb-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span>{item.icon}</span>
                <span className="font-semibold text-white text-xs">{item.creator}</span>
                <span className="text-gray-600 text-xs">{item.platform}</span>
                <span className="text-gray-700 text-xs ml-auto">{item.ago}</span>
              </div>
              <div className="text-xs text-gray-400 italic mb-1 truncate">{item.content}</div>
              <div className="text-xs text-[#00AEEF]">↗ {item.insight}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-[#1e1e38] text-xs text-gray-600">
          Ask Research agent for live competitor analysis
        </div>
      </div>

      {/* Active Agents */}
      <div className="bg-[#16162a] border border-[#1e1e38] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-[#00AEEF]" />
          <span className="text-xs font-semibold text-[#00AEEF] uppercase tracking-wide">Sub-Agents</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { name: 'Research', icon: '🔍', status: 'ready' },
            { name: 'Clipper', icon: '✂️', status: 'ready' },
            { name: 'Cinematic', icon: '🎬', status: 'ready' },
            { name: 'Calendar', icon: '📅', status: 'ready' },
            { name: 'Blueprint', icon: '💎', status: 'ready' },
            { name: 'Sales', icon: '💰', status: 'ready' },
            { name: 'Vault', icon: '🔐', status: 'ready' },
            { name: 'Platform', icon: '📱', status: 'setup' },
          ].map((a) => (
            <div key={a.name} className="flex items-center gap-1.5 bg-[#0f0f1a] rounded-lg px-2 py-1.5">
              <span className="text-xs">{a.icon}</span>
              <span className="text-xs text-gray-400 flex-1">{a.name}</span>
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: a.status === 'ready' ? '#22c55e' : '#FFD700' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* AI News Monitor */}
      <div className="bg-[#16162a] border border-[#1e1e38] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-[#FFD700]" />
          <span className="text-xs font-semibold text-[#FFD700] uppercase tracking-wide">AI Watch</span>
          <span className="ml-auto text-xs text-gray-600">Auto-monitors</span>
        </div>
        <div className="space-y-2 text-xs text-gray-400">
          <div>🤖 Anthropic — Claude 4.6 active (latest)</div>
          <div>🎬 Runway ML — Gen-3 Alpha available</div>
          <div>🗣️ ElevenLabs — Voice cloning v2 stable</div>
          <div>👤 HeyGen — Avatar 2.0 (evaluate for content)</div>
          <div>📹 Kling AI — Video gen (free tier available)</div>
        </div>
        <div className="mt-2 pt-2 border-t border-[#1e1e38] text-xs text-gray-600">
          Ask Empire agent to evaluate any new AI tool
        </div>
      </div>

      <div className="text-center text-xs text-gray-700 pb-2">
        Empire Agent v1.0 · Built for Roobmy Joseph
      </div>
    </div>
  )
}
