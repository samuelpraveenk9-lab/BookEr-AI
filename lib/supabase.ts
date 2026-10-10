const SESSION_KEY = 'booker_supabase_session'
const USER_KEY = 'booker_user'

export type SupabaseUser = { id: string; email?: string; phone?: string; user_metadata?: { name?: string; full_name?: string } }
export type SupabaseSession = { access_token: string; refresh_token?: string; expires_at?: number; expires_in?: number; token_type?: string; user: SupabaseUser }

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase is not configured. Add its URL and public key to the deployment environment.')
  return { url: url.replace(/\/$/, ''), key }
}
export function getStoredSession(): SupabaseSession | null {
  if (typeof window === 'undefined') return null
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as SupabaseSession | null
    return session?.access_token && session.user?.id ? session : null
  } catch { return null }
}
export function storeSession(session: SupabaseSession) {
  if (typeof window === 'undefined') return
  if (session.expires_in && !session.expires_at) session.expires_at = Math.floor(Date.now()/1000)+session.expires_in
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  localStorage.setItem(USER_KEY, JSON.stringify({ id: session.user.id, name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Author', email: session.user.email || session.user.phone || '', isLoggedIn: true }))
}
export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(USER_KEY)
}
async function authRequest(path: string, body?: unknown) {
  const {url,key}=config()
  const response=await fetch(`${url}/auth/v1/${path}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body||{}),cache:'no-store'})
  const data=await response.json().catch(()=>({}))
  if(!response.ok) throw new Error(data.msg||data.message||data.error_description||'Authentication failed. Check your details and try again.')
  return data
}
export async function signInWithPassword(identifier:string,password:string,method:'email'|'phone') {
  const data=await authRequest('token?grant_type=password',method==='email'?{email:identifier,password}:{phone:identifier,password}) as SupabaseSession
  if(!data.access_token||!data.user?.id) throw new Error('Sign-in did not return a session. Check your account confirmation settings.')
  storeSession(data); return data
}
export async function signUpWithPassword(identifier:string,password:string,name:string,method:'email'|'phone') {
  const data=await authRequest('signup',method==='email'?{email:identifier,password,data:{name}}:{phone:identifier,password,data:{name}}) as SupabaseSession
  if(data.access_token&&data.user?.id) storeSession(data)
  return data
}
export function startGoogleOAuth() {
  const {url,key}=config()
  const redirectTo=`${window.location.origin}/auth/callback`
  window.location.assign(`${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&apikey=${encodeURIComponent(key)}`)
}
export async function fetchAuthUser(accessToken:string):Promise<SupabaseUser> {
  const {url,key}=config()
  const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${accessToken}`},cache:'no-store'})
  if(!response.ok) throw new Error('Could not retrieve the signed-in user from Supabase.')
  return response.json()
}
export async function refreshSessionIfNeeded():Promise<SupabaseSession|null> {
  const session=getStoredSession(); if(!session) return null
  if(!session.expires_at||session.expires_at>Math.floor(Date.now()/1000)+60) return session
  if(!session.refresh_token){clearSession();return null}
  try {
    const next=await authRequest('token?grant_type=refresh_token',{refresh_token:session.refresh_token}) as SupabaseSession
    if(!next.access_token||!next.user?.id) throw new Error('Session refresh failed.')
    storeSession(next);return next
  } catch {clearSession();return null}
}
export async function supabaseRest(path:string,init:RequestInit={}) {
  const session=await refreshSessionIfNeeded(); if(!session) return null
  const {url,key}=config(); const headers=new Headers(init.headers)
  headers.set('apikey',key);headers.set('Authorization',`Bearer ${session.access_token}`)
  if(init.body&&!headers.has('Content-Type')) headers.set('Content-Type','application/json')
  const response=await fetch(`${url}/rest/v1/${path}`,{...init,headers,cache:'no-store'})
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.message||'Cloud sync failed.')}
  return {response,session}
}
export async function signOutSupabase() {
  const session=getStoredSession();clearSession()
  if(!session)return
  try {const {url,key}=config();await fetch(`${url}/auth/v1/logout`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${session.access_token}`},cache:'no-store'})} catch {}
}

export async function updatePassword(newPassword: string): Promise<void> {
  const session = await refreshSessionIfNeeded()
  if (!session) throw new Error('Your session has expired. Sign in again.')
  const { url, key } = config()
  const response = await fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword }),
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.msg || data.message || 'Password could not be updated.')
}

export async function verifyPhoneSignup(phone: string, token: string): Promise<SupabaseSession> {
  const data = await authRequest('verify', { phone, token, type: 'sms' }) as SupabaseSession
  if (!data.access_token || !data.user?.id) throw new Error('Phone verification did not return a session.')
  storeSession(data)
  return data
}
