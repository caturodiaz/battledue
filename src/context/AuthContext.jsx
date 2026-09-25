import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = async (userId) => {
    setProfileLoading(true)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error loading profile:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const scheduleProfileLoad = (userId) => {
      if (!userId) return

      window.setTimeout(() => {
        if (mounted) loadProfile(userId)
      }, 0)
    }

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('Error getting session:', error)
      }

      const currentSession = data?.session ?? null
      setSession(currentSession)
      setLoading(false)

      if (currentSession?.user) {
        scheduleProfileLoad(currentSession.user.id)
      }
    }

    initialize()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return

        setSession(nextSession)
        setLoading(false)

        if (nextSession?.user) {
          scheduleProfileLoad(nextSession.user.id)
        } else {
          setProfile(null)
        }
      },
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async ({ email, password }) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUp = async ({ email, password, displayName }) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    })
  }

  const signOut = async () => {
    return supabase.auth.signOut()
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      signIn,
      signUp,
      signOut,
      refreshProfile: () => session?.user && loadProfile(session.user.id),
    }),
    [session, profile, loading, profileLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
