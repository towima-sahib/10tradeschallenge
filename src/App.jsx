import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)

      if (session) {
        loadProfile(session.user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)

      if (session) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      setProfile(data)
    }
  }

  async function createProfile() {
    const { data, error } = await supabase
      .from('players')
      .insert([
        {
          user_id: session.user.id,
          display_name: displayName,
        },
      ])
      .select()
      .single()

    if (error) {
      alert(error.message)
    } else {
      setProfile(data)
    }
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    }
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (!session) {
    return (
      <div style={{ padding: 40 }}>
        <h1>10 Trades Challenge</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', marginBottom: 10 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', marginBottom: 10 }}
        />

        <button onClick={signUp}>Sign Up</button>

        <button
          onClick={signIn}
          style={{ marginLeft: 10 }}
        >
          Sign In
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Create Player Profile</h1>

        <input
          placeholder="Display Name"
          value={displayName}
          onChange={(e) =>
            setDisplayName(e.target.value)
          }
          style={{ display: 'block', marginBottom: 10 }}
        />

        <button onClick={createProfile}>
          Create Profile
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>10 Trades Challenge</h1>

      <p>
        Logged in as: {profile.display_name}
      </p>

      <p>
        Finished: {profile.finished ? 'Yes' : 'No'}
      </p>

      <button onClick={signOut}>
        Sign Out
      </button>
    </div>
  )
}

export default App