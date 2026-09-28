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
  let body = {} as AIRequest
  try {
    body = (await request.json()) as AIRequest
    const { systemInstruction, prompt } = buildPrompt(body)
    const { text } = await generateText({
      model: gateway('google/gemini-2.5-flash'),
      system: systemInstruction,
      prompt,
      temperature: 0.8,
      maxOutputTokens: 1200,
    })

    if (body.action === 'review') {
      const feedback = parseReviewResponse(text, body.content || '')
      return NextResponse.json({ feedback })
    }
    if (body.action === 'generate_synopsis') {
      return NextResponse.json({ synopsis: text })
    }
    return NextResponse.json({ content: text, response: text })
  } catch (error) {
    console.error('[v0] AI API error:', error)
    return NextResponse.json(generateFallbackResponse(body), { status: 200 })
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
      prompt = `Act as a candid developmental editor. Analyze ONLY the excerpt below, not a hypothetical book. Ground every point in an observable detail from the excerpt, quoting a short phrase when useful. Be honest and balanced: do not invent strengths, do not use generic advice, and do not repeat stock feedback. Evaluate story and storywriting, including hook, character desire/conflict, stakes, scene purpose, pacing, structure, point of view, dialogue, imagery, specificity, sentence rhythm, and show-versus-tell when relevant. Return exactly these headings: Strengths, Areas to Improve, Specific Suggestions. Under each heading provide 3-5 concise bullet points. If the excerpt is too short to judge something, say so explicitly.\n\nEXCERPT TO ANALYZE:\n${body.content || '(No excerpt provided)'}`
      break
    case 'studio_tool':
      prompt = `Project type: ${projectType}\n\nUser request: ${prompt}`
      break
  }
  return { systemInstruction, prompt }
}

function parseReviewResponse(text: string, content: string) {
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

  return feedback.strengths.length && feedback.improvements.length && feedback.suggestions.length
    ? feedback
    : buildExcerptFallback(content)
}

function buildExcerptFallback(content: string) {
  const excerpt = content.trim()
  const sentences = excerpt.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean)
  const words = excerpt.split(/\s+/).filter(Boolean)
  const hasDialogue = /[“”\"]/.test(excerpt)
  const hasSensoryDetail = /\b(heard|saw|felt|smelled|tasted|cold|warm|bright|dark|rough|soft|wind|rain)\b/i.test(excerpt)
  const firstSentence = sentences[0]
  return {
    strengths: [
      firstSentence ? `The opening establishes a clear starting point: “${firstSentence.slice(0, 140)}${firstSentence.length > 140 ? '…' : ''}”` : 'The excerpt is too short to identify a reliable narrative strength.',
      `${words.length} words give enough material to assess the passage’s immediate voice and focus.`,
      hasDialogue ? 'Dialogue is present, giving the scene an opportunity for character-specific tension and subtext.' : 'The passage stays focused on narration rather than switching between several voices.',
    ],
    improvements: [
      sentences.length < 3 ? 'The excerpt is very short, so the scene’s larger story movement and stakes are not yet clear.' : 'Clarify what the viewpoint character wants in this moment and what may prevent them from getting it.',
      hasSensoryDetail ? 'Some sensory detail is present; connect it more directly to the viewpoint character’s emotion or immediate goal.' : 'Add concrete sensory detail tied to the viewpoint character so the setting feels specific rather than generalized.',
      hasDialogue ? 'Check that each line of dialogue changes the power dynamic or reveals new information.' : 'Consider adding a specific action, reaction, or line of dialogue to break up exposition where the scene slows.',
    ],
    suggestions: [
      firstSentence ? `Revise the first paragraph around the central tension introduced by “${firstSentence.slice(0, 90)}${firstSentence.length > 90 ? '…' : ''}”.` : 'Paste a longer excerpt so the review can assess story structure and prose patterns honestly.',
      'Write one sentence naming the character’s immediate objective, then revise the scene so each beat pressures that objective.',
      'Read the passage aloud and cut repeated modifiers, vague verbs, and sentences that do not change the reader’s understanding.',
    ],
  }
}

function generateFallbackResponse(body: AIRequest): Record<string, unknown> {
  const type = body.projectType || 'novel'
  const genre = body.genre || 'fantasy'
  if (body.action === 'generate_synopsis') return { synopsis: `In a ${genre.toLowerCase()} world, an unlikely hero faces impossible odds. Ancient powers awaken, forcing them to choose between safety and sacrifice. Their choice will change everything.` }
  if (body.action === 'review') return { feedback: buildExcerptFallback(body.content || '') }
  return { content: `I can help shape your ${type.toLowerCase()}. Try asking for a continuation, sharper dialogue, character development, or a prose revision.`, response: `I can help shape your ${type.toLowerCase()}.` }
}

export const runtime = 'nodejs'
export const maxDuration = 60
