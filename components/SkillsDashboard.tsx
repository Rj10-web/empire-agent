'use client'

import { useState, useMemo } from 'react'
import { SKILLS_REGISTRY, SKILL_CATEGORIES, searchSkills, type Skill, type SkillCategory } from '@/lib/skills-registry'
import { Search, Zap, X } from 'lucide-react'

interface SkillsDashboardProps {
  onUseSkill?: (skillId: string, skillName: string) => void
}

const CATEGORY_ORDER: SkillCategory[] = ['empire', 'content', 'marketing', 'business', 'ai', 'video', 'engineering', 'productivity', 'product', 'tools']

export default function SkillsDashboard({ onUseSkill }: SkillsDashboardProps) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all')
  const [selected, setSelected] = useState<Skill | null>(null)
  const [disabledSkills, setDisabledSkills] = useState<Set<string>>(new Set())
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])

  const filtered = useMemo(() => {
    let results = query ? searchSkills(query) : SKILLS_REGISTRY
    if (activeCategory !== 'all') {
      results = results.filter(s => s.category === activeCategory)
    }
    return results
  }, [query, activeCategory])

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<SkillCategory | 'all', number>> = { all: SKILLS_REGISTRY.length }
    for (const s of SKILLS_REGISTRY) {
      counts[s.category] = (counts[s.category] ?? 0) + 1
    }
    return counts
  }, [])

  const toggleSkill = (id: string) => {
    setDisabledSkills(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const useSkill = (skill: Skill) => {
    setRecentlyUsed(prev => [skill.id, ...prev.filter(id => id !== skill.id)].slice(0, 10))
    setSelected(null)
    onUseSkill?.(skill.id, skill.name)
  }

  return (
    <div className="h-full flex flex-col bg-[#080810] text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#0f0f1a] border-b border-[#1e1e38]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-[#00AEEF] text-sm">Skills Registry</h2>
            <p className="text-xs text-gray-500">{SKILLS_REGISTRY.length} skills installed • Type &quot;use [skill]&quot; in any chat</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 font-mono">SYNCED</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search 411 skills..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#16162a] border border-[#1e1e38] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00AEEF] transition-colors"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              activeCategory === 'all' ? 'bg-[#00AEEF] text-black' : 'bg-[#16162a] text-gray-500 hover:text-white'
            }`}
          >
            All ({categoryCounts.all})
          </button>
          {CATEGORY_ORDER.map(cat => {
            const info = SKILL_CATEGORIES[cat]
            const count = categoryCounts[cat] ?? 0
            if (!count) return null
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === cat ? 'bg-[#1e1e38] text-white border border-[#00AEEF]' : 'bg-[#16162a] text-gray-500 hover:text-white'
                }`}
              >
                <span>{info.icon}</span>
                <span className="hidden sm:block">{info.label}</span>
                <span className="text-gray-600">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recently Used */}
      {recentlyUsed.length > 0 && !query && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-[#1e1e38]">
          <p className="text-xs text-gray-600 mb-1.5">Recently used</p>
          <div className="flex gap-1.5 flex-wrap">
            {recentlyUsed.map(id => {
              const skill = SKILLS_REGISTRY.find(s => s.id === id)
              if (!skill) return null
              return (
                <button
                  key={id}
                  onClick={() => useSkill(skill)}
                  className="px-2 py-1 rounded-lg bg-[#00AEEF1a] border border-[#00AEEF33] text-xs text-[#00AEEF] hover:bg-[#00AEEF33] transition-all"
                >
                  {skill.id}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Skills Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
            <Search size={24} className="mb-2" />
            <p className="text-sm">No skills match &quot;{query}&quot;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {filtered.map(skill => {
              const catInfo = SKILL_CATEGORIES[skill.category]
              const isDisabled = disabledSkills.has(skill.id)
              const isSelected = selected?.id === skill.id
              return (
                <div
                  key={skill.id}
                  onClick={() => setSelected(isSelected ? null : skill)}
                  className={`relative rounded-xl p-3 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[#1e1e38] border-[#00AEEF] shadow-[0_0_12px_rgba(0,174,239,0.15)]'
                      : isDisabled
                      ? 'bg-[#0d0d1a] border-[#1e1e38] opacity-40'
                      : 'bg-[#16162a] border-[#1e1e38] hover:border-[#2e2e58] hover:bg-[#1a1a30]'
                  }`}
                >
                  {/* Skill header */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base flex-shrink-0">{catInfo.icon}</span>
                      <span className="text-xs font-mono text-white truncate">{skill.id}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Status dot */}
                      <div className={`w-1.5 h-1.5 rounded-full ${isDisabled ? 'bg-gray-600' : 'bg-green-400'}`} />
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {skill.description}
                  </p>

                  {/* Category badge */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`text-xs ${catInfo.color} font-semibold`}>{catInfo.label}</span>
                  </div>

                  {/* Expanded actions */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-[#2e2e58] flex gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); useSkill(skill) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00AEEF] text-black hover:bg-[#00c5f5] transition-all"
                      >
                        <Zap size={11} />
                        Use in Chat
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); toggleSkill(skill.id) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e1e38] text-gray-400 hover:text-white transition-all"
                      >
                        {isDisabled ? 'Enable' : 'Disable'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Stats footer */}
        <div className="mt-4 pt-4 border-t border-[#1e1e38] flex flex-wrap gap-4 text-xs text-gray-600">
          <span>📦 {SKILLS_REGISTRY.length} total skills</span>
          <span>✅ {SKILLS_REGISTRY.length - disabledSkills.size} active</span>
          <span>⚡ {recentlyUsed.length} recently used</span>
          <span className="ml-auto">Auto-sync via Claude Code</span>
        </div>
      </div>
    </div>
  )
}
