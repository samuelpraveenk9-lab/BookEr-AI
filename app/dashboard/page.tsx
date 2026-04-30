'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  Layers, 
  Flame,
  FileText,
  Clock,
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  BookOpen,
  Menu,
  X
} from 'lucide-react'
import { getProjects, getUser, getTotalWords, getWritingStreak, logoutUser } from '@/lib/storage'
import { BRXProject, TARGET_WORD_COUNTS } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: FolderOpen, label: 'Projects', href: '/dashboard' },
  { icon: Sparkles, label: 'AI Studio', href: '/studio' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<BRXProject[]>([])
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [totalWords, setTotalWords] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const userData = getUser()
    if (!userData?.isLoggedIn) {
      router.push('/auth')
      return
    }
    setUser(userData)
    setProjects(getProjects())
    setTotalWords(getTotalWords())
    setStreak(getWritingStreak())
  }, [router])

  const handleLogout = () => {
    logoutUser()
    router.push('/')
  }

  const getProgressPercent = (project: BRXProject) => {
    const target = TARGET_WORD_COUNTS[project.meta.projectType]
    return Math.min(100, (project.meta.wordCount / target) * 100)
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-bold text-sidebar-foreground">BookEr AI</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                  transition-colors
                  ${item.href === '/dashboard' 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Welcome back, {user?.name || 'Author'}!
                </h1>
                <p className="text-sm text-muted-foreground">
                  {"Let's write something amazing today."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href="/create" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Book Project</span>
                  <span className="sm:hidden">New</span>
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/create?type=series" className="gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">New Series</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalWords.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Words</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{projects.length}</p>
                    <p className="text-sm text-muted-foreground">Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Flame className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{streak}</p>
                    <p className="text-sm text-muted-foreground">Day Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{Math.round(totalWords / 200)}</p>
                    <p className="text-sm text-muted-foreground">Min Read Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Your Projects</h2>
            {projects.length === 0 ? (
              <Card className="border-border border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first book project to get started.</p>
                  <Button asChild>
                    <Link href="/create">Create Your First Project</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project, index) => (
                  <Link key={index} href={`/editor/${index}`}>
                    <Card className="border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="text-4xl mb-2">{project.meta.coverEmoji}</div>
                          <Badge variant="secondary">{project.meta.projectType}</Badge>
                        </div>
                        <CardTitle className="text-lg">{project.meta.title}</CardTitle>
                        <CardDescription>{project.meta.genre}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {project.meta.wordCount.toLocaleString()} words
                            </span>
                            <span className="text-muted-foreground">
                              {project.chapters.length} chapter{project.chapters.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <Progress value={getProgressPercent(project)} className="h-2" />
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Edited {formatDistanceToNow(new Date(project.meta.updatedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
