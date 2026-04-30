'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Plus, Sparkles, Pencil, Trash2, Loader2 } from 'lucide-react'
import { BRXProject, Character, CHARACTER_ROLES, CharacterRole, COVER_EMOJIS } from '@/lib/types'

interface CharacterManagerProps {
  project: BRXProject
  onUpdateProject: (project: BRXProject) => void
}

const CHARACTER_EMOJIS = ['👤', '👩', '👨', '👧', '👦', '🧑', '👴', '👵', '🧙', '🧛', '🧜', '🧚', '🦊', '🐺', '🐉', '👻', '🤖', '👽', '👑', '🦸']

export default function CharacterManager({ project, onUpdateProject }: CharacterManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  
  // Form state
  const [avatar, setAvatar] = useState('👤')
  const [name, setName] = useState('')
  const [role, setRole] = useState<CharacterRole>('Supporting')
  const [age, setAge] = useState('')
  const [appearance, setAppearance] = useState('')
  const [personality, setPersonality] = useState('')
  const [backstory, setBackstory] = useState('')
  const [goals, setGoals] = useState('')
  const [flaws, setFlaws] = useState('')

  const resetForm = () => {
    setAvatar('👤')
    setName('')
    setRole('Supporting')
    setAge('')
    setAppearance('')
    setPersonality('')
    setBackstory('')
    setGoals('')
    setFlaws('')
    setEditingCharacter(null)
  }

  const openDialog = (character?: Character) => {
    if (character) {
      setEditingCharacter(character)
      setAvatar(character.avatar)
      setName(character.name)
      setRole(character.role)
      setAge(character.age)
      setAppearance(character.appearance)
      setPersonality(character.personality)
      setBackstory(character.backstory)
      setGoals(character.goals)
      setFlaws(character.flaws)
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    const character: Character = {
      id: editingCharacter?.id || crypto.randomUUID(),
      avatar,
      name,
      role,
      age,
      appearance,
      personality,
      backstory,
      goals,
      flaws
    }
    
    let updatedCharacters: Character[]
    if (editingCharacter) {
      updatedCharacters = project.characters.map(c => 
        c.id === editingCharacter.id ? character : c
      )
    } else {
      updatedCharacters = [...project.characters, character]
    }
    
    onUpdateProject({
      ...project,
      characters: updatedCharacters
    })
    
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    onUpdateProject({
      ...project,
      characters: project.characters.filter(c => c.id !== id)
    })
  }

  const generateField = async (field: string) => {
    if (!name) return
    
    setIsGenerating(field)
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_character_field',
          field,
          characterName: name,
          role,
          projectType: project.meta.projectType,
          genre: project.meta.genre,
          existingData: { appearance, personality, backstory, goals, flaws }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const content = data.content || data[field] || ''
        
        switch (field) {
          case 'appearance': setAppearance(content); break
          case 'personality': setPersonality(content); break
          case 'backstory': setBackstory(content); break
          case 'goals': setGoals(content); break
          case 'flaws': setFlaws(content); break
        }
      } else {
        // Fallback generation
        const fallback = generateFallbackCharacterField(field, name, role, project.meta.genre)
        switch (field) {
          case 'appearance': setAppearance(fallback); break
          case 'personality': setPersonality(fallback); break
          case 'backstory': setBackstory(fallback); break
          case 'goals': setGoals(fallback); break
          case 'flaws': setFlaws(fallback); break
        }
      }
    } catch (error) {
      console.log('[v0] Character field generation error:', error)
      const fallback = generateFallbackCharacterField(field, name, role, project.meta.genre)
      switch (field) {
        case 'appearance': setAppearance(fallback); break
        case 'personality': setPersonality(fallback); break
        case 'backstory': setBackstory(fallback); break
        case 'goals': setGoals(fallback); break
        case 'flaws': setFlaws(fallback); break
      }
    }
    
    setIsGenerating(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Characters</h2>
          <p className="text-muted-foreground">Manage your story&apos;s characters</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Character
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCharacter ? 'Edit Character' : 'Add Character'}</DialogTitle>
              <DialogDescription>
                Create a detailed character profile for your story.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="grid grid-cols-5 gap-1 p-2 bg-muted rounded-lg">
                    {CHARACTER_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`text-2xl p-1 rounded transition-colors ${
                          avatar === emoji ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                        }`}
                        onClick={() => setAvatar(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Character name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={role} onValueChange={(v) => setRole(v as CharacterRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHARACTER_ROLES.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g., 25, Ancient, Unknown"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {[
                { field: 'appearance', label: 'Appearance', value: appearance, setter: setAppearance },
                { field: 'personality', label: 'Personality', value: personality, setter: setPersonality },
                { field: 'backstory', label: 'Backstory', value: backstory, setter: setBackstory },
                { field: 'goals', label: 'Goals', value: goals, setter: setGoals },
                { field: 'flaws', label: 'Flaws', value: flaws, setter: setFlaws }
              ].map(({ field, label, value, setter }) => (
                <div key={field} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => generateField(field)}
                      disabled={!name || isGenerating === field}
                    >
                      {isGenerating === field ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI Generate
                    </Button>
                  </div>
                  <Textarea
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={`Describe the character's ${label.toLowerCase()}...`}
                    rows={3}
                  />
                </div>
              ))}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!name}>
                  {editingCharacter ? 'Save Changes' : 'Add Character'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {project.characters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No characters yet</h3>
            <p className="text-muted-foreground mb-4">Add characters to bring your story to life.</p>
            <Button onClick={() => openDialog()}>Add Your First Character</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.characters.map((character) => (
            <Card key={character.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{character.avatar}</div>
                    <div>
                      <CardTitle className="text-lg">{character.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">{character.role}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(character)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(character.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {character.age && (
                  <p className="text-sm text-muted-foreground mb-2">Age: {character.age}</p>
                )}
                {character.personality && (
                  <p className="text-sm text-foreground line-clamp-3">{character.personality}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function generateFallbackCharacterField(field: string, name: string, role: string, genre: string): string {
  const templates: Record<string, string> = {
    appearance: `${name} has a distinctive presence that immediately draws attention. Their features reflect their ${role.toLowerCase()} nature in this ${genre.toLowerCase()} tale—eyes that hold untold stories, a bearing that speaks of their journey, and subtle details that hint at their true character.`,
    personality: `${name} possesses a complex personality befitting a ${role.toLowerCase()}. They are driven yet contemplative, strong yet vulnerable. Their interactions with others reveal layers of depth, shaped by experiences both triumphant and tragic.`,
    backstory: `${name}'s past is woven with threads of both light and shadow. Born into circumstances that would shape their destiny, they faced challenges that forged their character. Key moments from their history continue to influence their present choices.`,
    goals: `${name} seeks to fulfill a purpose greater than themselves. Their immediate objectives serve a larger vision—one that drives them forward through every obstacle. What they truly desire may not always align with what they pursue.`,
    flaws: `Despite their strengths, ${name} struggles with inner demons. Their greatest weakness often stems from their greatest strength taken too far. These imperfections make them human and create tension in their relationships.`
  }
  
  return templates[field] || `Details about ${name}'s ${field} in this ${genre.toLowerCase()} story.`
}
