import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { format } from 'date-fns'
import './History.css'

export default function History() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchHistory() }, [])

  async function fetchHistory() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bag_tag_history')
      .select(`
        *,
        players ( player_name, player_division ),
        challenges ( challenge_type, division )
      `)
      .order('changed_at', { ascending: false })
      .limit(200)
    if (!error) setHistory(data || [])
    setLoading(false)
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <h1 className="page-title">TAG HISTORY</h1>
        <p className="page-subtitle">Complete log of all bag tag changes</p>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading history...</div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">NO HISTORY YET</div>
          <p>Tag changes will appear here after challenges are recorded.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Player</th>
                  <th>Division</th>
                  <th>Change</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => {
                  const improved = h.new_tag < h.old_tag
                  const worsened = h.new_tag > h.old_tag
                  return (
                    <tr key={h.id} style={{ animationDelay: `${i * 15}ms` }}>
                      <td className="history-date">
                        {format(new Date(h.changed_at), 'dd MMM yy')}
                        <span className="history-time">{format(new Date(h.changed_at), 'HH:mm')}</span>
                      </td>
                      <td className="player-name">{h.players?.player_name ?? 'Unknown'}</td>
                      <td>
                        {h.players?.player_division && (
                          <span className={`badge badge-${h.players.player_division.toLowerCase()}`}>
                            {h.players.player_division}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="tag-change-display">
                          <span className="old-tag">#{h.old_tag ?? '—'}</span>
                          <span className="arrow">→</span>
                          <span className={`new-tag ${improved ? 'improved' : worsened ? 'worsened' : ''}`}>
                            #{h.new_tag ?? '—'}
                          </span>
                          {improved && <span className="delta improved">▲ {h.old_tag - h.new_tag}</span>}
                          {worsened && <span className="delta worsened">▼ {h.new_tag - h.old_tag}</span>}
                        </span>
                      </td>
                      <td>
                        {h.challenges && (
                          <span className={`badge ${h.challenges.challenge_type === 'Direct' ? '' : 'badge-mixed'}`}
                            style={h.challenges.challenge_type === 'Direct' ? { background: 'rgba(255,107,71,0.1)', color: 'var(--accent3)' } : {}}>
                            {h.challenges.challenge_type}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
