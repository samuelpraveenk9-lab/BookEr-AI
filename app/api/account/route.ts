import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function DELETE(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!accessToken) return NextResponse.json({ error: 'Sign in before deleting your account.' }, { status: 401 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Account deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY as a server-only Vercel environment variable.' }, { status: 503 })
  }

  try {
    const baseUrl = supabaseUrl.replace(/\/$/, '')
    const userResponse = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!userResponse.ok) return NextResponse.json({ error: 'Your session is invalid or expired. Sign in again.' }, { status: 401 })
    const user = await userResponse.json() as { id?: string }
    if (!user.id) return NextResponse.json({ error: 'Could not verify your account.' }, { status: 401 })

    const deleteResponse = await fetch(`${baseUrl}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      cache: 'no-store',
    })
    if (!deleteResponse.ok) {
      console.error('[BookEr AI] Supabase account deletion failed with status:', deleteResponse.status)
      return NextResponse.json({ error: 'Supabase could not delete the account. Check the server service-role configuration.' }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[BookEr AI] Account deletion request failed:', error)
    return NextResponse.json({ error: 'Account deletion service is unavailable. Try again later.' }, { status: 502 })
  }
}
