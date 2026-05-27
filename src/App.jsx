import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Account created')
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
        <button onClick={signIn} style={{ marginLeft: 10 }}>
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>10 Trades Challenge</h1>

      <p>Logged in as: {session.user.email}</p>

      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}

export default App