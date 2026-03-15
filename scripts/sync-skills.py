"""
Empire Agent Skills Sync Script
================================
Watches ~/.claude/skills/ for changes and auto-syncs to Empire Agent app.

Usage:
  python scripts/sync-skills.py           # Run once (manual sync)
  python scripts/sync-skills.py --watch   # Watch mode (continuous)
  python scripts/sync-skills.py --deploy  # Sync + commit + push to GitHub (Vercel auto-deploys)

This script:
1. Reads all skills from ~/.claude/skills/
2. Regenerates lib/skills-registry.ts
3. Commits the change to git
4. Pushes to GitHub (Vercel detects push and auto-deploys)
"""

import os
import sys
import json
import time
import subprocess
import datetime
from pathlib import Path

# Paths
SKILLS_DIR = Path.home() / '.claude' / 'skills'
APP_DIR = Path(__file__).parent.parent
REGISTRY_FILE = APP_DIR / 'lib' / 'skills-registry.ts'

# Skill categories
CATEGORIES = {
    'empire': ['empire-content', 'linkedin-post', 'gamma-post', 'video-clip', 'competitive-ads-extractor', 'lead-research-assistant', 'brand-guidelines', 'social-media-manager'],
    'content': ['content-creator', 'content-engine', 'content-production', 'content-strategy', 'content-research-writer', 'content-humanizer', 'viral-content', 'social-content', 'social-media-manager', 'social-media-analyzer', 'article-writing', 'copywriting', 'copy-editing', 'linkedin-post', 'twitter-reader', 'x-twitter-growth', 'twitter-algorithm-optimizer', 'empire-content', 'gamma-post', 'video-scripting', 'transcript-fixer'],
    'marketing': ['competitive-ads-extractor', 'competitive-intel', 'competitive-matrix', 'competitive-teardown', 'competitor-alternatives', 'competitors-analysis', 'marketing-skill', 'marketing-strategy-pmm', 'marketing-ops', 'marketing-ideas', 'marketing-psychology', 'marketing-demand-acquisition', 'marketing-context', 'marketing-bundle', 'campaign-analytics', 'paid-ads', 'ad-creative', 'cold-email', 'email-sequence', 'email-template-builder', 'lead-research-assistant', 'client-acquisition', 'seo-audit', 'ai-seo', 'programmatic-seo', 'landing-page-generator', 'app-store-optimization', 'ab-test-setup', 'cro-advisor', 'form-cro', 'page-cro', 'onboarding-cro', 'popup-cro', 'signup-flow-cro', 'paywall-upgrade-cro'],
    'business': ['business-growth', 'revenue-modeling', 'revenue-operations', 'saas-health', 'saas-metrics-coach', 'financial-analyst', 'financial-health', 'financial-data-collector', 'pricing-strategy', 'proposal-generator', 'contract-and-proposal-writer', 'investor-materials', 'investor-outreach', 'ma-playbook', 'launch-strategy', 'free-tool-strategy', 'client-acquisition', 'sales-engineer', 'churn-prevention', 'customer-success-manager', 'referral-program'],
    'engineering': ['senior-fullstack', 'senior-backend', 'senior-frontend', 'senior-devops', 'senior-architect', 'backend-patterns', 'frontend-patterns', 'frontend-design', 'api-design', 'database-designer', 'docker-patterns', 'deployment-patterns', 'ci-cd-pipeline-builder', 'coding-standards', 'code-review', 'code-reviewer', 'performance-profiler', 'security-review', 'security-scan', 'tdd', 'tdd-guide', 'coverage', 'e2e-testing', 'webapp-testing'],
    'ai': ['artifacts-builder', 'agentic-engineering', 'ai-first-engineering', 'agent-designer', 'agent-workflow-designer', 'autonomous-loops', 'autoresearch-agent', 'rag-architect', 'eval-harness', 'mcp-builder', 'mcp-server-builder', 'prompt-engineering', 'prompt-optimizer', 'prompt-engineer-toolkit', 'context7', 'context-engine', 'deep-research', 'self-improving-agent', 'news-intelligence'],
    'video': ['video-clip', 'video-scripting', 'video-comparer', 'video-downloader', 'videodb', 'youtube-downloader'],
    'productivity': ['file-organizer', 'meeting-minutes-taker', 'meeting-insights-analyzer', 'invoice-organizer', 'goal-tracking', 'okr', 'project-management', 'sprint-plan', 'sprint-health', 'retro', 'decision-frameworks', 'decision-logger', 'postmortem'],
    'product': ['prd', 'product-manager-toolkit', 'product-strategist', 'product-analysis', 'product-analytics', 'product-discovery', 'user-story', 'epic-design', 'roadmap-communicator', 'agile-product-owner', 'scrum-master'],
}

def get_category(skill_id):
    for cat, skills in CATEGORIES.items():
        if skill_id in skills:
            return cat
    return 'tools'

def read_skill_content(skill_path):
    try:
        content = skill_path.read_text(encoding='utf-8', errors='ignore')
        # Follow text symlinks
        stripped = content.strip()
        if stripped.startswith('../') or stripped.startswith('../../'):
            target = (skill_path.parent / stripped).resolve()
            if target.exists():
                content = target.read_text(encoding='utf-8', errors='ignore')
        return content
    except Exception:
        return ''

def extract_skill_meta(skill_name):
    skill_path = SKILLS_DIR / skill_name / 'SKILL.md'
    if not skill_path.exists():
        return None

    content = read_skill_content(skill_path)
    name = skill_name
    desc = ''

    if content.startswith('---'):
        end = content.find('---', 3)
        if end > 0:
            frontmatter = content[3:end]
            for line in frontmatter.split('\n'):
                if line.startswith('name:'):
                    name = line[5:].strip().strip('"\'')
                elif line.startswith('description:'):
                    desc = line[12:].strip().strip('"\'')

    if not desc or desc.startswith('../') or desc.startswith('>-'):
        for line in content.split('\n'):
            line = line.strip()
            if line and not line.startswith('#') and not line.startswith('---') and not line.startswith('>') and not line.startswith('..') and len(line) > 20:
                desc = line[:200]
                break

    if not desc or desc.startswith('../'):
        desc = f'AI skill for {skill_name.replace("-", " ")}'

    return {
        'id': skill_name,
        'name': name or skill_name,
        'description': desc[:200].replace("'", "\\'").replace('\n', ' '),
        'category': get_category(skill_name),
    }

def generate_registry(skills):
    now = datetime.datetime.now().isoformat()
    lines = [
        f'// AUTO-GENERATED: Skills registry from ~/.claude/skills/',
        f'// Last synced: {now}',
        f'// Total skills: {len(skills)}',
        '',
        'export interface Skill {',
        '  id: string',
        '  name: string',
        '  description: string',
        '  category: SkillCategory',
        '  active: boolean',
        '  lastUsed?: string',
        '}',
        '',
        "export type SkillCategory = 'empire' | 'content' | 'marketing' | 'business' | 'engineering' | 'ai' | 'video' | 'productivity' | 'product' | 'tools'",
        '',
        'export const SKILLS_REGISTRY: Skill[] = [',
    ]

    for s in skills:
        lines.append(
            f'  {{ id: {json.dumps(s["id"])}, name: {json.dumps(s["name"])}, '
            f'description: {json.dumps(s["description"])}, '
            f'category: {json.dumps(s["category"])}, active: true }},'
        )

    lines += [
        ']',
        '',
        'export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; icon: string; color: string }> = {',
        "  empire: { label: 'Empire', icon: '\\u{1F451}', color: 'text-yellow-400' },",
        "  content: { label: 'Content', icon: '\\u270D\\uFE0F', color: 'text-cyan-400' },",
        "  marketing: { label: 'Marketing', icon: '\\uD83D\\uDCE2', color: 'text-purple-400' },",
        "  business: { label: 'Business', icon: '\\uD83D\\uDCBC', color: 'text-green-400' },",
        "  engineering: { label: 'Engineering', icon: '\\u2699\\uFE0F', color: 'text-blue-400' },",
        "  ai: { label: 'AI & Agents', icon: '\\uD83E\\uDD16', color: 'text-pink-400' },",
        "  video: { label: 'Video', icon: '\\uD83C\\uDFAC', color: 'text-red-400' },",
        "  productivity: { label: 'Productivity', icon: '\\u26A1', color: 'text-orange-400' },",
        "  product: { label: 'Product', icon: '\\uD83D\\uDCE6', color: 'text-indigo-400' },",
        "  tools: { label: 'Tools', icon: '\\uD83D\\uDD27', color: 'text-gray-400' },",
        '}',
        '',
        'export function findSkill(query: string): Skill | undefined {',
        '  const q = query.toLowerCase().replace(/[^a-z0-9-]/g, \' \').trim()',
        '  return SKILLS_REGISTRY.find(s => s.id === q || s.name.toLowerCase() === q || s.id.includes(q) || q.includes(s.id))',
        '}',
        '',
        'export function searchSkills(query: string): Skill[] {',
        '  if (!query) return SKILLS_REGISTRY',
        '  const q = query.toLowerCase()',
        '  return SKILLS_REGISTRY.filter(s =>',
        '    s.id.includes(q) || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.includes(q)',
        '  )',
        '}',
    ]

    return '\n'.join(lines)

def sync_skills(deploy=False):
    if not SKILLS_DIR.exists():
        print(f'[ERROR] Skills directory not found: {SKILLS_DIR}')
        return False

    skill_names = sorted([d.name for d in SKILLS_DIR.iterdir() if d.is_dir()])
    print(f'[SYNC] Found {len(skill_names)} skills in {SKILLS_DIR}')

    skills = []
    for skill_name in skill_names:
        meta = extract_skill_meta(skill_name)
        if meta:
            skills.append(meta)

    print(f'[SYNC] Extracted metadata for {len(skills)} skills')

    # Generate and write registry
    registry_content = generate_registry(skills)
    REGISTRY_FILE.write_text(registry_content, encoding='utf-8')
    print(f'[SYNC] Written {len(registry_content)} bytes to {REGISTRY_FILE}')

    if deploy:
        # Git commit and push
        try:
            os.chdir(APP_DIR)
            subprocess.run(['git', 'add', 'lib/skills-registry.ts'], check=True)

            # Check if there are changes to commit
            result = subprocess.run(['git', 'diff', '--cached', '--quiet'], capture_output=True)
            if result.returncode == 0:
                print('[DEPLOY] No changes to commit (registry unchanged)')
                return True

            timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
            msg = f'auto: sync skills registry ({len(skills)} skills) [{timestamp}]'
            subprocess.run(['git', 'commit', '-m', msg], check=True)
            subprocess.run(['git', 'push', 'https://github.com/Rj10-web/empire-agent.git', 'main'], check=True)
            print(f'[DEPLOY] Pushed to GitHub. Vercel will auto-deploy.')
        except subprocess.CalledProcessError as e:
            print(f'[DEPLOY ERROR] {e}')
            return False

    return True

def watch_mode():
    print(f'[WATCH] Monitoring {SKILLS_DIR} for changes...')
    print('[WATCH] Press Ctrl+C to stop')

    last_skills = set()

    while True:
        try:
            if SKILLS_DIR.exists():
                current_skills = set(d.name for d in SKILLS_DIR.iterdir() if d.is_dir())
                new_skills = current_skills - last_skills
                removed_skills = last_skills - current_skills

                if new_skills:
                    print(f'[WATCH] New skills detected: {new_skills}')
                    sync_skills(deploy=True)
                elif removed_skills:
                    print(f'[WATCH] Skills removed: {removed_skills}')
                    sync_skills(deploy=True)

                last_skills = current_skills

            time.sleep(30)  # Check every 30 seconds
        except KeyboardInterrupt:
            print('\n[WATCH] Stopped.')
            break

if __name__ == '__main__':
    args = sys.argv[1:]

    if '--watch' in args:
        # Initial sync then watch
        sync_skills(deploy='--deploy' in args)
        watch_mode()
    elif '--deploy' in args:
        sync_skills(deploy=True)
    else:
        sync_skills(deploy=False)
        print('\n[INFO] To auto-deploy: python scripts/sync-skills.py --deploy')
        print('[INFO] To watch mode: python scripts/sync-skills.py --watch --deploy')
