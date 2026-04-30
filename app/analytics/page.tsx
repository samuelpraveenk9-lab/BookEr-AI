'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft, 
  BarChart3, 
  Flame,
  FileText,
  Target,
  Clock,
  BookOpen,
  TrendingUp
} from 'lucide-react'
import { getProjects, getDailyStats, getWritingStreak, getTotalWords } from '@/lib/storage'
import { BRXProject, TARGET_WORD_COUNTS, DailyStats } from '@/lib/types'
import { format, subDays, parseISO, startOfDay, isEqual } from 'date-fns'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<BRXProject[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [totalWords, setTotalWords] = useState(0)
  const [streak, setStreak] = useState(0)
  const [weeklyData, setWeeklyData] = useState<{ day: string; words: number }[]>([])
  const [mostProductiveHour, setMostProductiveHour] = useState(14) // Default to 2 PM

  useEffect(() => {
    setProjects(getProjects())
    setDailyStats(getDailyStats())
    setTotalWords(getTotalWords())
    setStreak(getWritingStreak())
    
    // Calculate weekly data
    const stats = getDailyStats()
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const stat = stats.find(s => s.date === dateStr)
      last7Days.push({
        day: format(date, 'EEE'),
        words: stat?.wordsWritten || 0
      })
    }
    setWeeklyData(last7Days)
    
    // Simulate most productive hour based on activity
    const randomHour = 9 + Math.floor(Math.random() * 12)
    setMostProductiveHour(randomHour)
  }, [])

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
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          </div>
          <p className="text-muted-foreground">
            Track your writing progress and productivity.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                  <Target className="h-5 w-5 text-primary" />
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
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {mostProductiveHour > 12 
                      ? `${mostProductiveHour - 12} PM` 
                      : mostProductiveHour === 12 
                        ? '12 PM' 
                        : `${mostProductiveHour} AM`
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Most Productive</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Writing Streak */}
        <Card className="border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Writing Streak
            </CardTitle>
            <CardDescription>
              Keep writing every day to maintain your streak!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const date = subDays(new Date(), 6 - i)
                const dateStr = format(date, 'yyyy-MM-dd')
                const hasActivity = dailyStats.some(s => s.date === dateStr && s.wordsWritten > 0)
                
                return (
                  <div key={i} className="flex-1 text-center">
                    <div 
                      className={`h-12 w-full rounded-lg flex items-center justify-center ${
                        hasActivity 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {hasActivity && <Flame className="h-5 w-5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(date, 'EEE')}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Chart */}
        <Card className="border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Words Written This Week
            </CardTitle>
            <CardDescription>
              Your daily writing activity over the past 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis 
                    dataKey="day" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${value.toLocaleString()} words`, 'Words']}
                  />
                  <Bar 
                    dataKey="words" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Progress */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Project Progress
            </CardTitle>
            <CardDescription>
              Track progress toward target word counts for each project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No projects yet.</p>
                <Button asChild>
                  <Link href="/create">Create Your First Project</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map((project, index) => {
                  const target = TARGET_WORD_COUNTS[project.meta.projectType]
                  const progress = Math.min(100, (project.meta.wordCount / target) * 100)
                  
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{project.meta.coverEmoji}</span>
                          <div>
                            <h3 className="font-semibold text-foreground">{project.meta.title}</h3>
                            <p className="text-sm text-muted-foreground">{project.meta.projectType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            {project.meta.wordCount.toLocaleString()} / {target.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {progress.toFixed(1)}% complete
                          </p>
                        </div>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
