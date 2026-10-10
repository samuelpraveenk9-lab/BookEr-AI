import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const MAX_PROMPT_LENGTH = 4000
const MAX_CONTEXT_LENGTH = 24000
const MAX_REVIEW_LENGTH = 30000

const aiRequestSchema = z.object({
  action: z.enum(['chat', 'review', 'generate_synopsis', 'generate_character_field', 'generate_world_content', 'world_building_chat', 'studio_tool']),
  prompt: z.string().trim().max(MAX_PROMPT_LENGTH).optional(),
  content: z.string().max(MAX_REVIEW_LENGTH).optional(),
  context: z.string().max(MAX_CONTEXT_LENGTH).optional(),
  title: z.string().trim().max(200).optional(),
  projectType: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(80).optional(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(MAX_PROMPT_LENGTH) })).max(12).optional(),
  field: z.string().trim().max(80).optional(),
  characterName: z.string().trim().max(120).optional(),
  role: z.string().trim().max(80).optional(),
  existingData: z.record(z.string().max(2000)).optional(),
  section: z.string().trim().max(80).optional(),
  existingNotes: z.record(z.string().max(4000)).optional(),
  worldNotes: z.record(z.string().max(4000)).optional(),
  toolId: z.string().trim().max(80).optional(),
  responseLength: z.enum(['short', 'medium', 'long']).optional(),
  writingStyle: z.enum(['literary', 'casual', 'genre-specific']).optional(),
  requestId: z.string().uuid().optional(),
  systemPrompt: z.string().trim().max(2000).optional(),
})

type AIRequest = z.infer<typeof aiRequestSchema>

export async function POST(request: NextRequest) {
  let body = {} as AIRequest
  try {
    const authorization = request.headers.get('authorization') || ''
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!accessToken) return NextResponse.json({ error: 'Sign in to use AI features.' }, { status: 401 })
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: 'Authentication service is not configured.' }, { status: 503 })
    let authResponse: Response
    try {
      authResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      })
    } catch {
      return NextResponse.json({ error: 'Could not verify your session. Try again.' }, { status: 503 })
    }
    if (!authResponse.ok) return NextResponse.json({ error: 'Your session is invalid or expired. Sign in again.' }, { status: 401 })

    const parsed = aiRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid AI request', details: parsed.error.flatten() }, { status: 400 })
    }
    body = parsed.data
    const { systemInstruction, prompt } = buildPrompt(body)
    const requestContext = body.requestId ? `\nThis is a fresh request (${body.requestId}). Do not repeat prior wording; generate a new response grounded in the user’s exact request and context.` : ''
    const responseTokens = body.responseLength === 'short' ? 700 : body.responseLength === 'long' ? 1800 : 1200
    const styleInstruction = body.writingStyle === 'casual'
      ? ' Use clear, conversational language.'
      : body.writingStyle === 'genre-specific'
        ? ` Lean into recognizable ${body.genre || 'genre'} conventions without using clichés.`
        : ' Use precise, literary language when appropriate.'
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service is not configured. Add OPENAI_API_KEY to the server environment.' },
        { status: 503 },
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 50_000)
    let openAIResponse: Response
    try {
      openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `${systemInstruction}${styleInstruction}${requestContext}` },
            { role: 'user', content: prompt },
          ],
          temperature: 0.8,
          max_tokens: responseTokens,
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json({ error: 'The AI request took too long. Try a shorter prompt or less context.' }, { status: 504 })
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }

    if (!openAIResponse.ok) {
      const status = openAIResponse.status
      console.error('[BookEr AI] OpenAI request failed with status:', status)
      if (status === 401) {
        return NextResponse.json({ error: 'AI service credentials are invalid. Check OPENAI_API_KEY.' }, { status: 503 })
      }
      if (status === 429) {
        return NextResponse.json({ error: 'AI service rate limit or quota reached. Check your OpenAI usage and billing.' }, { status: 429 })
      }
      return NextResponse.json({ error: 'AI service request failed. Please try again later.' }, { status: 502 })
    }

    const result = await openAIResponse.json() as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    const text = result.choices?.[0]?.message?.content?.trim()
    if (!text) {
      return NextResponse.json({ error: 'AI service returned an empty response. Please try again.' }, { status: 502 })
    }

    if (body.action === 'review') {
      const feedback = parseReviewResponse(text)
      if (!feedback) return NextResponse.json({ error: 'The AI review format was invalid. Please retry the review.' }, { status: 502 })
      return NextResponse.json({ feedback })
    }
    if (body.action === 'generate_synopsis') {
      return NextResponse.json({ synopsis: text })
    }
    return NextResponse.json({ content: text, response: text })
  } catch (error) {
    console.error('[v0] AI API error:', error)
    return NextResponse.json({ error: 'AI service unavailable. Please try again.' }, { status: 502 })
  }
}

function buildPrompt(body: AIRequest) {
  const projectType = body.projectType || 'Novel'
  const genre = body.genre || 'Fantasy'
  let systemInstruction = `You are a creative writing assistant for a ${projectType} in the ${genre} genre. Be concise, specific, and useful.`
  let prompt = body.prompt || ''

  switch (body.action) {
    case 'generate_synopsis':
      systemInstruction = 'You are a book marketing editor.'
      prompt = `Write a compelling 3-sentence back-cover blurb for a ${projectType} titled "${body.title || 'Untitled'}" in the ${genre} genre.`
      break
    case 'chat':
      prompt = `Conversation history:\n${formatHistory(body.history)}\n\nCurrent chapter content:\n${body.context || '(empty)'}\n\nAuthor request:\n${prompt}`
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
      prompt = `Act as a candid developmental editor. Analyze ONLY the excerpt below, not a hypothetical book. Ground every point in an observable detail from the excerpt, quoting a short phrase when useful. Be honest and balanced: do not invent strengths, do not use generic advice, and do not repeat stock feedback. Evaluate story and storywriting, including hook, character desire/conflict, stakes, scene purpose, pacing, structure, point of view, dialogue, imagery, specificity, sentence rhythm, and show-versus-tell when relevant. Return exactly these headings: Strengths, Areas to Improve, Specific Suggestions. Under each heading provide 3-5 concise bullet points. If the excerpt is too short to judge something, say so explicitly.\n\nEXCERPT TO ANALYZE:\n${body.content || '(No excerpt provided)'}`
      break
    case 'studio_tool':
      if (body.systemPrompt) systemInstruction = `${systemInstruction}\n\nTool-specific instructions: ${body.systemPrompt}`
      prompt = `Project type: ${projectType}\nGenre: ${genre}\n\nUser request: ${prompt}`
      break
  }
  return { systemInstruction, prompt }
}

function parseReviewResponse(text: string): { strengths: string[]; improvements: string[]; suggestions: string[] } | null {
  const normalized = text.replace(/\r/g, '')
  const sectionPattern = /(?:^|\n)\s*(?:#{1,3}\s*)?(Strengths|Areas to Improve|Specific Suggestions|Suggestions)\s*:?[ \t]*\n?/gi
  const matches = [...normalized.matchAll(sectionPattern)]
  const sections: Record<string, string> = {}

  matches.forEach((match, index) => {
    const key = match[1].toLowerCase()
    const start = (match.index || 0) + match[0].length
    const end = matches[index + 1]?.index ?? normalized.length
    sections[key] = normalized.slice(start, end)
  })

  const points = (value: string | undefined) => (value || '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length > 10)
    .slice(0, 5)

  const feedback = {
    strengths: points(sections['strengths']),
    improvements: points(sections['areas to improve']),
    suggestions: points(sections['specific suggestions'] || sections['suggestions']),
  }

  return feedback.strengths.length && feedback.improvements.length && feedback.suggestions.length ? feedback : null
}

function formatHistory(history: AIRequest['history']) {
  return (history || []).slice(-8).map((message) => `${message.role}: ${message.content}`).join('\n') || '(none)'
}

export const runtime = 'nodejs'
export const maxDuration = 60
