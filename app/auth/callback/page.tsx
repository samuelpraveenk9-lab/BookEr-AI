'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAuthUser, storeSession, type SupabaseSession } from '@/lib/supabase'
export default function AuthCallbackPage() {
  const router=useRouter()
  const [message,setMessage]=useState('Completing sign-in…')
  useEffect(()=>{
    let cancelled=false
    const complete=async()=>{
      const hash=new URLSearchParams(window.location.hash.replace(/^#/,''))
      const error=hash.get('error_description')||hash.get('error')
      const accessToken=hash.get('access_token')
      if(error){if(!cancelled)setMessage(error);return}
      if(!accessToken){if(!cancelled)setMessage('No session returned. Check Supabase Google provider and redirect URL settings.');return}
      try {
        const user=await fetchAuthUser(accessToken)
        const expiresIn=Number(hash.get('expires_in')||3600)
        const session:SupabaseSession={access_token:accessToken,refresh_token:hash.get('refresh_token')||undefined,expires_in:expiresIn,expires_at:Math.floor(Date.now()/1000)+expiresIn,user}
        storeSession(session);window.history.replaceState({},document.title,'/auth/callback')
        if(!cancelled)router.replace('/dashboard')
      } catch(e){if(!cancelled)setMessage(e instanceof Error?e.message:'Could not complete sign-in.')}
    }
    void complete()
    return()=>{cancelled=true}
  },[router])
  return <main className="min-h-screen grid place-items-center bg-background p-6"><div className="max-w-md text-center space-y-3"><h1 className="text-xl font-semibold">BookEr AI</h1><p role="status" className="text-sm text-muted-foreground">{message}</p><a className="underline text-sm" href="/auth">Return to sign in</a></div></main>
}
