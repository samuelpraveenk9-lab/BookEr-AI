import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

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
    const body: AIRequest = await request.json()
    const { action } = body

    // If no API key, return helpful fallback responses
    if (!GEMINI_API_KEY) {
      return NextResponse.json(generateFallbackResponse(body))
    }

    // Build the prompt based on action
    let prompt = ''
    let systemInstruction = ''

    switch (action) {
      case 'generate_synopsis':
        systemInstruction = 'You are a creative writing assistant specialized in book marketing. Generate compelling, professional back-cover blurbs.'
        prompt = `Generate a 3-sentence back-cover blurb for a ${body.projectType} titled "${body.title}" in the ${body.genre} genre. Make it compelling and hook readers.`
        break

      case 'chat':
        systemInstruction = `You are a creative writing assistant for a ${body.projectType} in the ${body.genre} genre. Help the author with their writing. Be helpful, creative, and match the tone of their work.`
        prompt = body.prompt || ''
        if (body.context) {
          prompt = `Current chapter content:\n${body.context}\n\nUser request: ${prompt}`
        }
        break

      case 'generate_character_field':
        systemInstruction = `You are a character development expert for ${body.projectType} in the ${body.genre} genre.`
        prompt = `Generate the ${body.field} for a character named "${body.characterName}" who is a ${body.role}. Keep it concise (2-3 sentences) but evocative. Existing character info: ${JSON.stringify(body.existingData)}`
        break

      case 'generate_world_content':
        systemInstruction = `You are a world-building expert for ${body.projectType} in the ${body.genre} genre.`
        prompt = `Generate content for the "${body.section}" section of world-building for a story titled "${body.title}". Keep it detailed but organized. Existing world notes: ${JSON.stringify(body.existingNotes)}`
        break

      case 'world_building_chat':
        systemInstruction = `You are a world-building consultant for ${body.projectType} in the ${body.genre} genre. Help develop the story's world.`
        prompt = `World notes so far: ${JSON.stringify(body.worldNotes)}\n\nUser question: ${body.prompt}`
        break

      case 'review':
        systemInstruction = 'You are a professional editor providing constructive feedback on creative writing.'
        prompt = `Review the following ${body.projectType} excerpt in the ${body.genre} genre. Provide structured feedback with: 1) Strengths (3-4 points), 2) Areas to Improve (3-4 points), 3) Specific Suggestions (4-5 actionable items). Be constructive and encouraging.\n\nContent:\n${body.content}`
        break

      case 'studio_tool':
        systemInstruction = body.systemPrompt || 'You are a creative writing assistant.'
        prompt = `Project type: ${body.projectType}\n\nUser request: ${body.prompt}`
        break

      default:
        return NextResponse.json(generateFallbackResponse(body))
    }

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024,
          }
        })
      }
    )

    if (!response.ok) {
      console.error('[v0] Gemini API error:', response.status)
      return NextResponse.json(generateFallbackResponse(body))
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse response based on action
    if (action === 'review') {
      const feedback = parseReviewResponse(generatedText)
      return NextResponse.json({ feedback })
    }

    if (action === 'generate_synopsis') {
      return NextResponse.json({ synopsis: generatedText })
    }

    return NextResponse.json({ content: generatedText, response: generatedText })

  } catch (error) {
    console.error('[v0] AI API error:', error)
    return NextResponse.json(
      { error: 'AI service temporarily unavailable', ...generateFallbackResponse({} as AIRequest) },
      { status: 200 }
    )
  }
}

function parseReviewResponse(text: string): { strengths: string[]; improvements: string[]; suggestions: string[] } {
  // Simple parsing - extract bullet points from each section
  const sections = text.split(/\d+\)|#{1,3}|Strengths|Areas|Suggestions|Improve/i)
  
  const extractPoints = (section: string): string[] => {
    return section
      .split(/[-•*\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && s.length < 500)
      .slice(0, 5)
  }

  // If parsing fails, return generic feedback
  if (sections.length < 3) {
    return {
      strengths: ['Your writing shows promise and creativity.', 'The narrative voice is engaging.', 'Good use of descriptive language.'],
      improvements: ['Consider varying sentence structure more.', 'Some passages could use more sensory details.', 'Dialogue tags could be more varied.'],
      suggestions: ['Read passages aloud to check flow.', 'Add more internal character thoughts.', 'Consider deepening secondary characters.']
    }
  }

  return {
    strengths: extractPoints(sections[1] || '').slice(0, 4),
    improvements: extractPoints(sections[2] || '').slice(0, 4),
    suggestions: extractPoints(sections[3] || '').slice(0, 5)
  }
}

function generateFallbackResponse(body: AIRequest): Record<string, unknown> {
  const { action, projectType = 'Novel', genre = 'Fantasy', title = 'Untitled' } = body

  switch (action) {
    case 'generate_synopsis':
      return {
        synopsis: `In a world where ${genre.toLowerCase()} comes alive, ${title} tells the story of an unlikely hero facing impossible odds. When ancient powers awaken and threaten everything they hold dear, only courage and determination can save the day. This ${projectType.toLowerCase()} will captivate readers from the very first page.`
      }

    case 'review':
      return {
        feedback: {
          strengths: [
            'Your narrative voice is engaging and pulls readers into the story.',
            'The pacing maintains reader interest with well-timed developments.',
            `Your ${genre.toLowerCase()} elements feel authentic and well-crafted.`,
            'Character interactions drive the plot forward effectively.'
          ],
          improvements: [
            'Consider varying sentence structure more for rhythm.',
            'Some passages could benefit from additional sensory details.',
            'A few transitions between scenes could be smoother.',
            'Dialogue tags could be replaced with action beats in places.'
          ],
          suggestions: [
            'Read your work aloud to catch rhythm issues.',
            'Add moments of internal reflection before key decisions.',
            'Consider strengthening your opening hook.',
            'Look for show-don\'t-tell opportunities.',
            'Deepen secondary characters with distinct voices.'
          ]
        }
      }

    default:
      return {
        content: `Here's a creative suggestion for your ${projectType.toLowerCase()} in the ${genre.toLowerCase()} genre. Consider how this element might enhance your narrative and connect with readers on an emotional level.`,
        response: `I'm here to help with your ${projectType.toLowerCase()} writing. Ask me to continue scenes, develop characters, build your world, or improve your prose.`
      }
  }
}
