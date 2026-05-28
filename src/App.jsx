import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')

  const [initialItem, setInitialItem] = useState('')
  const [initialProofFile, setInitialProofFile] = useState(null)

  const [trades, setTrades] = useState([])
  const [tradeNumber, setTradeNumber] = useState('')
  const [itemGiven, setItemGiven] = useState('')
  const [itemReceived, setItemReceived] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [notes, setNotes] = useState('')
  const [tradeProofFile, setTradeProofFile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile(session.user.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)

      if (session) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setTrades([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      setProfile(data)
      loadTrades(data.id)
    }
  }

  async function loadTrades(playerId) {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('player_id', playerId)
      .order('trade_number', { ascending: true })

    if (error) {
      alert(error.message)
    } else {
      setTrades(data)
    }
  }

  async function createProfile() {
    const { data, error } = await supabase
      .from('players')
      .insert([
        {
          display_name: displayName,
        },
      ])
      .select()
      .single()

    if (error) {
      alert(error.message)
    } else {
      setProfile(data)
      setTrades([])
    }
  }

  async function saveInitialItem() {
    if (!initialItem) {
      alert('Please enter the initial item.')
      return
    }

    if (!initialProofFile) {
      alert('Please upload proof of purchase.')
      return
    }

    const filePath = `${session.user.id}/initial-item-${Date.now()}-${initialProofFile.name}`

    const { error: uploadError } = await supabase.storage
      .from('trade-proof')
      .upload(filePath, initialProofFile)

    if (uploadError) {
      alert(uploadError.message)
      return
    }

    const { data, error } = await supabase
      .from('players')
      .update({
        initial_item: initialItem,
        initial_item_proof_path: filePath,
      })
      .eq('id', profile.id)
      .select()
      .single()

    if (error) {
      alert(error.message)
    } else {
      setProfile(data)
      setInitialProofFile(null)
    }
  }

  async function addTrade() {
    if (!tradeNumber || !itemGiven || !itemReceived) {
      alert('Trade number, item given, and item received are required.')
      return
    }

    if (!tradeProofFile) {
      alert('Please upload proof for this trade.')
      return
    }

    const filePath = `${session.user.id}/trade-${tradeNumber}-${Date.now()}-${tradeProofFile.name}`

    const { error: uploadError } = await supabase.storage
      .from('trade-proof')
      .upload(filePath, tradeProofFile)

    if (uploadError) {
      alert(uploadError.message)
      return
    }

    const { error } = await supabase.from('trades').insert([
      {
        player_id: profile.id,
        trade_number: Number(tradeNumber),
        item_given: itemGiven,
        item_received: itemReceived,
        estimated_value: estimatedValue ? Number(estimatedValue) : null,
        notes,
        proof_file_path: filePath,
      },
    ])

    if (error) {
      alert(error.message)
    } else {
      setTradeNumber('')
      setItemGiven('')
      setItemReceived('')
      setEstimatedValue('')
      setNotes('')
      setTradeProofFile(null)
      loadTrades(profile.id)
    }
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) alert(error.message)
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) alert(error.message)
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

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Create Player Profile</h1>

        <input
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ display: 'block', marginBottom: 10 }}
        />

        <button onClick={createProfile}>Create Profile</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>10 Trades Challenge</h1>

      <div
        style={{
          background: '#fff3cd',
          border: '1px solid #ffeeba',
          padding: 12,
          marginBottom: 20,
        }}
      >
        <strong>Beta version:</strong> You can upload your initial £1 item now.
        Trade uploads, leaderboard, proof reveal, and scoring are still being
        added.
      </div>

      <p>Logged in as: {profile.display_name}</p>
      <p>Finished: {profile.finished ? 'Yes' : 'No'}</p>

      <button onClick={signOut}>Sign Out</button>

      <hr />

      <h2>Initial £1 Item</h2>

      {!profile.initial_item ? (
        <>
          <input
            placeholder="What did you buy for £1?"
            value={initialItem}
            onChange={(e) => setInitialItem(e.target.value)}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setInitialProofFile(e.target.files[0])}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <button onClick={saveInitialItem}>Save Initial Item</button>
        </>
      ) : (
        <>
          <p>
            <strong>Initial item:</strong> {profile.initial_item}
          </p>
          <p>
            <strong>Proof:</strong>{' '}
            {profile.initial_item_proof_path ? 'Uploaded' : 'Missing'}
          </p>
        </>
      )}

      <hr />

      {profile.initial_item && (
        <>
          <h2>Add Trade</h2>

          <input
            type="number"
            min="1"
            max="10"
            placeholder="Trade number"
            value={tradeNumber}
            onChange={(e) => setTradeNumber(e.target.value)}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <input
            placeholder="Item given"
            value={itemGiven}
            onChange={(e) => setItemGiven(e.target.value)}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <input
            placeholder="Item received"
            value={itemReceived}
            onChange={(e) => setItemReceived(e.target.value)}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <input
            type="number"
            placeholder="Estimated value"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setTradeProofFile(e.target.files[0])}
            style={{ display: 'block', marginBottom: 10 }}
          />

          <button onClick={addTrade}>Save Trade</button>

          <hr />

          <h2>Your Trades</h2>

          {trades.length === 0 ? (
            <p>No trades added yet.</p>
          ) : (
            trades.map((trade) => (
              <div
                key={trade.id}
                style={{
                  border: '1px solid #ccc',
                  padding: 15,
                  marginBottom: 10,
                }}
              >
                <h3>Trade {trade.trade_number}</h3>

                <p>
                  <strong>Given:</strong> {trade.item_given}
                </p>

                <p>
                  <strong>Received:</strong> {trade.item_received}
                </p>

                <p>
                  <strong>Estimated value:</strong>{' '}
                  {trade.estimated_value ?? 'Not entered'}
                </p>

                <p>
                  <strong>Notes:</strong> {trade.notes || 'None'}
                </p>

                <p>
                  <strong>Proof:</strong>{' '}
                  {trade.proof_file_path ? 'Uploaded' : 'Missing'}
                </p>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

export default App