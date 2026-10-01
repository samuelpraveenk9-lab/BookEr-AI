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
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
  } catch (error) {
    console.error('[v0] Unable to save projects:', error)
  }
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
}

export function getUser(): { name: string; email: string; isLoggedIn: boolean } | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(USER_KEY)
  return stored ? JSON.parse(stored) : null
}

export function saveUser(user: { name: string; email: string; isLoggedIn: boolean }): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
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
