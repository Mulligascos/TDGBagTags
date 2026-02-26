import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { format } from 'date-fns'
import './Challenges.css'

export default function Challenges() {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => { fetchChallenges() }, [])

  async function fetchChallenges() {
    setLoading(true)
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        challenge_participants (
          *,
          players ( player_name, player_division )
        )
      `)
      .order('challenge_date', { ascending: false })
    if (!error) setChallenges(data || [])
    setLoading(false)
  }

  const filtered = challenges.filter(c =>
    filter === 'All' || c.challenge_type === filter || c.division === filter
  )

  return (
    <div className="challenges-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">CHALLENGES</h1>
          <p className="page-subtitle">{challenges.length} recorded challenges</p>
        </div>
        <Link to="/challenges/new" className="btn btn-primary">+ New Challenge</Link>
      </div>

      <div className="filter-bar">
        {['All', 'Direct', 'Group', 'Mixed', 'Female', 'Junior', 'Senior'].map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading challenges...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚔️</div>
          <div className="empty-state-title">NO CHALLENGES YET</div>
          <p>Record your first challenge to start tracking rankings.</p>
          <Link to="/challenges/new" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>Record a Challenge</Link>
        </div>
      ) : (
        <div className="challenges-list">
          {filtered.map((c, i) => (
            <ChallengeCard key={c.challenge_id} challenge={c} idx={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function ChallengeCard({ challenge, idx }) {
  const participants = challenge.challenge_participants || []
  const winner = participants.find(p => p.finish_position === 1)
  const sorted = [...participants].sort((a, b) => (a.finish_position || 99) - (b.finish_position || 99))

  return (
    <div className="challenge-card fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
      <div className="cc-header">
        <div className="cc-meta">
          <span className={`challenge-type-badge ${challenge.challenge_type === 'Direct' ? 'type-direct' : 'type-group'}`}>
            {challenge.challenge_type === 'Direct' ? '⚔️ Direct' : '🏆 Group'}
          </span>
          <span className={`badge badge-${challenge.division.toLowerCase()}`}>{challenge.division}</span>
          <span className="cc-date">{format(new Date(challenge.challenge_date), 'dd MMM yyyy · HH:mm')}</span>
        </div>
        {winner && (
          <div className="cc-winner">
            🏆 <strong>{winner.players?.player_name}</strong>
            {winner.bag_tag_after && <span className="wins-tag">→ #{winner.bag_tag_after}</span>}
          </div>
        )}
      </div>

      <div className="cc-participants">
        {sorted.map((p, i) => (
          <div key={p.id} className="cc-participant">
            <span className={`finish-pos ${p.finish_position === 1 ? 'pos-first' : ''}`}>
              {p.finish_position === 1 ? '🥇' : p.finish_position === 2 ? '🥈' : p.finish_position === 3 ? '🥉' : `${p.finish_position}th`}
            </span>
            <span className="participant-name">{p.players?.player_name ?? 'Unknown'}</span>
            <span className="tag-change">
              {p.bag_tag_before != null && <>#{p.bag_tag_before}</>}
              {p.bag_tag_after != null && p.bag_tag_after !== p.bag_tag_before && (
                <span className={p.bag_tag_after < p.bag_tag_before ? 'improved' : 'worsened'}>
                  {' '}→ #{p.bag_tag_after}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {challenge.notes && (
        <div className="cc-notes">💬 {challenge.notes}</div>
      )}
    </div>
  )
}
