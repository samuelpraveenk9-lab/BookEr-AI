'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Sparkles, MapPin, Users, Wand2, Clock, Languages, BookOpen, Loader2, Send } from 'lucide-react'
import { BRXProject, WorldNotes } from '@/lib/types'
import { toast } from 'sonner'

interface WorldBuilderProps {
  project: BRXProject
  onUpdateProject: (project: BRXProject) => void
}

const WORLD_SECTIONS = [
  { key: 'locations', label: 'Locations', icon: MapPin, description: 'Places, cities, kingdoms, and settings' },
  { key: 'factions', label: 'Factions', icon: Users, description: 'Groups, organizations, and alliances' },
  { key: 'magicSystem', label: 'Magic System / Technology', icon: Wand2, description: 'Powers, abilities, and tech' },
  { key: 'timeline', label: 'Timeline / History', icon: Clock, description: 'Historical events and chronology' },
  { key: 'languages', label: 'Languages', icon: Languages, description: 'Languages, dialects, and communication' },
  { key: 'rules', label: 'Rules of the World', icon: BookOpen, description: 'Laws, customs, and world mechanics' }
] as const

export default function WorldBuilder({ project, onUpdateProject }: WorldBuilderProps) {
  const [openSections, setOpenSections] = useState<string[]>(['locations'])
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [aiChat, setAiChat] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const toggleSection = (key: string) => {
    setOpenSections(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    )
  }

  const updateWorldNote = (key: keyof WorldNotes, value: string) => {
    onUpdateProject({
      ...project,
      worldNotes: {
        ...project.worldNotes,
        [key]: value
      }
    })
  }

  const generateContent = async (key: keyof WorldNotes) => {
    if (isGenerating) return
    setIsGenerating(key)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_world_content',
          section: key,
          projectType: project.meta.projectType,
          genre: project.meta.genre,
          title: project.meta.title,
          existingNotes: project.worldNotes,
        }),
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'World content generation failed.')
      const content = String(data.content || '').trim()
      if (!content) throw new Error('The AI returned empty world-building content.')
      updateWorldNote(key, content)
    } catch (error) {
      console.error('[BookEr AI] World content generation failed:', error)
      toast.error(error instanceof Error ? error.message : 'World content generation failed.')
    } finally {
      setIsGenerating(null)
    }
  }

  const handleAiChat = async () => {
    const question = aiChat.trim()
    if (!question || aiLoading) return
    setAiLoading(true)
    setAiResponse('')
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'world_building_chat',
          prompt: question,
          projectType: project.meta.projectType,
          genre: project.meta.genre,
          worldNotes: project.worldNotes,
        }),
        cache: 'no-store',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'World-building assistant failed.')
      const content = String(data.content || data.response || '').trim()
      if (!content) throw new Error('The AI returned an empty response.')
      setAiResponse(content)
      setAiChat('')
    } catch (error) {
      console.error('[BookEr AI] World-building chat failed:', error)
      toast.error(error instanceof Error ? error.message : 'World-building assistant failed.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">World Builder</h2>
          <p className="text-muted-foreground">Build the universe of your story</p>
        </div>

        <div className="space-y-4 max-w-3xl">
          {WORLD_SECTIONS.map(({ key, label, icon: Icon, description }) => (
            <Card key={key} className="border-border">
              <Collapsible 
                open={openSections.includes(key)} 
                onOpenChange={() => toggleSection(key)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{label}</CardTitle>
                          <CardDescription>{description}</CardDescription>
                        </div>
                      </div>
                      {openSections.includes(key) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => generateContent(key as keyof WorldNotes)}
                        disabled={isGenerating === key}
                      >
                        {isGenerating === key ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        AI Help
                      </Button>
                    </div>
                    <Textarea
                      value={project.worldNotes[key as keyof WorldNotes]}
                      onChange={(e) => updateWorldNote(key as keyof WorldNotes, e.target.value)}
                      placeholder={`Describe your world's ${label.toLowerCase()}...`}
                      rows={6}
                      className="resize-none"
                    />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Chat Panel */}
      <div className="w-80 border-l border-border bg-card flex flex-col hidden lg:flex">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">World Building AI</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ask questions about your world
          </p>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          {aiResponse && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-foreground whitespace-pre-wrap">{aiResponse}</p>
            </div>
          )}
          {aiLoading && (
            <div className="flex items-center gap-2 text-muted-foreground p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              value={aiChat}
              onChange={(e) => setAiChat(e.target.value)}
              placeholder="Ask about world building..."
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAiChat()
                }
              }}
            />
          </div>
          <Button 
            className="w-full mt-2 gap-2" 
            onClick={handleAiChat}
            disabled={aiLoading || !aiChat.trim()}
          >
            <Send className="h-4 w-4" />
            Ask
          </Button>
        </div>
      </div>
    </div>
  )
}
