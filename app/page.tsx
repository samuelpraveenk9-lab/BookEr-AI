'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  BookOpen, 
  Sparkles, 
  FileText, 
  Users, 
  Globe, 
  Save, 
  Layers,
  ArrowRight,
  PenTool,
  Wand2,
  Download,
  Quote
} from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI Writing Assistant',
    description: 'Get intelligent suggestions, continue scenes, and improve your prose with AI.'
  },
  {
    icon: FileText,
    title: '.brx Format',
    description: 'Purpose-built file format for fiction authors, storing everything about your book.'
  },
  {
    icon: Layers,
    title: 'Manga Script Support',
    description: 'Format your scripts as panel scripts, perfect for manga and comic creators.'
  },
  {
    icon: Users,
    title: 'Character Builder',
    description: 'Create detailed character profiles with AI-generated traits and backstories.'
  },
  {
    icon: Globe,
    title: 'World Builder',
    description: 'Build rich worlds with locations, factions, magic systems, and more.'
  },
  {
    icon: Save,
    title: 'Auto-Save',
    description: 'Never lose your work with automatic saving every 2 seconds of inactivity.'
  }
]

const steps = [
  {
    number: '01',
    title: 'Create Project',
    description: 'Choose your book type, genre, and set your writing goals.',
    icon: PenTool
  },
  {
    number: '02',
    title: 'Write with AI',
    description: 'Use intelligent AI tools to help you craft your story.',
    icon: Wand2
  },
  {
    number: '03',
    title: 'Export as .brx',
    description: 'Save your complete project with all notes and history.',
    icon: Download
  }
]

const testimonials = [
  {
    quote: "BookEr AI has transformed my writing process. The AI suggestions are incredibly helpful without being intrusive.",
    author: "Sarah Chen",
    role: "Fantasy Author"
  },
  {
    quote: "Finally, a tool that understands manga script formatting. The panel script feature is a game-changer.",
    author: "Kenji Tanaka",
    role: "Manga Creator"
  },
  {
    quote: "The character and world building tools have made my light novel series so much more consistent.",
    author: "Emma Rodriguez",
    role: "Light Novel Writer"
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">BookEr AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Button asChild>
              <Link href="/auth">Get Started</Link>
            </Button>
          </nav>
          <Button asChild className="md:hidden">
            <Link href="/auth">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/10" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-secondary/50 text-secondary-foreground px-4 py-2 rounded-full text-sm mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Creative Writing
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Write Smarter. Tell Better Stories.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty">
              BookEr AI is an intelligent creative writing platform for authors. 
              Write novels, light novels, manga scripts, and more with AI assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="gap-2">
                <Link href="/auth">
                  Start Writing Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">
                  See How It Works
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Write
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed specifically for fiction authors and creative writers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start writing your next masterpiece in three simple steps.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm font-medium text-primary mb-2">{step.number}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Loved by Authors
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what writers are saying about BookEr AI.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author} className="border-border">
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-primary/30 mb-4" />
                  <p className="text-foreground mb-4">{testimonial.quote}</p>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Start Writing?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of authors using BookEr AI to write better stories.
            </p>
            <Button size="lg" asChild className="gap-2">
              <Link href="/auth">
                Get Started for Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="font-bold text-foreground">BookEr AI</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                An intelligent creative writing platform for authors.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link></li>
                <li><Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground">How It Works</Link></li>
                <li><Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">AI Studio</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Documentation</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} BookEr AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
