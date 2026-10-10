'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, Mail, Phone, Chrome } from 'lucide-react'
import { signInWithPassword, signUpWithPassword, startGoogleOAuth } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    setAuthNotice('')
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const identifier = String(formData.get(authMethod === 'email' ? 'email' : 'phone') || '').trim()
    const password = String(formData.get('password') || '')
    try {
      await signInWithPassword(identifier, password, authMethod)
      router.replace('/dashboard')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthError('')
    setAuthNotice('')
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const identifier = String(formData.get(authMethod === 'email' ? 'email' : 'phone') || '').trim()
    const password = String(formData.get('password') || '')
    if (password.length < 8) {
      setAuthError('Use a password with at least 8 characters.')
      setIsLoading(false)
      return
    }
    try {
      const result = await signUpWithPassword(identifier, password, name, authMethod)
      if (result.access_token && result.user?.id) router.replace('/dashboard')
      else setAuthNotice(authMethod === 'email'
        ? 'Account created. Check your email to confirm the account, then sign in.'
        : 'Account request submitted. Complete the phone verification configured in Supabase, then sign in.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Account creation failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = () => {
    setAuthError('')
    try { startGoogleOAuth() }
    catch (error) { setAuthError(error instanceof Error ? error.message : 'Google sign-in could not be started.') }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Card className="w-full max-w-md relative z-10 border-border shadow-lg">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">BookEr AI</span>
          </Link>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to continue writing your stories</CardDescription>
        </CardHeader>
        <CardContent>
          {authError && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{authError}</p>}
          {authNotice && <p role="status" className="mb-4 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{authNotice}</p>}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Auth method toggle */}
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={authMethod === 'email' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setAuthMethod('email')}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={authMethod === 'phone' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setAuthMethod('phone')}
                  >
                    <Phone className="h-4 w-4" />
                    Phone
                  </Button>
                </div>

                {authMethod === 'email' ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Your name"
                    required
                  />
                </div>

                {/* Auth method toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={authMethod === 'email' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setAuthMethod('email')}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={authMethod === 'phone' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => setAuthMethod('phone')}
                  >
                    <Phone className="h-4 w-4" />
                    Phone
                  </Button>
                </div>

                {authMethod === 'email' ? (
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone Number</Label>
                    <Input
                      id="reg-phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-4 gap-2"
                onClick={handleGoogleAuth}
                disabled={isLoading}
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
