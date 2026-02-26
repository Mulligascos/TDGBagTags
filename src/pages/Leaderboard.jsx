import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import './Leaderboard.css'

const DIVISIONS = ['All', 'Mixed', 'Female', 'Junior', 'Senior']

const DIVISION_ICONS = {
  Mixed: '🥏',
  Female: '⭐',
  Junior: '🌟',
  Senior: '🏆',
}

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [division, setDivision] = useState('All')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchPlayers()
  }, [])

  async function fetchPlayers(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('player_status', 'Active')
      .order('bag_tag', { ascending: true })

    if (!error) {
      setPlayers(data || [])
      setLastUpdated(new Date())
    }

    setLoading(false)
    setRefreshing(false)
  }

  const filtered = division === 'All'
    ? players
    : players.filter(p => p.player_division === division)

  const byDivision = division === 'All'
    ? DIVISIONS.filter(d => d !== 'All').reduce((acc, div) => {
        const divPlayers = players.filter(p => p.player_division === div)
        if (divPlayers.length) acc[div] = divPlayers
        return acc
      }, {})
    : null

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <div className="leaderboard">
      <div className="page-header lb-header">
        <div>
          <h1 className="page-title">LEADERBOARD</h1>
          <p className="page-subtitle">Tag #1 is the top — challenge to climb the ranks</p>
        </div>
        <div className="refresh-area">
          {timeStr && <span className="last-updated">Updated {timeStr}</span>}
          <button
            className={`btn btn-secondary refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchPlayers(true)}
            disabled={refreshing}
            title="Refresh leaderboard"
          >
            <span className="refresh-icon">↻</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        {DIVISIONS.map(d => (
          <button
            key={d}
            className={`filter-chip ${division === d ? 'active' : ''}`}
            onClick={() => setDivision(d)}
          >
            {d !== 'All' && DIVISION_ICONS[d]} {d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading rankings...</div>
      ) : division === 'All' ? (
        <div className="divisions-grid">
          {Object.entries(byDivision).map(([div, divPlayers]) => (
            <DivisionCard key={div} division={div} players={divPlayers} />
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="div-icon">{DIVISION_ICONS[division]}</span>
            <h2 className="div-title">{division}</h2>
            <span className="div-count">{filtered.length} players</span>
          </div>
          <div className="table-wrap">
            <PlayerTable players={filtered} />
          </div>
        </div>
      )}
    </div>
  )
}

function DivisionCard({ division, players }) {
  return (
    <div className="card division-card fade-in">
      <div className="card-header">
        <span className="div-icon">{DIVISION_ICONS[division]}</span>
        <h2 className="div-title">{division}</h2>
        <span className="div-count">{players.length} players</span>
      </div>
      <PlayerTable players={players} compact />
    </div>
  )
}

function PlayerTable({ players, compact }) {
  if (!players.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🥏</div>
        <div className="empty-state-title">NO PLAYERS</div>
        <p>No active players in this division yet.</p>
      </div>
    )
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Tag #</th>
          <th>Player</th>
          {!compact && <th>Division</th>}
        </tr>
      </thead>
      <tbody>
        {players.map((p, i) => (
          <tr key={p.player_id} style={{ animationDelay: `${i * 30}ms` }}>
            <td>
              <span className={`tag-num ${p.bag_tag <= 3 ? `tag-top-${p.bag_tag}` : ''}`}>
                {p.bag_tag === 1 && <span className="crown">👑</span>}
                #{p.bag_tag}
              </span>
            </td>
            <td className="player-name">{p.player_name}</td>
            {!compact && (
              <td>
                <span className={`badge badge-${p.player_division.toLowerCase()}`}>
                  {p.player_division}
                </span>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
