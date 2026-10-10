'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Sparkles, 
  BookOpen, 
  PenTool,
  Layers,
  Users,
  Globe,
  MessageSquare,
  Tag,
  Palette,
  Send,
  Loader2,
  X,
  ArrowLeft
} from 'lucide-react'
import { PROJECT_TYPES, ProjectType } from '@/lib/types'
import { getAuthHeaders } from '@/lib/supabase'
import { getSettings } from '@/lib/storage'

interface AITool {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  systemPrompt: string
  placeholder: string
}

const AI_TOOLS: AITool[] = [
  {
    id: 'extender',
    icon: PenTool,
    title: 'Story Extender',
    description: 'Continue your story from where you left off with contextual suggestions.',
    systemPrompt: 'You are a creative writing assistant. Continue the story naturally, matching the existing tone and style.',
    placeholder: 'Paste the last paragraph of your story and I\'ll continue it...'
  },
  {
    id: 'manga',
    icon: Layers,
    title: 'Manga Scripter',
    description: 'Format your scenes as panel-by-panel manga scripts.',
    systemPrompt: 'You are a manga script assistant. Convert narrative descriptions into panel scripts with panel numbers, actions, and dialogue.',
    placeholder: 'Describe a scene and I\'ll format it as a manga script...'
  },
  {
    id: 'plot',
    icon: Sparkles,
    title: 'Plot Architect',
    description: 'Develop plot points, story arcs, and narrative structures.',
    systemPrompt: 'You are a plot development specialist. Help create compelling story arcs, plot twists, and narrative structures.',
    placeholder: 'Tell me about your story concept or current plot...'
  },
  {
    id: 'character',
    icon: Users,
    title: 'Character Coach',
    description: 'Develop character personalities, motivations, and relationships.',
    systemPrompt: 'You are a character development expert. Help create deep, believable characters with complex motivations and arcs.',
    placeholder: 'Describe your character and what you want to develop...'
  },
  {
    id: 'world',
    icon: Globe,
    title: 'World Builder AI',
    description: 'Create rich settings, magic systems, and world lore.',
    systemPrompt: 'You are a world-building specialist. Help create detailed, consistent world settings with rich lore and systems.',
    placeholder: 'What aspect of your world would you like to develop?'
  },
  {
    id: 'dialogue',
    icon: MessageSquare,
    title: 'Dialogue Coach',
    description: 'Write natural, character-specific dialogue that advances the plot.',
    systemPrompt: 'You are a dialogue specialist. Help write natural, distinctive dialogue that reveals character and advances story.',
    placeholder: 'Describe the scene and characters for the dialogue...'
  },
  {
    id: 'blurb',
    icon: Tag,
    title: 'Title & Blurb Generator',
    description: 'Create compelling titles and back-cover descriptions.',
    systemPrompt: 'You are a publishing specialist. Create compelling book titles and back-cover blurbs that hook readers.',
    placeholder: 'Tell me about your book\'s genre and main plot...'
  },
  {
    id: 'style',
    icon: Palette,
    title: 'Style Translator',
    description: 'Rewrite passages in different genres or writing styles.',
    systemPrompt: 'You are a style transformation expert. Rewrite text in different genres, tones, or author styles while preserving core meaning.',
    placeholder: 'Paste text and specify the target style...'
  }
]

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function StudioPage() {
  const [projectType, setProjectType] = useState<ProjectType>('Novel')
  const [activeTool, setActiveTool] = useState<AITool | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [requestError, setRequestError] = useState('')

  const handleSend = async () => {
    const requestText = input.trim()
    if (!requestText || !activeTool || isLoading) return
    const userMessage: Message = { role: 'user', content: requestText }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setRequestError('')
    setIsLoading(true)
    const aiSettings = getSettings().ai
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({
          action: 'studio_tool',
          toolId: activeTool.id,
          prompt: requestText,
          projectType,
          systemPrompt: activeTool.systemPrompt,
          responseLength: aiSettings.responseLength,
          writingStyle: aiSettings.writingStyle,
          requestId: crypto.randomUUID(),
        }),
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'The AI request failed.')
      const content = String(data.content || data.response || '').trim()
      if (!content) throw new Error('The AI returned an empty response. Please try again.')
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch (error) {
      console.error('[BookEr AI] Studio tool error:', error)
      setRequestError(error instanceof Error ? error.message : 'AI could not respond. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const openTool = (tool: AITool) => {
    setActiveTool(tool)
    setMessages([])
    setRequestError('')
  }

  const closeTool = () => {
    setActiveTool(null)
    setMessages([])
    setRequestError('')
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

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">AI Studio</h1>
              </div>
              <p className="text-muted-foreground">
                Specialized AI tools for every aspect of creative writing.
              </p>
            </div>
            <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Project type" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AI_TOOLS.map((tool) => (
            <Card 
              key={tool.id} 
              className="border-border hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => openTool(tool)}
            >
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <tool.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full gap-2">
                  <Sparkles className="h-4 w-4" />
                  Open Tool
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tool Dialog */}
        <Dialog open={!!activeTool} onOpenChange={() => closeTool()}>
          <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {activeTool && <activeTool.icon className="h-5 w-5 text-primary" />}
                {activeTool?.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="text-sm text-muted-foreground mb-4">
              {activeTool?.description} (Optimized for {projectType})
            </div>
            
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-primary/10 ml-12' 
                        : 'bg-muted mr-12'
                    }`}
                  >
                    <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="pt-4 border-t border-border">\n              {requestError && <p role="alert" className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{requestError}</p>}
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeTool?.placeholder}
                  className="min-h-[100px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={closeTool}>
                  Close
                </Button>
                <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
