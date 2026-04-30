'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, Sparkles, MapPin, Users, Wand2, Clock, Languages, BookOpen, Loader2, Send } from 'lucide-react'
import { BRXProject, WorldNotes } from '@/lib/types'

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
          existingNotes: project.worldNotes
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        updateWorldNote(key, data.content || '')
      } else {
        updateWorldNote(key, generateFallbackWorldContent(key, project.meta.genre, project.meta.title))
      }
    } catch (error) {
      console.log('[v0] World content generation error:', error)
      updateWorldNote(key, generateFallbackWorldContent(key, project.meta.genre, project.meta.title))
    }
    
    setIsGenerating(null)
  }

  const handleAiChat = async () => {
    if (!aiChat.trim()) return
    
    setAiLoading(true)
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'world_building_chat',
          prompt: aiChat,
          projectType: project.meta.projectType,
          genre: project.meta.genre,
          worldNotes: project.worldNotes
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setAiResponse(data.content || data.response || '')
      } else {
        setAiResponse(generateFallbackWorldResponse(aiChat, project.meta.genre))
      }
    } catch (error) {
      console.log('[v0] World chat error:', error)
      setAiResponse(generateFallbackWorldResponse(aiChat, project.meta.genre))
    }
    
    setAiChat('')
    setAiLoading(false)
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

function generateFallbackWorldContent(key: string, genre: string, title: string): string {
  const templates: Record<string, string> = {
    locations: `The world of "${title}" features several key locations:\n\n• The Central Hub - A place where paths converge and destinies intertwine\n• The Wild Frontier - Unexplored territories holding secrets and dangers\n• The Ancient Grounds - Sites of historical significance and forgotten power\n• The Hidden Sanctuary - A refuge for those who seek shelter from the world`,
    factions: `Several factions vie for influence in this ${genre.toLowerCase()} world:\n\n• The Establishment - Those who maintain the current order\n• The Rebels - Those who seek to change everything\n• The Neutrals - Those who walk their own path\n• The Ancients - Remnants of a previous era`,
    magicSystem: `The ${genre.toLowerCase()} elements of this world follow certain rules:\n\n• Source: Where power originates\n• Limitations: What cannot be done\n• Cost: What must be paid for use\n• Mastery: How abilities are developed`,
    timeline: `Key events in the world's history:\n\n• The Beginning - How it all started\n• The First Age - Early developments\n• The Great Change - A pivotal moment\n• The Present Era - Where the story takes place`,
    languages: `Communication in this world:\n\n• Common Tongue - The standard language\n• Ancient Speech - Used for formal or magical purposes\n• Regional Dialects - Variations across locations\n• Secret Codes - Hidden communications`,
    rules: `The fundamental rules of this world:\n\n• Natural Laws - How the physical world operates\n• Social Customs - How people interact\n• Power Dynamics - Who holds influence and why\n• Forbidden Acts - What is never done`
  }
  
  return templates[key] || `Notes about ${key} in your ${genre.toLowerCase()} world.`
}

function generateFallbackWorldResponse(question: string, genre: string): string {
  return `That's an interesting aspect of your ${genre.toLowerCase()} world to explore. Consider how this element connects to your characters' journeys and the overall themes of your story. Think about the history behind it, how different factions might view it, and what conflicts or opportunities it creates. Would you like me to help develop this further in any specific direction?`
}
