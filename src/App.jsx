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
  const [leaderboard, setLeaderboard] = useState([])

  const [tradeNumber, setTradeNumber] = useState('')
  const [itemGiven, setItemGiven] = useState('')
  const [itemReceived, setItemReceived] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [notes, setNotes] = useState('')
  const [tradeProofFile, setTradeProofFile] = useState(null)

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
        setTrades([])
        setLeaderboard([])
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
      loadLeaderboard()
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

  async function loadLeaderboard() {
    const { data: players } = await supabase
      .from('players')
      .select('id, display_name, finished')

    const { data: allTrades } = await supabase
      .from('trades')
      .select('player_id')

    const rows = players.map((player) => {
      const tradeCount = allTrades.filter(
        (trade) => trade.player_id === player.id
      ).length

      return {
        ...player,
        tradeCount,
      }
    })

    setLeaderboard(rows)
  }

  async function createProfile() {
    if (!displayName) {
      alert('Please enter a display name.')
      return
    }

    const { data, error } = await supabase
      .from('players')
      .insert([{ display_name: displayName }])
      .select()
      .single()

    if (error) {
      alert(error.message)
    } else {
      setProfile(data)
      loadLeaderboard()
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
      loadLeaderboard()
    }
  }

  async function addTrade() {
    if (!tradeNumber || !itemGiven || !itemReceived) {
      alert('Please complete all required fields.')
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
      loadLeaderboard()
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
      <div className="container">
        <h1>10 Trades Challenge</h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={signUp}>Sign Up</button>
        <button onClick={signIn}>Sign In</button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container">
        <h1>Create Player Profile</h1>

        <input
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <button onClick={createProfile}>
          Create Profile
        </button>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>10 Trades Challenge</h1>

      <div className="notice">
        <strong>Beta version:</strong> You can upload your initial £1 item and
        trades now. Proof reveal and scoring are still being added.

        <br />
        <br />

        <strong>Privacy notice:</strong> Please do not upload receipts,
        screenshots, or images containing personally identifiable information
        such as addresses, phone numbers, email addresses, payment details, or
        account information.
      </div>

      <p>
        Logged in as <strong>{profile.display_name}</strong>
      </p>

      <p className="status">
        Status:{' '}
        <span className={profile.finished ? 'success' : 'pending'}>
          {profile.finished ? 'Finished' : 'In Progress'}
        </span>
      </p>

      <button onClick={signOut}>Sign Out</button>

      <hr />

      <h2>Leaderboard</h2>

      {leaderboard.map((player) => (
        <div className="card" key={player.id}>
          <strong>{player.display_name}</strong>

          <p>
            Trades completed: {player.tradeCount} / 10
          </p>

          <p>
            Status:{' '}
            {player.finished ? 'Finished' : 'In Progress'}
          </p>
        </div>
      ))}

      <hr />

      <h2>Initial £1 Item</h2>

      {!profile.initial_item ? (
        <>
          <input
            placeholder="What did you buy for £1?"
            value={initialItem}
            onChange={(e) => setInitialItem(e.target.value)}
          />

          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              setInitialProofFile(e.target.files[0])
            }
          />

          <button onClick={saveInitialItem}>
            Save Initial Item
          </button>
        </>
      ) : (
        <div className="card">
          <p>
            <strong>Initial item:</strong>{' '}
            {profile.initial_item}
          </p>

          <p>
            <strong>Proof:</strong>{' '}
            {profile.initial_item_proof_path
              ? 'Uploaded'
              : 'Missing'}
          </p>
        </div>
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
            onChange={(e) =>
              setTradeNumber(e.target.value)
            }
          />

          <input
            placeholder="Item given"
            value={itemGiven}
            onChange={(e) =>
              setItemGiven(e.target.value)
            }
          />

          <input
            placeholder="Item received"
            value={itemReceived}
            onChange={(e) =>
              setItemReceived(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Estimated value"
            value={estimatedValue}
            onChange={(e) =>
              setEstimatedValue(e.target.value)
            }
          />

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) =>
              setTradeProofFile(e.target.files[0])
            }
          />

          <button onClick={addTrade}>
            Save Trade
          </button>

          <hr />

          <h2>Your Trades</h2>

          {trades.length === 0 ? (
            <p>No trades added yet.</p>
          ) : (
            trades.map((trade) => (
              <div className="card" key={trade.id}>
                <h3>Trade {trade.trade_number}</h3>

                <p>
                  <strong>Given:</strong>{' '}
                  {trade.item_given}
                </p>

                <p>
                  <strong>Received:</strong>{' '}
                  {trade.item_received}
                </p>

                <p>
                  <strong>Estimated value:</strong>{' '}
                  {trade.estimated_value ??
                    'Not entered'}
                </p>

                <p>
                  <strong>Notes:</strong>{' '}
                  {trade.notes || 'None'}
                </p>

                <p>
                  <strong>Proof:</strong>{' '}
                  {trade.proof_file_path
                    ? 'Uploaded'
                    : 'Missing'}
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