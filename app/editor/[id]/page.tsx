'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Sparkles,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  List,
  ListOrdered,
  Undo,
  Redo,
  Send,
  ArrowDownLeft,
  PanelRightClose,
  PanelRight,
  Check,
  Loader2,
  FileText,
  Users,
  Globe,
  Layers,
  Star,
  FileOutput
} from 'lucide-react'
import { getProjectByIndex, saveProject, addWordsToday } from '@/lib/storage'
import { BRXProject, countWords, countChars, estimateReadTime, AIMessage } from '@/lib/types'
import CharacterManager from '@/components/editor/character-manager'
import WorldBuilder from '@/components/editor/world-builder'
import ChapterManager from '@/components/editor/chapter-manager'

type SaveStatus = 'saved' | 'saving' | 'unsaved'

const AI_QUICK_ACTIONS = [
  'Continue scene',
  'Add dialogue',
  'Describe setting',
  'Plot twist',
  'Inner monologue',
  'Improve prose'
]

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = `project-${params.id}`
  const projectIndex = parseInt(params.id as string)
  
  const [project, setProject] = useState<BRXProject | null>(null)
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastWordCountRef = useRef(0)
  const projectRef = useRef<BRXProject | null>(null)

  useEffect(() => {
    const proj = getProjectByIndex(projectIndex)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    projectRef.current = proj
    setProject(proj)
    lastWordCountRef.current = proj.meta.wordCount
  }, [projectIndex, router])

  useEffect(() => {
    projectRef.current = project
  }, [project])

  // Keep the contentEditable DOM in sync only when the loaded project or chapter changes.
  // Updating innerHTML during every keystroke recreates the text node and moves the caret.
  useEffect(() => {
    if (!editorRef.current || !project) return
    editorRef.current.innerHTML = project.chapters[activeChapterIndex]?.body || ''
  }, [activeChapterIndex, Boolean(project)])

  const handleSave = useCallback(() => {
    const currentProject = projectRef.current
    if (!currentProject) return

    setSaveStatus('saving')
    const totalWords = currentProject.chapters.reduce((sum, ch) => sum + countWords(ch.body), 0)
    const totalChars = currentProject.chapters.reduce((sum, ch) => sum + countChars(ch.body), 0)
    const newWords = totalWords - lastWordCountRef.current
    if (newWords > 0) addWordsToday(newWords)
    lastWordCountRef.current = totalWords

    const updatedProject = {
      ...currentProject,
      meta: {
        ...currentProject.meta,
        wordCount: totalWords,
        charCount: totalChars,
        updatedAt: new Date().toISOString()
      }
    }

    projectRef.current = updatedProject
    saveProject(projectId, updatedProject)
    setProject(updatedProject)
    setTimeout(() => setSaveStatus('saved'), 500)
  }, [projectId])

  const scheduleAutoSave = useCallback(() => {
    setSaveStatus('unsaved')
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSave()
    }, 2000)
  }, [handleSave])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const handleEditorInput = () => {
    if (!editorRef.current) return

    const html = editorRef.current.innerHTML
    setProject((current) => {
      if (!current || !current.chapters[activeChapterIndex]) return current
      const updatedChapters = [...current.chapters]
      updatedChapters[activeChapterIndex] = {
        ...updatedChapters[activeChapterIndex],
        body: html,
        wordCount: countWords(html),
        updatedAt: new Date().toISOString()
      }
      return { ...current, chapters: updatedChapters }
    })
    scheduleAutoSave()
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleEditorInput()
  }

  const handleAIChat = async (message?: string) => {
    const prompt = message || aiInput
    if (!prompt.trim() || !project) return
    
    setAiLoading(true)
    setAiInput('')
    
    const userMessage: AIMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    }
    
    const updatedHistory = [...project.aiHistory, userMessage]
    setProject({ ...project, aiHistory: updatedHistory })
    
    try {
      const currentContent = project.chapters[activeChapterIndex]?.body || ''
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          prompt,
          context: currentContent,
          projectType: project.meta.projectType,
          genre: project.meta.genre,
          history: updatedHistory.slice(-10)
        })
      })
      
      let assistantContent = ''
      if (response.ok) {
        const data = await response.json()
        assistantContent = data.content || data.response || ''
      } else {
        assistantContent = generateFallbackResponse(prompt, project.meta.projectType, project.meta.genre)
      }
      
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      }
      
      setProject(prev => prev ? {
        ...prev,
        aiHistory: [...updatedHistory, assistantMessage]
      } : null)
      
    } catch (error) {
      console.log('[v0] AI chat error:', error)
      const fallbackMessage: AIMessage = {
        role: 'assistant',
        content: generateFallbackResponse(prompt, project.meta.projectType, project.meta.genre),
        timestamp: new Date().toISOString()
      }
      
      setProject(prev => prev ? {
        ...prev,
        aiHistory: [...updatedHistory, fallbackMessage]
      } : null)
    }
    
    setAiLoading(false)
    scheduleAutoSave()
  }

  const insertIntoEditor = (text: string) => {
    if (!editorRef.current) return
    
    editorRef.current.focus()
    const selection = window.getSelection()
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(text))
      range.collapse(false)
    } else {
      editorRef.current.innerHTML += text
    }
    
    handleEditorInput()
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const activeChapter = project.chapters[activeChapterIndex]
  const wordCount = activeChapter ? countWords(activeChapter.body) : 0
  const charCount = activeChapter ? countChars(activeChapter.body) : 0
  const readTime = estimateReadTime(wordCount)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border bg-card px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Input
              value={activeChapter?.title || ''}
              onChange={(e) => {
                const updatedChapters = [...project.chapters]
                updatedChapters[activeChapterIndex] = {
                  ...updatedChapters[activeChapterIndex],
                  title: e.target.value,
                  updatedAt: new Date().toISOString()
                }
                setProject({ ...project, chapters: updatedChapters })
                scheduleAutoSave()
              }}
              className="max-w-xs font-semibold border-none bg-transparent focus-visible:ring-0 px-0"
            />
            <Badge variant="secondary">{project.meta.projectType}</Badge>
            <Badge variant="outline">{project.meta.genre}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-sm flex items-center gap-1 ${
              saveStatus === 'saved' ? 'text-green-600' : 
              saveStatus === 'saving' ? 'text-yellow-600' : 
              'text-muted-foreground'
            }`}>
              {saveStatus === 'saved' && <Check className="h-4 w-4" />}
              {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
            </span>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/editor/${params.id}/export`}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="hidden md:flex"
            >
              {showAIPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Formatting Toolbar */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-1 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => execCommand('bold')} title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('italic')} title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('underline')} title="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('strikeThrough')} title="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button variant="ghost" size="icon" onClick={() => execCommand('formatBlock', 'h1')} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('formatBlock', 'h3')} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('formatBlock', 'p')} title="Paragraph">
          <Pilcrow className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('formatBlock', 'blockquote')} title="Quote">
          <Quote className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button variant="ghost" size="icon" onClick={() => execCommand('insertUnorderedList')} title="Bullet List">
          <List className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('insertOrderedList')} title="Numbered List">
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button variant="ghost" size="icon" onClick={() => execCommand('undo')} title="Undo">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => execCommand('redo')} title="Redo">
          <Redo className="h-4 w-4" />
        </Button>
        
        <div className="flex-1" />
        
        <div className="text-sm text-muted-foreground flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span>~{readTime} min read</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Tabs defaultValue="write" className="flex-1 flex flex-col">
          <div className="border-b border-border bg-card px-4">
            <TabsList className="h-12">
              <TabsTrigger value="write" className="gap-2">
                <FileText className="h-4 w-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="chapters" className="gap-2">
                <Layers className="h-4 w-4" />
                Chapters
              </TabsTrigger>
              <TabsTrigger value="characters" className="gap-2">
                <Users className="h-4 w-4" />
                Characters
              </TabsTrigger>
              <TabsTrigger value="world" className="gap-2">
                <Globe className="h-4 w-4" />
                World
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-2" asChild>
                <Link href={`/editor/${params.id}/review`}>
                  <Star className="h-4 w-4" />
                  Review
                </Link>
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-2" asChild>
                <Link href={`/editor/${params.id}/export`}>
                  <FileOutput className="h-4 w-4" />
                  Export
                </Link>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="write" className="flex-1 flex overflow-hidden m-0">
            {/* Editor */}
            <div className="flex-1 overflow-auto">
              <div className="max-w-3xl mx-auto p-8">
                <div
                  ref={editorRef}
                  contentEditable
                  className="min-h-[60vh] font-serif text-lg leading-relaxed outline-none prose prose-lg max-w-none"
                  style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}
                  onInput={handleEditorInput}
                  suppressContentEditableWarning
                  data-placeholder="Begin your story here..."
                />
                <style jsx>{`
                  [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: var(--muted-foreground);
                    pointer-events: none;
                    position: absolute;
                  }
                  [contenteditable] {
                    position: relative;
                  }
                `}</style>
              </div>
            </div>

            {/* AI Panel */}
            {showAIPanel && (
              <div className="w-80 border-l border-border bg-card flex flex-col hidden md:flex">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">AI Assistant</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Customized for {project.meta.projectType}
                  </p>
                </div>
                
                <div className="p-3 border-b border-border">
                  <div className="flex flex-wrap gap-2">
                    {AI_QUICK_ACTIONS.map((action) => (
                      <Button
                        key={action}
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleAIChat(action)}
                        disabled={aiLoading}
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {project.aiHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-primary/10 ml-4' 
                            : 'bg-muted mr-4'
                        }`}
                      >
                        <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === 'assistant' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs gap-1"
                            onClick={() => insertIntoEditor(msg.content)}
                          >
                            <ArrowDownLeft className="h-3 w-3" />
                            Insert into editor
                          </Button>
                        )}
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Ask AI for help..."
                      className="min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAIChat()
                        }
                      }}
                    />
                  </div>
                  <Button 
                    className="w-full mt-2 gap-2" 
                    onClick={() => handleAIChat()}
                    disabled={aiLoading || !aiInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="chapters" className="flex-1 overflow-hidden m-0">
            <ChapterManager
              project={project}
              activeChapterIndex={activeChapterIndex}
              onSelectChapter={setActiveChapterIndex}
              onUpdateProject={(p) => {
                setProject(p)
                scheduleAutoSave()
              }}
            />
          </TabsContent>

          <TabsContent value="characters" className="flex-1 overflow-hidden m-0">
            <CharacterManager
              project={project}
              onUpdateProject={(p) => {
                setProject(p)
                scheduleAutoSave()
              }}
            />
          </TabsContent>

          <TabsContent value="world" className="flex-1 overflow-hidden m-0">
            <WorldBuilder
              project={project}
              onUpdateProject={(p) => {
                setProject(p)
                scheduleAutoSave()
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function generateFallbackResponse(prompt: string, projectType: string, genre: string): string {
  const promptLower = prompt.toLowerCase()
  
  if (promptLower.includes('continue') || promptLower.includes('scene')) {
    return `The air grew thick with tension as the moment stretched on. Every heartbeat seemed to echo in the silence, carrying with it the weight of decisions yet to be made. In this ${genre.toLowerCase()} ${projectType.toLowerCase()}, such moments defined everything.`
  }
  
  if (promptLower.includes('dialogue')) {
    return `"I never thought we'd end up here," she whispered, her voice barely audible above the ambient sounds.\n\n"Neither did I," came the reply, heavy with unspoken meaning. "But here we are, and we must decide what happens next."`
  }
  
  if (promptLower.includes('setting') || promptLower.includes('describe')) {
    return `The setting stretched before them, a tapestry woven from light and shadow. Every detail seemed deliberate—the way colors shifted in the changing light, the subtle textures that caught the eye, the atmosphere that wrapped around everything like a living presence.`
  }
  
  if (promptLower.includes('twist') || promptLower.includes('plot')) {
    return `But then, everything changed. What had seemed certain suddenly wavered, revealing a truth that had been hidden in plain sight all along. The revelation sent ripples through every assumption, every plan, every hope.`
  }
  
  if (promptLower.includes('monologue') || promptLower.includes('inner')) {
    return `The thoughts came unbidden, swirling through consciousness like leaves in an autumn wind. What did it all mean? And more importantly—what would come next? The questions had no easy answers, only the promise of more questions beyond.`
  }
  
  if (promptLower.includes('improve') || promptLower.includes('prose')) {
    return `Consider varying your sentence structure more. Mix short, punchy sentences with longer, more flowing ones. Add sensory details—what do characters see, hear, smell, feel? Show emotions through actions rather than stating them directly.`
  }
  
  return `I can help you develop your ${genre.toLowerCase()} ${projectType.toLowerCase()}. Try asking me to continue a scene, add dialogue, describe a setting, create a plot twist, write inner monologue, or improve your prose. I'm here to assist with your creative vision.`
}
