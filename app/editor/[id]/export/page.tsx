'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  FileJson, 
  FileText, 
  Printer, 
  FileArchive,
  Download,
  Upload,
  BookOpen,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react'
import { getProjectByIndex, saveProject, addProject, getProjects } from '@/lib/storage'
import { exportToBRX, exportToTXT, importBRX } from '@/lib/storage'
import { BRXProject } from '@/lib/types'
import { toast } from 'sonner'

export default function ExportPage() {
  const params = useParams()
  const router = useRouter()
  const projectIndex = parseInt(params.id as string)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [project, setProject] = useState<BRXProject | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    const proj = getProjectByIndex(projectIndex)
    if (!proj) {
      router.push('/dashboard')
      return
    }
    setProject(proj)
  }, [projectIndex, router])

  const handleExportBRX = async () => {
    if (!project) return
    setExporting('brx')
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const content = exportToBRX(project)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.meta.title.replace(/[^a-z0-9]/gi, '_')}.brx`
    a.click()
    URL.revokeObjectURL(url)
    
    setExporting(null)
    toast.success('Project exported as .brx')
  }

  const handleExportTXT = async () => {
    if (!project) return
    setExporting('txt')
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const content = exportToTXT(project)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.meta.title.replace(/[^a-z0-9]/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    
    setExporting(null)
    toast.success('Project exported as .txt')
  }

  const handleExportPDF = async () => {
    if (!project) return
    setExporting('pdf')
    
    // Open print dialog for PDF
    const printContent = document.createElement('div')
    printContent.innerHTML = `
      <html>
        <head>
          <title>${project.meta.title}</title>
          <style>
            body { font-family: Georgia, serif; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px; }
            h1 { text-align: center; margin-bottom: 10px; }
            .meta { text-align: center; color: #666; margin-bottom: 40px; }
            h2 { margin-top: 40px; page-break-after: avoid; }
            p { text-indent: 1.5em; margin: 0; }
          </style>
        </head>
        <body>
          <h1>${project.meta.title}</h1>
          <p class="meta">${project.meta.projectType} · ${project.meta.genre}</p>
          ${project.chapters.map(ch => `
            <h2>${ch.title}</h2>
            ${ch.body || '<p><em>No content</em></p>'}
          `).join('')}
        </body>
      </html>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent.innerHTML)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.print()
      }
    }
    
    setExporting(null)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const imported = importBRX(content)
      
      if (imported) {
        // Check if we should replace current project or create new
        const projects = getProjects()
        const existingIndex = projects.findIndex(p => 
          p.meta.title === imported.meta.title && 
          p.meta.createdAt === imported.meta.createdAt
        )
        
        if (existingIndex >= 0) {
          // Replace existing
          saveProject(`project-${existingIndex}`, imported)
          setProject(imported)
          toast.success('Project updated from .brx file')
        } else {
          // Add as new
          const newId = addProject(imported)
          toast.success('Project imported from .brx file')
          router.push(`/editor/${newId.replace('project-', '')}`)
        }
      } else {
        toast.error('Invalid .brx file')
      }
    }
    reader.readAsText(file)
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const exportOptions = [
    {
      id: 'brx',
      icon: FileJson,
      title: '.brx (BookEr Format)',
      description: 'Native format with all project data including chapters, characters, world notes, and AI history.',
      badge: 'Recommended',
      includes: ['All chapters', 'Characters', 'World notes', 'AI history', 'Settings'],
      action: handleExportBRX
    },
    {
      id: 'txt',
      icon: FileText,
      title: '.txt (Plain Text)',
      description: 'Simple text file with all chapters concatenated. Good for sharing or further editing.',
      includes: ['All chapters (text only)'],
      action: handleExportTXT
    },
    {
      id: 'pdf',
      icon: Printer,
      title: '.pdf (Print/PDF)',
      description: 'Use your browser print dialog to save as PDF. Formatted for easy reading.',
      includes: ['All chapters', 'Formatted layout'],
      action: handleExportPDF
    },
    {
      id: 'docx',
      icon: FileArchive,
      title: '.docx (Word Document)',
      description: 'Microsoft Word format for professional editing and submission.',
      badge: 'Coming Soon',
      includes: ['All chapters', 'Formatting'],
      disabled: true
    }
  ]

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
        {/* Import Section */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Project
            </CardTitle>
            <CardDescription>
              Load a previously saved .brx file to restore all content, characters, world notes, and AI history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="file"
              accept=".brx,.json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import .brx File
            </Button>
          </CardContent>
        </Card>

        {/* Export Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Download className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Export Project</h1>
          </div>
          <p className="text-muted-foreground">
            Save your project in various formats for backup, sharing, or publishing.
          </p>
        </div>

        <div className="grid gap-4">
          {exportOptions.map((option) => (
            <Card 
              key={option.id} 
              className={`border-border ${option.disabled ? 'opacity-60' : 'hover:border-primary/50'} transition-colors`}
            >
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <option.icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{option.title}</h3>
                      {option.badge && (
                        <Badge variant={option.badge === 'Coming Soon' ? 'secondary' : 'default'}>
                          {option.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {option.includes.map((item) => (
                        <Badge key={item} variant="outline" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    onClick={option.action}
                    disabled={option.disabled || exporting === option.id}
                    className="flex-shrink-0"
                  >
                    {exporting === option.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Project Summary */}
        <Card className="mt-8 border-border">
          <CardHeader>
            <CardTitle>Project Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Chapters</p>
                <p className="text-2xl font-bold text-foreground">{project.chapters.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Words</p>
                <p className="text-2xl font-bold text-foreground">{project.meta.wordCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Characters</p>
                <p className="text-2xl font-bold text-foreground">{project.characters.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Messages</p>
                <p className="text-2xl font-bold text-foreground">{project.aiHistory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
