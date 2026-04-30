'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  GripVertical, 
  Pencil, 
  Trash2, 
  Check, 
  X,
  FileText
} from 'lucide-react'
import { BRXProject, Chapter, ChapterStatus } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface ChapterManagerProps {
  project: BRXProject
  activeChapterIndex: number
  onSelectChapter: (index: number) => void
  onUpdateProject: (project: BRXProject) => void
}

const STATUS_COLORS: Record<ChapterStatus, string> = {
  'Draft': 'bg-yellow-100 text-yellow-800',
  'Revised': 'bg-blue-100 text-blue-800',
  'Final': 'bg-green-100 text-green-800'
}

export default function ChapterManager({ 
  project, 
  activeChapterIndex, 
  onSelectChapter,
  onUpdateProject 
}: ChapterManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const addChapter = () => {
    const newChapter: Chapter = {
      id: crypto.randomUUID(),
      title: `Chapter ${project.chapters.length + 1}`,
      body: '',
      wordCount: 0,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    onUpdateProject({
      ...project,
      chapters: [...project.chapters, newChapter]
    })
  }

  const deleteChapter = (index: number) => {
    if (project.chapters.length <= 1) return
    
    const updatedChapters = project.chapters.filter((_, i) => i !== index)
    onUpdateProject({
      ...project,
      chapters: updatedChapters
    })
    
    if (activeChapterIndex >= updatedChapters.length) {
      onSelectChapter(updatedChapters.length - 1)
    } else if (activeChapterIndex > index) {
      onSelectChapter(activeChapterIndex - 1)
    }
  }

  const startEditing = (chapter: Chapter) => {
    setEditingId(chapter.id)
    setEditTitle(chapter.title)
  }

  const saveEdit = (index: number) => {
    const updatedChapters = [...project.chapters]
    updatedChapters[index] = {
      ...updatedChapters[index],
      title: editTitle,
      updatedAt: new Date().toISOString()
    }
    
    onUpdateProject({
      ...project,
      chapters: updatedChapters
    })
    
    setEditingId(null)
    setEditTitle('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const updateStatus = (index: number, status: ChapterStatus) => {
    const updatedChapters = [...project.chapters]
    updatedChapters[index] = {
      ...updatedChapters[index],
      status,
      updatedAt: new Date().toISOString()
    }
    
    onUpdateProject({
      ...project,
      chapters: updatedChapters
    })
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const updatedChapters = [...project.chapters]
    const draggedChapter = updatedChapters[draggedIndex]
    updatedChapters.splice(draggedIndex, 1)
    updatedChapters.splice(index, 0, draggedChapter)
    
    onUpdateProject({
      ...project,
      chapters: updatedChapters
    })
    
    // Update active chapter index if needed
    if (activeChapterIndex === draggedIndex) {
      onSelectChapter(index)
    } else if (draggedIndex < activeChapterIndex && index >= activeChapterIndex) {
      onSelectChapter(activeChapterIndex - 1)
    } else if (draggedIndex > activeChapterIndex && index <= activeChapterIndex) {
      onSelectChapter(activeChapterIndex + 1)
    }
    
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chapters</h2>
          <p className="text-muted-foreground">
            {project.chapters.length} chapter{project.chapters.length !== 1 ? 's' : ''} · {project.meta.wordCount.toLocaleString()} words total
          </p>
        </div>
        <Button onClick={addChapter} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Chapter
        </Button>
      </div>

      <div className="space-y-2 max-w-3xl">
        {project.chapters.map((chapter, index) => (
          <Card
            key={chapter.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`border-border cursor-pointer transition-all ${
              activeChapterIndex === index 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:border-primary/50'
            } ${draggedIndex === index ? 'opacity-50' : ''}`}
          >
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="cursor-grab text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  {editingId === chapter.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(index)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                      <Button variant="ghost" size="icon" onClick={() => saveEdit(index)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={cancelEdit}>
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div onClick={() => onSelectChapter(index)}>
                      <h3 className="font-semibold text-foreground truncate">{chapter.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{chapter.wordCount.toLocaleString()} words</span>
                        <span>·</span>
                        <span>Edited {formatDistanceToNow(new Date(chapter.updatedAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <Select 
                  value={chapter.status} 
                  onValueChange={(v) => updateStatus(index, v as ChapterStatus)}
                >
                  <SelectTrigger className="w-28 h-8">
                    <Badge className={STATUS_COLORS[chapter.status]} variant="secondary">
                      {chapter.status}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Revised">Revised</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectChapter(index)
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(chapter)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChapter(index)
                    }}
                    disabled={project.chapters.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
