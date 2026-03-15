/**
 * Demo mode responses when no AI API key is configured.
 * These give the app a polished experience during setup.
 */

export const DEMO_RESPONSES: Record<string, string[]> = {
  empire: [
    `**Welcome to Empire Agent, Roobmy.** 👑

I'm your AI Chief of Staff. Here's your empire status:

**What's working for you right now:**
- Your Grind University YouTube content machine is your #1 asset
- Empire Blueprint has massive resonance with young Black/Brown entrepreneurs
- FlipzyX is positioned perfectly for AI automation demand spike

**Your Q2 priority (to hit $15K):**
1. Lock in 3 FlipzyX clients at $5K/month retainer
2. Post 21 pieces of Empire Blueprint content in 21 days
3. Repurpose every YouTube video into 5 short-form clips

**Today's move:** Record a 60-second "I went from broke to $15K/month" hook. Post it on all platforms by 6pm.

To unlock full AI responses, add your free Groq API key in Vercel settings. Takes 2 minutes. Go to console.groq.com → Create API key → it's completely free.`,

    `**Empire Blueprint content calendar — this week:**

📅 Monday: "5 investments that changed my life at 20" (YouTube Short + TikTok)
📅 Tuesday: LinkedIn post: "What my college doesn't teach about money"
📅 Wednesday: Instagram carousel: The 6 wealth levels explained
📅 Thursday: TikTok: "Why your 9-5 is making you broke"
📅 Friday: YouTube: Full video "How I'd invest $1K at 20 in 2026"

**Your Hormozi angle for this week:** Price your value based on outcome, not time. A $5K FlipzyX package gets clients 10x ROI. That's actually cheap.`,
  ],
  researcher: [
    `**Competitor Intel Report — Groq AI key needed for live data**

**What Hormozi is doing:**
- Going hard on the "acquisition.com" education play
- Using YouTube as top-of-funnel, community as the product
- $100M+ Offers framework still his #1 content pillar

**What Gary Vee is doing:**
- VeeFriends NFT play pivoting to real-world events
- Still crushing LinkedIn B2B content
- AI tools for content repurposing is his new obsession

**Gap Roobmy can exploit:**
- Nobody owns "AI automation for young Black/Brown entrepreneurs"
- That niche is wide open. You + Empire Blueprint + FlipzyX = the only one doing all 3.
- Double down on this positioning NOW before someone else takes it.`,
  ],
  blueprint: [
    `**Empire Blueprint Content — Financial Literacy Drop**

Here's a banger that'll hit different for your audience:

**"The 4 Numbers That Control Your Financial Life"**

Hook: "Nobody taught us this. Here's what changes everything."

1. **Net Worth** — What you OWN minus what you OWE (most people never calculate this)
2. **Burn Rate** — What it costs you to exist per month (know your number)
3. **Runway** — How many months you survive if income stops tomorrow
4. **Wealth Ratio** — Passive income ÷ Monthly expenses (goal: > 1.0)

CTA: "Drop your wealth ratio in the comments. Let's build together."

This goes viral because it's specific, it's a framework, and it makes people DO something right now.`,
  ],
  sales: [
    `**FlipzyX Client Acquisition Strategy**

**Your ICP (Ideal Client Profile):**
- Business owner doing $10K-$100K/month
- Spending 20+ hours/week on manual tasks
- Has tried VA's but they "just don't get it"
- Budget: $2K-$10K/month for the right solution

**Your 3-step outreach sequence:**

1. **LinkedIn DM Day 1:** "Saw you're scaling [Company]. We automated 40hrs/week for [Similar Company] last month. Worth a 15-min call?"

2. **Follow-up Day 4:** Share a specific result (screenshot/case study)

3. **Final Day 7:** "Last follow-up — happy to share the exact system we built free if a call doesn't make sense."

**This week's target:** Message 10 businesses in Queens/NYC area. Local + AI = rare combo that closes fast.`,
  ],
  vault: [
    `**Vault Agent — Credential Manager**

This agent manages your platform credentials and API connections.

**Status:** Demo mode active (connect Groq API key to unlock AI assistance)

**Tracked Platforms:**
- YouTube API — Not connected
- TikTok API — Not connected
- Instagram API — Not connected
- LinkedIn API — Connected (OAuth server running on port 3002)
- Twitter/X API — Not connected

**Security reminder:** Never paste raw API keys in chat. Use Vercel Environment Variables for all secrets.

To set up platform integrations, tell me which platform you want to connect and I'll walk you through the OAuth flow.`,
  ],
}

export function getDemoResponse(agentId: string): string {
  const responses = DEMO_RESPONSES[agentId] ?? DEMO_RESPONSES['empire']
  return responses[Math.floor(Math.random() * responses.length)]
}

export function* streamDemoResponse(text: string): Generator<string> {
  const words = text.split(' ')
  for (const word of words) {
    yield word + ' '
  }
}
