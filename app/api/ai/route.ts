import { generateText, gateway } from 'ai'
import { NextRequest, NextResponse } from 'next/server'

interface AIRequest {
  action: string
  prompt?: string
  content?: string
  context?: string
  title?: string
  projectType?: string
  genre?: string
  history?: Array<{ role: string; content: string }>
  field?: string
  characterName?: string
  role?: string
  existingData?: Record<string, string>
  section?: string
  existingNotes?: Record<string, string>
  worldNotes?: Record<string, string>
  toolId?: string
  systemPrompt?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AIRequest
    const { systemInstruction, prompt } = buildPrompt(body)
    const { text } = await generateText({
      model: gateway('google/gemini-2.5-flash'),
      system: systemInstruction,
      prompt,
      temperature: 0.8,
      maxOutputTokens: 1200,
    })

    if (body.action === 'review') {
      return NextResponse.json({ feedback: parseReviewResponse(text) })
    }
    if (body.action === 'generate_synopsis') {
      return NextResponse.json({ synopsis: text })
    }
    return NextResponse.json({ content: text, response: text })
  } catch (error) {
    console.error('[v0] AI API error:', error)
    return NextResponse.json(generateFallbackResponse({} as AIRequest), { status: 200 })
  }
}

function buildPrompt(body: AIRequest) {
  const projectType = body.projectType || 'Novel'
  const genre = body.genre || 'Fantasy'
  let systemInstruction = body.systemPrompt || `You are a creative writing assistant for a ${projectType} in the ${genre} genre. Be concise, specific, and useful.`
  let prompt = body.prompt || ''

  switch (body.action) {
    case 'generate_synopsis':
      systemInstruction = 'You are a book marketing editor.'
      prompt = `Write a compelling 3-sentence back-cover blurb for a ${projectType} titled "${body.title || 'Untitled'}" in the ${genre} genre.`
      break
    case 'chat':
      prompt = `Current chapter content:\n${body.context || '(empty)'}\n\nAuthor request: ${prompt}`
      break
    case 'generate_character_field':
      prompt = `Generate the ${body.field} for ${body.characterName}, a ${body.role}. Keep it to 2-3 evocative sentences. Existing info: ${JSON.stringify(body.existingData || {})}`
      break
    case 'generate_world_content':
      prompt = `Develop the ${body.section} section for "${body.title || 'Untitled'}". Existing notes: ${JSON.stringify(body.existingNotes || {})}`
      break
    case 'world_building_chat':
      prompt = `World notes: ${JSON.stringify(body.worldNotes || {})}\nQuestion: ${prompt}`
      break
    case 'review':
      prompt = `Review this ${projectType} excerpt in the ${genre} genre. Return sections titled Strengths, Areas to Improve, and Specific Suggestions, with 3-5 bullet points each.\n\n${body.content || ''}`
      break
    case 'studio_tool':
      prompt = `Project type: ${projectType}\n\nUser request: ${prompt}`
      break
  }
  return { systemInstruction, prompt }
}

function parseReviewResponse(text: string) {
  const sections = text.split(/(?:^|\n)\s*(?:#{1,3}\s*)?(Strengths|Areas to Improve|Specific Suggestions|Suggestions)\s*:?.*/i)
  const points = (value: string) => value.split(/\n/).map((line) => line.replace(/^\s*[-*•]\s*/, '').trim()).filter((line) => line.length > 10).slice(0, 5)
  return {
    strengths: points(sections[2] || ''),
    improvements: points(sections[4] || ''),
    suggestions: points(sections[6] || ''),
  }
}

function generateFallbackResponse(body: AIRequest): Record<string, unknown> {
  const type = body.projectType || 'novel'
  const genre = body.genre || 'fantasy'
  if (body.action === 'generate_synopsis') return { synopsis: `In a ${genre.toLowerCase()} world, an unlikely hero faces impossible odds. Ancient powers awaken, forcing them to choose between safety and sacrifice. Their choice will change everything.` }
  if (body.action === 'review') return { feedback: { strengths: ['The voice is engaging and clear.', 'The premise creates immediate curiosity.'], improvements: ['Vary sentence rhythm for a smoother pace.', 'Add sensory detail at key moments.'], suggestions: ['Read the passage aloud.', 'Strengthen the scene objective.'] } }
  return { content: `I can help shape your ${type.toLowerCase()}. Try asking for a continuation, sharper dialogue, character development, or a prose revision.`, response: `I can help shape your ${type.toLowerCase()}.` }
}

export const runtime = 'nodejs'
export const maxDuration = 60
