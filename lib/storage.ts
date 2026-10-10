import { getStoredSession, supabaseRest, signOutSupabase } from './supabase'
import { BRXProject, DailyStats, UserSettings } from './types'

const PROJECTS_KEY = 'booker_projects'
const STATS_KEY = 'booker_stats'
const SETTINGS_KEY = 'booker_settings'
const USER_KEY = 'booker_user'

export function getProjects(): BRXProject[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(PROJECTS_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    let changed = false
    const projects = parsed.filter(Boolean).map((project: BRXProject) => {
      if (!project.id) {
        changed = true
        return { ...project, id: crypto.randomUUID() }
      }
      return project
    })
    if (changed) saveProjects(projects)
    return projects
  } catch {
    return []
  }
}

export function saveProjects(projects: BRXProject[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)) }
  catch (error) { console.error('[BookEr AI] Unable to save projects locally:', error) }
  void syncProjectsToCloud(projects)
}

async function syncProjectsToCloud(projects: BRXProject[]): Promise<void> {
  const session = getStoredSession()
  if (!session || projects.length === 0) return
  try {
    await supabaseRest('booker_projects?on_conflict=user_id,id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(projects.map((project) => ({
        user_id: session.user.id,
        id: project.id,
        project,
        updated_at: project.meta.updatedAt || new Date().toISOString(),
      }))),
    })
  } catch (error) { console.error('[BookEr AI] Cloud project sync failed:', error) }
}

export async function syncProjectsFromCloud(): Promise<BRXProject[]> {
  if (typeof window === 'undefined' || !getStoredSession()) return getProjects()
  try {
    const result = await supabaseRest('booker_projects?select=id,project,updated_at&order=updated_at.desc')
    if (!result) return getProjects()
    const remote = await result.response.json() as Array<{ project: BRXProject; updated_at: string }>
    const merged = new Map<string, BRXProject>()
    for (const project of getProjects()) merged.set(project.id, project)
    for (const row of remote) {
      const project = row?.project
      if (!project?.id) continue
      const local = merged.get(project.id)
      const localTime = local?.meta?.updatedAt ? Date.parse(local.meta.updatedAt) : 0
      const remoteTime = project.meta?.updatedAt ? Date.parse(project.meta.updatedAt) : Date.parse(row.updated_at || '') || 0
      if (!local || remoteTime >= localTime) merged.set(project.id, project)
    }
    const projects = [...merged.values()]
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    await syncProjectsToCloud(projects)
    return projects
  } catch (error) {
    console.error('[BookEr AI] Cloud project load failed:', error)
    return getProjects()
  }
}

export async function persistProjectToCloud(project: BRXProject): Promise<void> {
  await syncProjectsToCloud([project])
}

export function getProject(id: string): BRXProject | null {
  return getProjects().find((project) => project.id === id) || null
}

export function getProjectByIndex(index: number): BRXProject | null {
  return getProjects()[index] || null
}

export function saveProject(id: string, project: BRXProject): void {
  const projects = getProjects()
  const index = projects.findIndex((item) => item.id === id)
  if (index >= 0) {
    projects[index] = {
      ...project,
      id,
      meta: {
        ...project.meta,
        updatedAt: new Date().toISOString()
      }
    }
    saveProjects(projects)
  }
}

export function addProject(project: BRXProject): string {
  const projects = getProjects()
  const normalizedProject = project.id ? project : { ...project, id: crypto.randomUUID() }
  projects.push(normalizedProject)
  saveProjects(projects)
  return normalizedProject.id
}

export function deleteProject(id: string): void {
  const projects = getProjects()
  const nextProjects = projects.filter((project) => project.id !== id)
  if (nextProjects.length !== projects.length) saveProjects(nextProjects)
  void (async () => {
    try { await supabaseRest(`booker_projects?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }) }
    catch (error) { console.error('[BookEr AI] Cloud project deletion failed:', error) }
  })()
}

export function getDailyStats(): DailyStats[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STATS_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDailyStats(stats: DailyStats[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  const session = getStoredSession()
  if (session && stats.length) void supabaseRest('booker_daily_stats?on_conflict=user_id,stat_date', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(stats.map((stat) => ({ user_id: session.user.id, stat_date: stat.date, words_written: Math.max(0, stat.wordsWritten), updated_at: new Date().toISOString() }))),
  }).catch((error) => console.error('[BookEr AI] Cloud stats sync failed:', error))
}

export async function syncDailyStatsFromCloud(): Promise<DailyStats[]> {
  const local = getDailyStats()
  if (!getStoredSession()) return local
  try {
    const result = await supabaseRest('booker_daily_stats?select=stat_date,words_written&order=stat_date.asc')
    if (!result) return local
    const remote = await result.response.json() as Array<{ stat_date: string; words_written: number }>
    const merged = new Map(local.map((stat) => [stat.date, stat.wordsWritten]))
    for (const stat of remote) merged.set(stat.stat_date, Math.max(merged.get(stat.stat_date) || 0, stat.words_written || 0))
    const stats = [...merged.entries()].map(([date, wordsWritten]) => ({ date, wordsWritten })).sort((a, b) => a.date.localeCompare(b.date))
    saveDailyStats(stats)
    return stats
  } catch (error) {
    console.error('[BookEr AI] Cloud stats load failed:', error)
    return local
  }
}

export function addWordsToday(words: number): void {
  const stats = getDailyStats()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayIndex = stats.findIndex(s => s.date === today)
  
  if (todayIndex >= 0) {
    stats[todayIndex].wordsWritten += words
  } else {
    stats.push({ date: today, wordsWritten: words })
  }
  
  saveDailyStats(stats)
}

export function getWritingStreak(): number {
  const stats = getDailyStats()
  if (stats.length === 0) return 0
  
  const sorted = [...stats].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < sorted.length; i++) {
    const statDate = new Date(sorted[i].date)
    statDate.setHours(0, 0, 0, 0)
    
    const expectedDate = new Date(today)
    expectedDate.setDate(expectedDate.getDate() - i)
    
    if (statDate.getTime() === expectedDate.getTime()) {
      if (sorted[i].wordsWritten > 0) {
        streak++
      } else {
        break
      }
    } else if (statDate.getTime() < expectedDate.getTime()) {
      break
    }
  }
  
  return streak
}

export function getTotalWords(): number {
  const projects = getProjects()
  return projects.reduce((total, project) => total + project.meta.wordCount, 0)
}

export function getDefaultSettings(): UserSettings {
  return {
    profile: {
      name: 'Author',
      email: '',
      avatar: '✍️'
    },
    writing: {
      defaultFont: 'Lora',
      defaultFontSize: 18,
      lineHeight: 1.8,
      theme: 'light'
    },
    ai: {
      responseLength: 'medium',
      writingStyle: 'literary'
    },
    export: {
      defaultFormat: 'brx',
      includeAIHistory: true
    }
  }
}

export function getSettings(): UserSettings {
  if (typeof window === 'undefined') return getDefaultSettings()
  const stored = localStorage.getItem(SETTINGS_KEY)
  return stored ? { ...getDefaultSettings(), ...JSON.parse(stored) } : getDefaultSettings()
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  const session = getStoredSession()
  if (session) void supabaseRest('booker_settings?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: session.user.id, settings, updated_at: new Date().toISOString() }),
  }).catch((error) => console.error('[BookEr AI] Cloud settings sync failed:', error))
}

export async function syncSettingsFromCloud(): Promise<UserSettings> {
  const local = getSettings()
  if (!getStoredSession()) return local
  try {
    const result = await supabaseRest('booker_settings?select=settings&limit=1')
    if (!result) return local
    const rows = await result.response.json() as Array<{ settings: UserSettings }>
    if (!rows[0]?.settings) return local
    const remote = rows[0].settings
    const merged = {
      ...local, ...remote,
      profile: { ...local.profile, ...remote.profile },
      writing: { ...local.writing, ...remote.writing },
      ai: { ...local.ai, ...remote.ai },
      export: { ...local.export, ...remote.export },
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
    return merged
  } catch (error) {
    console.error('[BookEr AI] Cloud settings load failed:', error)
    return local
  }
}

export function getUser(): { name: string; email: string; isLoggedIn: boolean; id?: string } | null {
  if (typeof window === 'undefined') return null
  const session = getStoredSession()
  if (!session) return null
  try {
    const stored = localStorage.getItem(USER_KEY)
    const cached = stored ? JSON.parse(stored) : {}
    return { name: cached.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Author',
      email: cached.email || session.user.email || session.user.phone || '', isLoggedIn: true, id: session.user.id }
  } catch { return { name: session.user.email?.split('@')[0] || 'Author', email: session.user.email || '', isLoggedIn: true, id: session.user.id } }
}

export function saveUser(user: { name: string; email: string; isLoggedIn: boolean }): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return
  void signOutSupabase()
}

export function exportToBRX(project: BRXProject): string {
  return JSON.stringify(project, null, 2)
}

export function exportToTXT(project: BRXProject): string {
  let text = `${project.meta.title}\n`
  text += `${'='.repeat(project.meta.title.length)}\n\n`
  text += `Type: ${project.meta.projectType}\n`
  text += `Genre: ${project.meta.genre}\n`
  if (project.meta.synopsis) {
    text += `\nSynopsis:\n${project.meta.synopsis}\n`
  }
  text += '\n---\n\n'
  
  for (const chapter of project.chapters) {
    text += `${chapter.title}\n`
    text += `${'-'.repeat(chapter.title.length)}\n\n`
    text += chapter.body.replace(/<[^>]*>/g, '') + '\n\n'
  }
  
  return text
}

export function importBRX(content: string): BRXProject | null {
  try {
    const project = JSON.parse(content) as BRXProject
    if (project.version && project.app === 'BookEr AI' && project.meta && project.chapters) {
      return project
    }
    return null
  } catch {
    return null
  }
}
