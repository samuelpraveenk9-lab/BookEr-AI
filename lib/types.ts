export type ProjectType = 
  | 'Novel' 
  | 'Light Novel' 
  | 'Manga Script' 
  | 'Storybook' 
  | 'Short Story' 
  | 'Poetry Collection'

export type Genre = 
  | 'Fantasy' 
  | 'Sci-Fi' 
  | 'Romance' 
  | 'Horror' 
  | 'Mystery' 
  | 'Adventure' 
  | 'Thriller' 
  | 'Drama' 
  | 'Comedy' 
  | 'Historical' 
  | 'Isekai' 
  | 'Slice of Life'

export type ChapterStatus = 'Draft' | 'Revised' | 'Final'

export type CharacterRole = 
  | 'Protagonist' 
  | 'Antagonist' 
  | 'Supporting' 
  | 'Love Interest' 
  | 'Mentor' 
  | 'Sidekick' 
  | 'Minor'

export interface Chapter {
  id: string
  title: string
  body: string
  wordCount: number
  status: ChapterStatus
  createdAt: string
  updatedAt: string
}

export interface Character {
  id: string
  name: string
  role: CharacterRole
  avatar: string
  age: string
  appearance: string
  personality: string
  backstory: string
  goals: string
  flaws: string
}

export interface WorldNotes {
  locations: string
  factions: string
  magicSystem: string
  timeline: string
  languages: string
  rules: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ProjectMeta {
  title: string
  projectType: ProjectType
  genre: Genre
  series: string | null
  synopsis: string
  coverEmoji: string
  wordCount: number
  charCount: number
  createdAt: string
  updatedAt: string
  dailyGoal: number
}

export interface BRXProject {
  id: string
  version: string
  app: string
  meta: ProjectMeta
  chapters: Chapter[]
  characters: Character[]
  worldNotes: WorldNotes
  aiHistory: AIMessage[]
}

export interface DailyStats {
  date: string
  wordsWritten: number
}

export interface UserSettings {
  profile: {
    name: string
    email: string
    avatar: string
  }
  writing: {
    defaultFont: string
    defaultFontSize: number
    lineHeight: number
    theme: 'light' | 'dark' | 'sepia'
  }
  ai: {
    responseLength: 'short' | 'medium' | 'long'
    writingStyle: 'literary' | 'casual' | 'genre-specific'
  }
  export: {
    defaultFormat: 'brx' | 'txt' | 'pdf'
    includeAIHistory: boolean
  }
}

export const PROJECT_TYPES: ProjectType[] = [
  'Novel',
  'Light Novel',
  'Manga Script',
  'Storybook',
  'Short Story',
  'Poetry Collection'
]

export const GENRES: Genre[] = [
  'Fantasy',
  'Sci-Fi',
  'Romance',
  'Horror',
  'Mystery',
  'Adventure',
  'Thriller',
  'Drama',
  'Comedy',
  'Historical',
  'Isekai',
  'Slice of Life'
]

export const CHARACTER_ROLES: CharacterRole[] = [
  'Protagonist',
  'Antagonist',
  'Supporting',
  'Love Interest',
  'Mentor',
  'Sidekick',
  'Minor'
]

export const COVER_EMOJIS = [
  '📚', '📖', '📕', '📗', '📘', '📙', '🖋️', '✍️', '📝', '🎭',
  '🌟', '⭐', '✨', '🔮', '🗡️', '⚔️', '🛡️', '👑', '🏰', '🐉',
  '🧙', '🧚', '🧛', '🧜', '🦊', '🐺', '🦁', '🦄', '💀', '👻',
  '💕', '❤️', '💔', '💜', '🌹', '🌸', '🌺', '🌻', '🌙', '☀️',
  '🚀', '🌌', '👽', '🤖', '💻', '🔬', '⚗️', '🎪', '🎨', '🎬'
]

export const DAILY_GOALS = [200, 500, 1000, 2000]

export const TARGET_WORD_COUNTS: Record<ProjectType, number> = {
  'Novel': 80000,
  'Light Novel': 50000,
  'Manga Script': 10000,
  'Storybook': 5000,
  'Short Story': 7500,
  'Poetry Collection': 3000
}

export function createEmptyProject(
  title: string,
  projectType: ProjectType,
  genre: Genre,
  coverEmoji: string,
  synopsis: string = '',
  series: string | null = null,
  dailyGoal: number = 500
): BRXProject {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    version: '1.0',
    app: 'BookEr AI',
    meta: {
      title,
      projectType,
      genre,
      series,
      synopsis,
      coverEmoji,
      wordCount: 0,
      charCount: 0,
      createdAt: now,
      updatedAt: now,
      dailyGoal
    },
    chapters: [
      {
        id: crypto.randomUUID(),
        title: 'Chapter 1',
        body: '',
        wordCount: 0,
        status: 'Draft',
        createdAt: now,
        updatedAt: now
      }
    ],
    characters: [],
    worldNotes: {
      locations: '',
      factions: '',
      magicSystem: '',
      timeline: '',
      languages: '',
      rules: ''
    },
    aiHistory: []
  }
}

export function countWords(text: string): number {
  const stripped = text.replace(/<[^>]*>/g, ' ')
  const words = stripped.trim().split(/\s+/).filter(Boolean)
  return words.length
}

export function countChars(text: string): number {
  return text.replace(/<[^>]*>/g, '').length
}

export function estimateReadTime(wordCount: number): number {
  return Math.ceil(wordCount / 200)
}
