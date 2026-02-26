import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'
import './NewChallenge.css'

const DIVISIONS = ['Mixed', 'Female', 'Junior', 'Senior']

export default function NewChallenge() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, addToast } = useToast()

  // Challenge config
  const [challengeType, setChallengeType] = useState('Direct')
  const [division, setDivision] = useState('Mixed')
  const [challengeDate, setChallengeDate] = useState(new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')

  // Direct challenge
  const [challenger, setChallenger] = useState('')
  const [challenged, setChallenged] = useState('')
  const [winner, setWinner] = useState('')

  // Group challenge: array of {player_id, finish_position}
  const [groupParticipants, setGroupParticipants] = useState([{ player_id: '', finish_position: 1 }])

  useEffect(() => { fetchPlayers() }, [])

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*')
      .eq('player_status', 'Active').order('bag_tag', { ascending: true, nullsLast: true })
    setPlayers(data || [])
    setLoading(false)
  }

  const divisionPlayers = players.filter(p => p.player_division === division)

  function getPlayer(id) { return players.find(p => p.player_id === id) }

  function addGroupParticipant() {
    setGroupParticipants(prev => [...prev, { player_id: '', finish_position: prev.length + 1 }])
  }

  function removeGroupParticipant(idx) {
    setGroupParticipants(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, finish_position: i + 1 })))
  }

  function updateGroupParticipant(idx, field, value) {
    setGroupParticipants(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  function moveParticipant(idx, dir) {
    const arr = [...groupParticipants]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= arr.length) return
    ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
    setGroupParticipants(arr.map((p, i) => ({ ...p, finish_position: i + 1 })))
  }

  async function handleSubmit() {
    // Validate
    if (challengeType === 'Direct') {
      if (!challenger || !challenged) return addToast('Select both players', 'error')
      if (challenger === challenged) return addToast('Players must be different', 'error')
      if (!winner) return addToast('Select the winner', 'error')
    } else {
      const validParticipants = groupParticipants.filter(p => p.player_id)
      if (validParticipants.length < 2) return addToast('Need at least 2 participants', 'error')
      const ids = validParticipants.map(p => p.player_id)
      if (new Set(ids).size !== ids.length) return addToast('Duplicate players in group', 'error')
    }

    setSaving(true)
    try {
      // 1. Create challenge record
      const { data: challenge, error: cErr } = await supabase.from('challenges').insert({
        challenge_type: challengeType,
        challenge_date: challengeDate,
        division,
        notes: notes.trim() || null,
      }).select().single()
      if (cErr) throw cErr

      if (challengeType === 'Direct') {
        await handleDirectChallenge(challenge.challenge_id)
      } else {
        await handleGroupChallenge(challenge.challenge_id)
      }

      addToast('Challenge recorded!', 'success')
      setTimeout(() => navigate('/challenges'), 1200)
    } catch (err) {
      addToast(err.message, 'error')
    }
    setSaving(false)
  }

  async function handleDirectChallenge(challengeId) {
    const p1 = getPlayer(challenger)  // challenger
    const p2 = getPlayer(challenged)  // challenged player
    const winnerPlayer = getPlayer(winner)
    const loserPlayer = winner === challenger ? p2 : p1

    // Winner gets the lower tag number, loser gets the higher
    const lowerTag = Math.min(p1.bag_tag, p2.bag_tag)
    const higherTag = Math.max(p1.bag_tag, p2.bag_tag)

    const newWinnerTag = lowerTag
    const newLoserTag = higherTag

    // Insert participants
    await supabase.from('challenge_participants').insert([
      {
        challenge_id: challengeId,
        player_id: winnerPlayer.player_id,
        bag_tag_before: winnerPlayer.bag_tag,
        bag_tag_after: newWinnerTag,
        finish_position: 1,
      },
      {
        challenge_id: challengeId,
        player_id: loserPlayer.player_id,
        bag_tag_before: loserPlayer.bag_tag,
        bag_tag_after: newLoserTag,
        finish_position: 2,
      },
    ])

    // Update bag tags only if they changed
    if (winnerPlayer.bag_tag !== newWinnerTag) {
      await supabase.from('players').update({ bag_tag: newWinnerTag }).eq('player_id', winnerPlayer.player_id)
    }
    if (loserPlayer.bag_tag !== newLoserTag) {
      await supabase.from('players').update({ bag_tag: newLoserTag }).eq('player_id', loserPlayer.player_id)
    }
  }

  async function handleGroupChallenge(challengeId) {
    const validParticipants = groupParticipants.filter(p => p.player_id)
    // Sort by finish position (1 = best/winner gets lowest tag)
    const sorted = [...validParticipants].sort((a, b) => a.finish_position - b.finish_position)

    // Get current bag tags for all participants
    const participantPlayers = sorted.map(p => getPlayer(p.player_id)).filter(Boolean)

    // Collect all their current tag numbers, sort ascending
    const availableTags = participantPlayers
      .map(p => p.bag_tag)
      .filter(t => t != null)
      .sort((a, b) => a - b)

    // Assign tags: 1st place gets lowest tag, 2nd gets next, etc.
    const participants = await supabase.from('challenge_participants').insert(
      sorted.map((p, idx) => {
        const playerData = getPlayer(p.player_id)
        return {
          challenge_id: challengeId,
          player_id: p.player_id,
          bag_tag_before: playerData.bag_tag,
          bag_tag_after: availableTags[idx] ?? playerData.bag_tag,
          finish_position: p.finish_position,
        }
      })
    )

    // Update player bag tags
    for (let i = 0; i < sorted.length; i++) {
      const playerData = getPlayer(sorted[i].player_id)
      const newTag = availableTags[i]
      if (newTag != null && playerData.bag_tag !== newTag) {
        await supabase.from('players').update({ bag_tag: newTag }).eq('player_id', playerData.player_id)
      }
    }
  }

  const challengerPlayer = getPlayer(challenger)
  const challengedPlayer = getPlayer(challenged)

  return (
    <div className="new-challenge">
      <div className="page-header">
        <h1 className="page-title">RECORD CHALLENGE</h1>
        <p className="page-subtitle">Log a challenge result and update bag tag rankings</p>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading...</div>
      ) : (
        <div className="challenge-layout">
          {/* Config panel */}
          <div className="card config-panel">
            <h3 className="section-title">CHALLENGE DETAILS</h3>

            <div className="form-group">
              <label className="form-label">Challenge Type</label>
              <div className="type-toggle">
                <button
                  className={`type-btn ${challengeType === 'Direct' ? 'active' : ''}`}
                  onClick={() => setChallengeType('Direct')}
                >
                  ⚔️ Direct (1v1)
                </button>
                <button
                  className={`type-btn ${challengeType === 'Group' ? 'active' : ''}`}
                  onClick={() => setChallengeType('Group')}
                >
                  🏆 Group
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Division</label>
              <select className="form-select" value={division} onChange={e => setDivision(e.target.value)}>
                {DIVISIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input
                className="form-input"
                type="datetime-local"
                value={challengeDate}
                onChange={e => setChallengeDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-input"
                placeholder="Course, event, or any notes..."
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Challenge form */}
          <div className="card challenge-form-panel">
            {challengeType === 'Direct' ? (
              <DirectChallengeForm
                players={divisionPlayers}
                challenger={challenger}
                challenged={challenged}
                winner={winner}
                setChallenger={setChallenger}
                setChallenged={setChallenged}
                setWinner={setWinner}
                challengerPlayer={challengerPlayer}
                challengedPlayer={challengedPlayer}
              />
            ) : (
              <GroupChallengeForm
                players={divisionPlayers}
                participants={groupParticipants}
                onAdd={addGroupParticipant}
                onRemove={removeGroupParticipant}
                onUpdate={updateGroupParticipant}
                onMove={moveParticipant}
                getPlayer={getPlayer}
              />
            )}

            <div className="submit-row">
              <button className="btn btn-secondary" onClick={() => navigate('/challenges')}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Recording...' : '🏁 Record Result'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}

function DirectChallengeForm({ players, challenger, challenged, winner, setChallenger, setChallenged, setWinner, challengerPlayer, challengedPlayer }) {
  return (
    <div className="direct-form">
      <h3 className="section-title">HEAD-TO-HEAD</h3>

      <div className="vs-layout">
        <div className="player-pick">
          <label className="form-label">Challenger</label>
          <select className="form-select player-select" value={challenger} onChange={e => { setChallenger(e.target.value); setWinner('') }}>
            <option value="">Select player...</option>
            {players.map(p => (
              <option key={p.player_id} value={p.player_id} disabled={p.player_id === challenged}>
                #{p.bag_tag} — {p.player_name}
              </option>
            ))}
          </select>
          {challengerPlayer && <div className="current-tag">Current tag: <strong>#{challengerPlayer.bag_tag}</strong></div>}
        </div>

        <div className="vs-divider">VS</div>

        <div className="player-pick">
          <label className="form-label">Being Challenged</label>
          <select className="form-select player-select" value={challenged} onChange={e => { setChallenged(e.target.value); setWinner('') }}>
            <option value="">Select player...</option>
            {players.map(p => (
              <option key={p.player_id} value={p.player_id} disabled={p.player_id === challenger}>
                #{p.bag_tag} — {p.player_name}
              </option>
            ))}
          </select>
          {challengedPlayer && <div className="current-tag">Current tag: <strong>#{challengedPlayer.bag_tag}</strong></div>}
        </div>
      </div>

      {challenger && challenged && challengerPlayer && challengedPlayer && (
        <div className="winner-section">
          <label className="form-label">Who Won?</label>
          <div className="winner-options">
            <button
              className={`winner-btn ${winner === challenger ? 'selected' : ''}`}
              onClick={() => setWinner(challenger)}
            >
              🏆 {challengerPlayer.player_name}
              <span className="winner-tag">keeps/gets #{Math.min(challengerPlayer.bag_tag, challengedPlayer.bag_tag)}</span>
            </button>
            <button
              className={`winner-btn ${winner === challenged ? 'selected' : ''}`}
              onClick={() => setWinner(challenged)}
            >
              🏆 {challengedPlayer.player_name}
              <span className="winner-tag">keeps/gets #{Math.min(challengerPlayer.bag_tag, challengedPlayer.bag_tag)}</span>
            </button>
          </div>
          {winner && (
            <div className="result-preview">
              <div className="result-row">
                <span>{challengerPlayer.player_name}</span>
                <span>#{challengerPlayer.bag_tag} → <strong className={winner === challenger ? 'tag-win' : 'tag-lose'}>
                  #{winner === challenger ? Math.min(challengerPlayer.bag_tag, challengedPlayer.bag_tag) : Math.max(challengerPlayer.bag_tag, challengedPlayer.bag_tag)}
                </strong></span>
              </div>
              <div className="result-row">
                <span>{challengedPlayer.player_name}</span>
                <span>#{challengedPlayer.bag_tag} → <strong className={winner === challenged ? 'tag-win' : 'tag-lose'}>
                  #{winner === challenged ? Math.min(challengerPlayer.bag_tag, challengedPlayer.bag_tag) : Math.max(challengerPlayer.bag_tag, challengedPlayer.bag_tag)}
                </strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GroupChallengeForm({ players, participants, onAdd, onRemove, onUpdate, onMove, getPlayer }) {
  const validParticipants = participants.filter(p => p.player_id)
  const usedIds = validParticipants.map(p => p.player_id)

  // Collect available tags from selected players
  const availableTags = validParticipants
    .map(p => getPlayer(p.player_id)?.bag_tag)
    .filter(t => t != null)
    .sort((a, b) => a - b)

  return (
    <div className="group-form">
      <div className="group-header">
        <h3 className="section-title">GROUP RESULTS</h3>
        <span className="group-hint">Drag to reorder — Position 1 is the winner</span>
      </div>
      <p className="group-desc">
        Enter players in finishing order. Tags available in this group: <strong>{availableTags.map(t => `#${t}`).join(', ') || '—'}</strong>
      </p>

      <div className="participant-list">
        {participants.map((p, idx) => {
          const pData = getPlayer(p.player_id)
          const assignedTag = availableTags[idx]
          return (
            <div key={idx} className="participant-row">
              <div className="pos-badge">{p.finish_position}</div>
              <select
                className="form-select participant-select"
                value={p.player_id}
                onChange={e => onUpdate(idx, 'player_id', e.target.value)}
              >
                <option value="">Select player...</option>
                {players.map(pl => (
                  <option key={pl.player_id} value={pl.player_id} disabled={usedIds.includes(pl.player_id) && pl.player_id !== p.player_id}>
                    #{pl.bag_tag} — {pl.player_name}
                  </option>
                ))}
              </select>
              {pData && assignedTag != null && (
                <span className={`tag-assign ${assignedTag < pData.bag_tag ? 'tag-win' : assignedTag > pData.bag_tag ? 'tag-lose' : 'tag-same'}`}>
                  #{pData.bag_tag} → #{assignedTag}
                </span>
              )}
              <div className="move-btns">
                <button className="move-btn" onClick={() => onMove(idx, -1)} disabled={idx === 0}>↑</button>
                <button className="move-btn" onClick={() => onMove(idx, 1)} disabled={idx === participants.length - 1}>↓</button>
              </div>
              <button className="icon-btn icon-btn-danger" onClick={() => onRemove(idx)} disabled={participants.length <= 2}>×</button>
            </div>
          )
        })}
      </div>

      <button className="btn btn-secondary" onClick={onAdd} style={{ marginTop: '12px' }}>
        + Add Player
      </button>
    </div>
  )
}
