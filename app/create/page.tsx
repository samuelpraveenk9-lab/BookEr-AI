'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check,
  Sparkles,
  BookOpen
} from 'lucide-react'
import { 
  PROJECT_TYPES, 
  GENRES, 
  COVER_EMOJIS, 
  DAILY_GOALS,
  createEmptyProject,
  ProjectType,
  Genre
} from '@/lib/types'
import { addProject } from '@/lib/storage'

export default function CreateProjectPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('Novel')
  const [genre, setGenre] = useState<Genre>('Fantasy')
  const [coverEmoji, setCoverEmoji] = useState('📚')
  const [series, setSeries] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [dailyGoal, setDailyGoal] = useState(500)
  const [customGoal, setCustomGoal] = useState('')

  const canProceedStep1 = title.trim().length > 0
  const canProceedStep2 = true // Synopsis is optional

  const handleGenerateSynopsis = async () => {
    if (!title) return
    
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_synopsis',
          title,
          projectType,
          genre
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSynopsis(data.synopsis || data.content || '')
      }
    } catch (error) {
      console.log('[v0] Error generating synopsis:', error)
      // Fallback synopsis
      setSynopsis(`A compelling ${genre.toLowerCase()} ${projectType.toLowerCase()} that follows an unforgettable journey. ${title} weaves together themes of courage, discovery, and transformation in a story that will captivate readers from the very first page.`)
    }
    
    setIsGenerating(false)
  }

  const handleCreate = () => {
    const finalGoal = customGoal ? parseInt(customGoal) : dailyGoal
    
    const project = createEmptyProject(
      title,
      projectType,
      genre,
      coverEmoji,
      synopsis,
      series || null,
      finalGoal
    )
    
    const projectId = addProject(project)
    router.push(`/editor/${projectId.replace('project-', '')}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-bold text-foreground">BookEr AI</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`
                h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium
                ${step === s 
                  ? 'bg-primary text-primary-foreground' 
                  : step > s 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }
              `}>
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Create Your Book</CardTitle>
              <CardDescription>{"Let's start with the basics of your new project."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Book Title</Label>
                <Input
                  id="title"
                  placeholder="Enter your book title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Book Type</Label>
                <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Genre</Label>
                <Select value={genre} onValueChange={(v) => setGenre(v as Genre)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cover Emoji</Label>
                <div className="grid grid-cols-10 gap-2 p-4 bg-muted rounded-lg max-h-48 overflow-y-auto">
                  {COVER_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`
                        text-2xl p-2 rounded-lg transition-colors
                        ${coverEmoji === emoji 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-secondary'
                        }
                      `}
                      onClick={() => setCoverEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="series">Series Name (Optional)</Label>
                <Input
                  id="series"
                  placeholder="Enter series name if part of a series"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!canProceedStep1}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Synopsis & Goals */}
        {step === 2 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Synopsis & Goals</CardTitle>
              <CardDescription>Write or generate a synopsis and set your writing goals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="synopsis">Synopsis</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={handleGenerateSynopsis}
                    disabled={isGenerating || !title}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGenerating ? 'Generating...' : 'AI Generate'}
                  </Button>
                </div>
                <Textarea
                  id="synopsis"
                  placeholder="Write a compelling back-cover blurb for your book..."
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Daily Writing Goal</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {DAILY_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      className={`
                        px-4 py-3 rounded-lg text-sm font-medium transition-colors
                        ${dailyGoal === goal && !customGoal
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground hover:bg-secondary'
                        }
                      `}
                      onClick={() => {
                        setDailyGoal(goal)
                        setCustomGoal('')
                      }}
                    >
                      {goal.toLocaleString()} words
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <Input
                    placeholder="Or enter custom goal..."
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    type="number"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!canProceedStep2}
                  className="gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Confirm Your Project</CardTitle>
              <CardDescription>Review your project details before creating.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="text-5xl">{coverEmoji}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{title}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge>{projectType}</Badge>
                    <Badge variant="secondary">{genre}</Badge>
                  </div>
                  {series && (
                    <p className="text-sm text-muted-foreground mt-2">Series: {series}</p>
                  )}
                </div>
              </div>

              {synopsis && (
                <div className="space-y-2">
                  <Label>Synopsis</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                    {synopsis}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Daily Goal</Label>
                <p className="text-foreground font-medium">
                  {(customGoal || dailyGoal).toLocaleString()} words per day
                </p>
              </div>

              <div className="p-4 bg-secondary/50 rounded-lg">
                <p className="text-sm text-secondary-foreground">
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  AI tools will be customized for writing {projectType.toLowerCase()} in the {genre.toLowerCase()} genre.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleCreate} className="gap-2">
                  <Check className="h-4 w-4" />
                  Create Project
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
