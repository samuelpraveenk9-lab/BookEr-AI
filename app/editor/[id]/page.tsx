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
  FileOutput,
  X
} from 'lucide-react'
import { getProject, saveProject, addWordsToday, syncProjectsFromCloud, getSettings, getUser } from '@/lib/storage'
import { getAuthHeaders } from '@/lib/supabase'
import { BRXProject, countWords, countChars, estimateReadTime, AIMessage, UserSettings } from '@/lib/types'
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
  const projectId = params.id as string
  
  const [project, setProject] = useState<BRXProject | null>(null)
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastWordCountRef = useRef(0)
  const projectRef = useRef<BRXProject | null>(null)
  const renderedChapterIdRef = useRef<string | null>(null) 
  const activeChapterIndexRef = useRef(0)
  const [aiError, setAiError] = useState<string | null>(null)
  const [liveStats, setLiveStats] = useState({ words: 0, chars: 0 })
  const [writingSettings, setWritingSettings] = useState<UserSettings['writing']>({ defaultFont: 'Lora', defaultFontSize: 18, lineHeight: 1.8, theme: 'light' })

  useEffect(() => {
    let cancelled = false
    const loadProject = async () => {
      if (!getUser()?.isLoggedIn) { router.replace('/auth'); return }
      await syncProjectsFromCloud()
      if (cancelled) return
      if (!getUser()?.isLoggedIn) { router.replace('/auth'); return }
      const proj = getProject(projectId)
      setWritingSettings(getSettings().writing)
      if (!proj) {
        router.replace('/dashboard')
        return
      }
      projectRef.current = proj
      setProject(proj)
      const initialBody = proj.chapters[0]?.body || ''
      setLiveStats({ words: countWords(initialBody), chars: countChars(initialBody) })
      lastWordCountRef.current = proj.meta.wordCount
    }
    void loadProject()
    return () => { cancelled = true }
  }, [projectId, router])

  useEffect(() => {
    projectRef.current = project
  }, [project])

  // The editable DOM owns the caret while typing. Only hydrate it when the chapter changes.
  useEffect(() => {
    activeChapterIndexRef.current = activeChapterIndex
    const chapter = project?.chapters[activeChapterIndex]
    if (!editorRef.current || !chapter || renderedChapterIdRef.current === chapter.id) return
    editorRef.current.innerHTML = chapter.body || ''
    renderedChapterIdRef.current = chapter.id
  }, [activeChapterIndex, project])

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
  }, [])

  const syncEditorToProject = useCallback(() => {
    const currentProject = projectRef.current
    const editor = editorRef.current
    const chapterIndex = activeChapterIndexRef.current
    if (!currentProject || !editor || !currentProject.chapters[chapterIndex]) return currentProject

    const body = editor.innerHTML
    const currentChapter = currentProject.chapters[chapterIndex]
    if (currentChapter.body === body) return currentProject

    const updatedProject = {
      ...currentProject,
      chapters: currentProject.chapters.map((chapter, index) => index === chapterIndex
        ? { ...chapter, body, wordCount: countWords(body), updatedAt: new Date().toISOString() }
        : chapter)
    }
    projectRef.current = updatedProject
    return updatedProject
  }, [])

  const handleSave = useCallback(() => {
    const currentProject = syncEditorToProject()
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
    if (savedStatusTimeoutRef.current) clearTimeout(savedStatusTimeoutRef.current)
    savedStatusTimeoutRef.current = setTimeout(() => setSaveStatus('saved'), 350)
  }, [projectId, syncEditorToProject])

  const scheduleAutoSave = useCallback(() => {
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
    const editor = editorRef.current
    if (!editor) return

    const html = editor.innerHTML
    const text = editor.innerText
    setSaveStatus('unsaved')
    const currentProject = projectRef.current
    if (currentProject?.chapters[activeChapterIndexRef.current]) {
      const updatedProject = {
        ...currentProject,
        chapters: currentProject.chapters.map((chapter, index) => index === activeChapterIndexRef.current
          ? { ...chapter, body: html, wordCount: countWords(text), updatedAt: new Date().toISOString() }
          : chapter)
      }
      projectRef.current = updatedProject
    }
    scheduleAutoSave()
  }

  const handleEditorBlur = () => {
    if (!editorRef.current) return
    setLiveStats({
      words: countWords(editorRef.current.innerText),
      chars: countChars(editorRef.current.innerText),
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
    const currentProject = syncEditorToProject() || projectRef.current
    if (!prompt.trim() || !currentProject) return
    
    setAiLoading(true)
    setAiError(null)
    setAiInput('')
    
    const userMessage: AIMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString()
    }
    
    const previousHistory = currentProject.aiHistory || []
    const updatedHistory = [...previousHistory, userMessage]
    const projectWithUserMessage = { ...currentProject, aiHistory: updatedHistory }
    projectRef.current = projectWithUserMessage
    setProject(projectWithUserMessage)
    
    try {
      const currentContent = currentProject.chapters[activeChapterIndex]?.body || ''
      const aiSettings = getSettings().ai
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...await getAuthHeaders() },
        body: JSON.stringify({
          action: 'chat',
          prompt,
          context: currentContent,
          projectType: currentProject.meta.projectType,
          genre: currentProject.meta.genre,
          history: previousHistory.slice(-8),
          responseLength: aiSettings.responseLength,
          writingStyle: aiSettings.writingStyle,
          requestId: crypto.randomUUID()
        }),
        cache: 'no-store'
      })
      
      let assistantContent = ''
      if (response.ok) {
        const data = await response.json()
        assistantContent = data.content || data.response || ''
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'The AI assistant could not respond.')
      }

      if (!assistantContent.trim()) {
        throw new Error('The AI assistant returned an empty response.')
      }
      
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      }
      
      const projectWithResponse = {
        ...(projectRef.current || currentProject),
        aiHistory: [...updatedHistory, assistantMessage],
      }
      projectRef.current = projectWithResponse
      setProject(projectWithResponse)
      
    } catch (error) {
      console.error('[v0] AI chat error:', error)
      setAiError(error instanceof Error ? error.message : 'The AI assistant could not respond. Please try again.')
      const projectAfterFailure = {
        ...(projectRef.current || currentProject),
        aiHistory: previousHistory,
      }
      projectRef.current = projectAfterFailure
      setProject(projectAfterFailure)
    }
    
    setAiLoading(false)
    scheduleAutoSave()
  }

  const handleSelectChapter = (nextIndex: number) => {
    if (nextIndex === activeChapterIndex) return
    syncEditorToProject()
    setProject(projectRef.current)
    setActiveChapterIndex(nextIndex)
    const nextChapter = projectRef.current?.chapters[nextIndex]
    setLiveStats({
      words: countWords(nextChapter?.body || ''),
      chars: countChars(nextChapter?.body || ''),
    })
  }

  const insertIntoEditor = (text: string) => {
    const editor = editorRef.current
    if (!editor) return

    const selection = window.getSelection()
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    const selectionIsInsideEditor = Boolean(range && editor.contains(range.commonAncestorContainer))

    editor.focus()
    if (selectionIsInsideEditor && range) {
      range.deleteContents()
      const textNode = document.createTextNode(text)
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    } else {
      const endRange = document.createRange()
      endRange.selectNodeContents(editor)
      endRange.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(endRange)
      document.execCommand('insertText', false, text)
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
  const wordCount = liveStats.words || (activeChapter ? countWords(activeChapter.body) : 0)
  const charCount = liveStats.chars || (activeChapter ? countChars(activeChapter.body) : 0)
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
              className="flex"
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
                  className={`min-h-[60vh] outline-none prose prose-lg max-w-none ${writingSettings.theme === 'dark' ? 'prose-invert' : ''}`}
                  style={{
                    fontFamily: writingSettings.defaultFont === 'Lora' ? 'var(--font-lora), Georgia, serif' : writingSettings.defaultFont === 'Geist' ? 'var(--font-geist-sans), Arial, sans-serif' : writingSettings.defaultFont,
                    fontSize: `${writingSettings.defaultFontSize}px`,
                    lineHeight: writingSettings.lineHeight,
                    backgroundColor: writingSettings.theme === 'sepia' ? '#f4ecd8' : writingSettings.theme === 'dark' ? '#1f2937' : undefined,
                    color: writingSettings.theme === 'sepia' ? '#3b3024' : writingSettings.theme === 'dark' ? '#f3f4f6' : undefined,
                    padding: '1.25rem',
                    borderRadius: '0.5rem',
                  }}
              onInput={handleEditorInput}
              onBlur={handleEditorBlur}
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
              <div className="fixed inset-0 z-50 w-full border-l border-border bg-card flex flex-col md:static md:inset-auto md:z-auto md:w-80 md:shrink-0">
                <div className="p-4 border-b border-border flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-foreground">AI Assistant</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Customized for {project.meta.projectType}
                    </p>
                    {aiError && (
                      <p role="alert" className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
                        {aiError}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowAIPanel(false)} aria-label="Close AI assistant">
                    <X className="h-4 w-4" />
                  </Button>
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
              onSelectChapter={handleSelectChapter}
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
