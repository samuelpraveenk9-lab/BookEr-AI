'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { 
  ArrowLeft, 
  Settings,
  User,
  PenTool,
  Sparkles,
  Download,
  Shield,
  BookOpen,
  Save,
  Trash2
} from 'lucide-react'
import { getSettings, saveSettings, getUser, logoutUser } from '@/lib/storage'
import { UserSettings } from '@/lib/types'
import { toast } from 'sonner'

const AVATAR_EMOJIS = ['✍️', '📝', '🖋️', '📚', '📖', '🎭', '🌟', '⭐', '🔮', '👑', '🧙', '🐉', '🦊', '🦄', '💜', '🌸']

export default function SettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user?.isLoggedIn) {
      router.push('/auth')
      return
    }
    setSettings(getSettings())
  }, [router])

  const updateSettings = (section: keyof UserSettings, field: string, value: unknown) => {
    if (!settings) return
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value
      }
    })
  }

  const handleSave = async (section: string) => {
    if (!settings) return
    setIsSaving(true)
    
    await new Promise(resolve => setTimeout(resolve, 500))
    saveSettings(settings)
    
    setIsSaving(false)
    toast.success(`${section} settings saved`)
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      logoutUser()
      localStorage.clear()
      router.push('/')
      toast.success('Account deleted')
    }
  }

  if (!settings) {
    return null
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Customize your BookEr AI experience.
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Avatar</Label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`text-2xl p-2 rounded-lg transition-colors ${
                        settings.profile.avatar === emoji 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted hover:bg-secondary'
                      }`}
                      onClick={() => updateSettings('profile', 'avatar', emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={settings.profile.name}
                  onChange={(e) => updateSettings('profile', 'name', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.profile.email}
                  onChange={(e) => updateSettings('profile', 'email', e.target.value)}
                />
              </div>
              
              <Button onClick={() => handleSave('Profile')} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                Save Profile
              </Button>
            </CardContent>
          </Card>

          {/* Writing Preferences */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Writing Preferences
              </CardTitle>
              <CardDescription>Customize your writing environment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Font</Label>
                <Select 
                  value={settings.writing.defaultFont}
                  onValueChange={(v) => updateSettings('writing', 'defaultFont', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lora">Lora (Serif)</SelectItem>
                    <SelectItem value="Georgia">Georgia (Serif)</SelectItem>
                    <SelectItem value="Geist">Geist (Sans)</SelectItem>
                    <SelectItem value="Inter">Inter (Sans)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Default Font Size: {settings.writing.defaultFontSize}px</Label>
                <Slider
                  value={[settings.writing.defaultFontSize]}
                  onValueChange={([v]) => updateSettings('writing', 'defaultFontSize', v)}
                  min={14}
                  max={24}
                  step={1}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Line Height: {settings.writing.lineHeight}</Label>
                <Slider
                  value={[settings.writing.lineHeight * 10]}
                  onValueChange={([v]) => updateSettings('writing', 'lineHeight', v / 10)}
                  min={14}
                  max={24}
                  step={1}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select 
                  value={settings.writing.theme}
                  onValueChange={(v) => updateSettings('writing', 'theme', v as 'light' | 'dark' | 'sepia')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="sepia">Sepia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={() => handleSave('Writing')} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                Save Writing Preferences
              </Button>
            </CardContent>
          </Card>

          {/* AI Preferences */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Preferences
              </CardTitle>
              <CardDescription>Configure AI assistant behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Response Length</Label>
                <Select 
                  value={settings.ai.responseLength}
                  onValueChange={(v) => updateSettings('ai', 'responseLength', v as 'short' | 'medium' | 'long')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (1-2 paragraphs)</SelectItem>
                    <SelectItem value="medium">Medium (3-4 paragraphs)</SelectItem>
                    <SelectItem value="long">Long (5+ paragraphs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Writing Style</Label>
                <Select 
                  value={settings.ai.writingStyle}
                  onValueChange={(v) => updateSettings('ai', 'writingStyle', v as 'literary' | 'casual' | 'genre-specific')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="literary">Literary</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="genre-specific">Genre-Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={() => handleSave('AI')} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                Save AI Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Export Defaults */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Defaults
              </CardTitle>
              <CardDescription>Default export settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Export Format</Label>
                <Select 
                  value={settings.export.defaultFormat}
                  onValueChange={(v) => updateSettings('export', 'defaultFormat', v as 'brx' | 'txt' | 'pdf')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brx">.brx (BookEr Format)</SelectItem>
                    <SelectItem value="txt">.txt (Plain Text)</SelectItem>
                    <SelectItem value="pdf">.pdf (Print/PDF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Include AI History in .brx</Label>
                  <p className="text-sm text-muted-foreground">Save AI conversation history with exports</p>
                </div>
                <Switch
                  checked={settings.export.includeAIHistory}
                  onCheckedChange={(v) => updateSettings('export', 'includeAIHistory', v)}
                />
              </div>
              
              <Button onClick={() => handleSave('Export')} disabled={isSaving} className="gap-2">
                <Save className="h-4 w-4" />
                Save Export Defaults
              </Button>
            </CardContent>
          </Card>

          {/* Account */}
          <Card className="border-border border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Change Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                />
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast.success('Password updated')}>
                  Update Password
                </Button>
              </div>
              
              <div className="border-t border-border pt-4 mt-4">
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  This will permanently delete your account and all your projects.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
