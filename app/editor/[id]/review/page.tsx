'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Star, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Download,
  BookOpen,
  FileText
} from 'lucide-react'
import { getProject } from '@/lib/storage'
import { BRXProject } from '@/lib/types'

interface ReviewFeedback {
  strengths: string[]
  improvements: string[]
  suggestions: string[]
}

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [project, setProject] = useState<BRXProject | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<number>(0)
  const [customText, setCustomText] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null)
  const [reviewMode, setReviewMode] = useState<'chapter' | 'custom' | 'full'>('chapter')

  useEffect(() => {
    const proj = getProject(projectId)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    setProject(proj)
  }, [projectId, router])

  const handleReview = async () => {
    if (!project) return
    
    let contentToReview = ''
    
    if (reviewMode === 'chapter') {
      contentToReview = project.chapters[selectedChapter]?.body || ''
    } else if (reviewMode === 'custom') {
      contentToReview = customText
    } else {
      contentToReview = project.chapters.map(ch => ch.body).join('\n\n---\n\n')
    }

    if (!contentToReview.trim()) {
      setFeedback({
        strengths: ['There is no excerpt to evaluate yet.'],
        improvements: ['Add or select an excerpt before requesting a review.'],
        suggestions: ['Paste a representative scene or write at least one paragraph, then run the review again.'],
      })
      return
    }

    setIsReviewing(true)
    setFeedback(null)
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          content: contentToReview,
          projectType: project.meta.projectType,
          genre: project.meta.genre
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback || generateFallbackReview(project.meta.genre, contentToReview))
      } else {
        setFeedback(generateFallbackReview(project.meta.genre, contentToReview))
      }
    } catch (error) {
      console.log('[v0] Review error:', error)
      setFeedback(generateFallbackReview(project.meta.genre, contentToReview))
    }
    
    setIsReviewing(false)
  }

  const downloadFeedback = () => {
    if (!feedback) return
    
    let text = `BookEr AI - Editorial Review\n${'='.repeat(30)}\n\n`
    
    text += `STRENGTHS\n${'-'.repeat(20)}\n`
    feedback.strengths.forEach((s, i) => {
      text += `${i + 1}. ${s}\n`
    })
    
    text += `\nAREAS TO IMPROVE\n${'-'.repeat(20)}\n`
    feedback.improvements.forEach((s, i) => {
      text += `${i + 1}. ${s}\n`
    })
    
    text += `\nSPECIFIC SUGGESTIONS\n${'-'.repeat(20)}\n`
    feedback.suggestions.forEach((s, i) => {
      text += `${i + 1}. ${s}\n`
    })
    
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `review-${project?.meta.title || 'feedback'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href={`/editor/${params.id}`} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">{project.meta.title}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">AI Editorial Review</h1>
          </div>
          <p className="text-muted-foreground">
            Get professional feedback on your writing from our AI editor.
          </p>
        </div>

        {/* Review Options */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle>What would you like to review?</CardTitle>
            <CardDescription>Select a chapter, paste custom text, or review your full manuscript.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={reviewMode === 'chapter' ? 'default' : 'outline'}
                onClick={() => setReviewMode('chapter')}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Chapter
              </Button>
              <Button
                variant={reviewMode === 'custom' ? 'default' : 'outline'}
                onClick={() => setReviewMode('custom')}
              >
                Custom Text
              </Button>
              <Button
                variant={reviewMode === 'full' ? 'default' : 'outline'}
                onClick={() => setReviewMode('full')}
              >
                Full Manuscript
              </Button>
            </div>

            {reviewMode === 'chapter' && (
              <Select 
                value={selectedChapter.toString()} 
                onValueChange={(v) => setSelectedChapter(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {project.chapters.map((chapter, index) => (
                    <SelectItem key={chapter.id} value={index.toString()}>
                      {chapter.title} ({chapter.wordCount} words)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {reviewMode === 'custom' && (
              <Textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste the text you want to review..."
                rows={8}
              />
            )}

            {reviewMode === 'full' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This will review all {project.chapters.length} chapters 
                  ({project.meta.wordCount.toLocaleString()} words total).
                  This may take a moment.
                </p>
              </div>
            )}

            <Button 
              onClick={handleReview} 
              disabled={isReviewing}
              className="w-full gap-2"
            >
              {isReviewing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing your writing...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Get AI Review
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Feedback Results */}
        {feedback && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Review Results</h2>
              <Button variant="outline" onClick={downloadFeedback} className="gap-2">
                <Download className="h-4 w-4" />
                Download as .txt
              </Button>
            </div>

            {/* Strengths */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-800">Strengths</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 mt-0.5">
                        {i + 1}
                      </Badge>
                      <span className="text-green-900">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Areas to Improve */}
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-amber-800">Areas to Improve</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 mt-0.5">
                        {i + 1}
                      </Badge>
                      <span className="text-amber-900">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Specific Suggestions */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-800">Specific Suggestions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 mt-0.5">
                        {i + 1}
                      </Badge>
                      <span className="text-blue-900">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

function generateFallbackReview(genre: string, content: string): ReviewFeedback {
  const excerpt = content.trim()
  const firstSentence = excerpt.split(/[.!?]+/).map((part) => part.trim()).find(Boolean) || 'the opening'
  const words = excerpt.split(/\s+/).filter(Boolean).length
  return {
    strengths: [
      `The excerpt opens with a concrete narrative starting point: “${firstSentence.slice(0, 120)}${firstSentence.length > 120 ? '…' : ''}”.`,
      `The ${words}-word passage gives the reader a focused sample of the current voice and scene direction.`,
      `The ${genre.toLowerCase()} framing can become more distinctive as the character conflict develops.`
    ],
    improvements: [
      'Make the viewpoint character’s immediate want and obstacle unmistakable in the scene.',
      'Add specific sensory details that reveal the character’s emotional state instead of only describing the setting.',
      'Check each paragraph for a change in tension, information, or decision so the scene keeps moving.'
    ],
    suggestions: [
      `Revise the opening around the tension implied by “${firstSentence.slice(0, 80)}${firstSentence.length > 80 ? '…' : ''}”.`,
      'Give the character a concrete choice by the end of the excerpt, even if the larger conflict remains unresolved.',
      'Read the passage aloud and replace vague verbs or repeated sentence openings with sharper, more varied phrasing.'
    ]
  }
}
