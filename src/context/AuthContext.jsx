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

    setProfileLoading(false)
  }

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('Error getting session:', error)
      }

      const currentSession = data?.session ?? null
      setSession(currentSession)

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id)
      }

      if (mounted) {
        setLoading(false)
      }
    }

    initialize()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return

        setSession(nextSession)

        if (nextSession?.user) {
          await loadProfile(nextSession.user.id)
        } else {
          setProfile(null)
        }

        setLoading(false)
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
