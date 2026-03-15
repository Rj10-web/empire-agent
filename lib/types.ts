export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  agentId: string
}

export interface PlatformStat {
  platform: string
  icon: string
  handle: string
  followers: number | null
  growth: number | null
  lastPost: string
  connected: boolean
  color: string
}

export interface ScheduledPost {
  id: string
  platform: string
  time: string
  title: string
  status: 'scheduled' | 'posted' | 'draft'
  type: string
}

export interface CompetitorPost {
  creator: string
  platform: string
  title: string
  views: string
  engagement: string
  ago: string
  insight: string
}

export interface AgentAction {
  id: string
  agent: string
  action: string
  timestamp: Date
  status: 'success' | 'running' | 'pending'
}
