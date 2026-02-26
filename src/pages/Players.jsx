import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useToast, ToastContainer } from '../hooks/useToast.jsx'
import './Players.css'

const DIVISIONS = ['Mixed', 'Female', 'Junior', 'Senior']
const STATUSES = ['Active', 'Inactive']

const emptyForm = {
  player_name: '',
  bag_tag: '',
  player_status: 'Active',
  player_division: 'Mixed',
}

export default function Players() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPlayer, setEditPlayer] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const { toasts, addToast } = useToast()

  useEffect(() => { fetchPlayers() }, [])

  async function fetchPlayers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('bag_tag', { ascending: true, nullsLast: true })
    if (!error) setPlayers(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditPlayer(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(player) {
    setEditPlayer(player)
    setForm({
      player_name: player.player_name,
      bag_tag: player.bag_tag ?? '',
      player_status: player.player_status,
      player_division: player.player_division,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.player_name.trim()) return addToast('Player name is required', 'error')
    setSaving(true)
    const payload = {
      player_name: form.player_name.trim(),
      bag_tag: form.bag_tag ? parseInt(form.bag_tag) : null,
      player_status: form.player_status,
      player_division: form.player_division,
    }
    let error
    if (editPlayer) {
      ({ error } = await supabase.from('players').update(payload).eq('player_id', editPlayer.player_id))
    } else {
      ({ error } = await supabase.from('players').insert(payload))
    }
    setSaving(false)
    if (error) {
      addToast(error.message.includes('unique') ? 'That bag tag number is already taken' : error.message, 'error')
    } else {
      addToast(editPlayer ? 'Player updated!' : 'Player added!', 'success')
      setShowModal(false)
      fetchPlayers()
    }
  }

  async function handleDelete(player) {
    if (!confirm(`Delete ${player.player_name}? This cannot be undone.`)) return
    const { error } = await supabase.from('players').delete().eq('player_id', player.player_id)
    if (error) addToast(error.message, 'error')
    else { addToast('Player deleted', 'success'); fetchPlayers() }
  }

  async function toggleStatus(player) {
    const newStatus = player.player_status === 'Active' ? 'Inactive' : 'Active'
    const { error } = await supabase.from('players').update({ player_status: newStatus }).eq('player_id', player.player_id)
    if (error) addToast(error.message, 'error')
    else { addToast(`${player.player_name} is now ${newStatus}`, 'success'); fetchPlayers() }
  }

  const filtered = players
    .filter(p => filter === 'All' || p.player_division === filter || (filter === 'Active' && p.player_status === 'Active') || (filter === 'Inactive' && p.player_status === 'Inactive'))
    .filter(p => !search || p.player_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="players-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">PLAYERS</h1>
          <p className="page-subtitle">{players.filter(p => p.player_status === 'Active').length} active · {players.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Player</button>
      </div>

      <div className="filter-bar" style={{ gap: '10px', marginBottom: '12px' }}>
        <input
          className="form-input search-input"
          placeholder="Search players..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        {['All', 'Mixed', 'Female', 'Junior', 'Senior', 'Active', 'Inactive'].map(f => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading"><div className="spinner" /> Loading players...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tag #</th>
                  <th>Name</th>
                  <th>Division</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">👤</div>
                      <div className="empty-state-title">NO PLAYERS FOUND</div>
                    </div>
                  </td></tr>
                ) : filtered.map((p, i) => (
                  <tr key={p.player_id} style={{ animationDelay: `${i * 20}ms` }}>
                    <td>
                      <span className="tag-mono">
                        {p.bag_tag ? `#${p.bag_tag}` : '—'}
                      </span>
                    </td>
                    <td className="player-name-cell">
                      <span className="pname">{p.player_name}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${p.player_division.toLowerCase()}`}>
                        {p.player_division}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`status-toggle ${p.player_status === 'Active' ? 'status-active' : 'status-inactive'}`}
                        onClick={() => toggleStatus(p)}
                        title="Click to toggle status"
                      >
                        <span className="status-dot" />
                        {p.player_status}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => openEdit(p)} title="Edit">✏️</button>
                        <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(p)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 className="modal-title">{editPlayer ? 'EDIT PLAYER' : 'ADD PLAYER'}</h2>
            <div className="form-fields">
              <div className="form-group">
                <label className="form-label">Player Name *</label>
                <input
                  className="form-input"
                  placeholder="Full name"
                  value={form.player_name}
                  onChange={e => setForm({ ...form, player_name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bag Tag #</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="e.g. 5"
                    min="1"
                    value={form.bag_tag}
                    onChange={e => setForm({ ...form, bag_tag: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Division</label>
                  <select className="form-select" value={form.player_division} onChange={e => setForm({ ...form, player_division: e.target.value })}>
                    {DIVISIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.player_status} onChange={e => setForm({ ...form, player_status: e.target.value })}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editPlayer ? 'Save Changes' : 'Add Player')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
