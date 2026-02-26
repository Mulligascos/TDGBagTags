import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase.js'
import Leaderboard from './pages/Leaderboard.jsx'
import Players from './pages/Players.jsx'
import Challenges from './pages/Challenges.jsx'
import NewChallenge from './pages/NewChallenge.jsx'
import History from './pages/History.jsx'
import './App.css'

export const CurrentUserContext = createContext(null)

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}

export default function App() {
  const [currentPlayerId, setCurrentPlayerId] = useState(() => localStorage.getItem('bagtag_current_player') || '')
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [allPlayers, setAllPlayers] = useState([])

  useEffect(() => {
    supabase.from('players').select('player_id, player_name, bag_tag, player_division')
      .eq('player_status', 'Active').order('bag_tag', { ascending: true, nullsLast: true })
      .then(({ data }) => {
        setAllPlayers(data || [])
        if (currentPlayerId) {
          const found = (data || []).find(p => p.player_id === currentPlayerId)
          setCurrentPlayer(found || null)
        }
      })
  }, [])

  function selectPlayer(player) {
    setCurrentPlayer(player)
    setCurrentPlayerId(player.player_id)
    localStorage.setItem('bagtag_current_player', player.player_id)
    setShowPicker(false)
  }

  function clearPlayer() {
    setCurrentPlayer(null)
    setCurrentPlayerId('')
    localStorage.removeItem('bagtag_current_player')
    setShowPicker(false)
  }

  return (
    <CurrentUserContext.Provider value={{ currentPlayer, setCurrentPlayer: selectPlayer }}>
      <BrowserRouter>
        <div className="app">
          <header className="header">
            <div className="header-inner">
              <div className="logo">
                <span className="logo-icon">🥏</span>
                <div>
                  <div className="logo-title">BAG TAG</div>
                  <div className="logo-sub">RANKINGS</div>
                </div>
              </div>
              <nav className="nav">
                <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Leaderboard</NavLink>
                <NavLink to="/challenges" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Challenges</NavLink>
                <NavLink to="/players" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Players</NavLink>
                <NavLink to="/history" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>History</NavLink>
              </nav>
              <div className="header-right">
                <button className="player-identity" onClick={() => setShowPicker(true)} title="Change player">
                  {currentPlayer ? (
                    <>
                      <span className="identity-tag">#{currentPlayer.bag_tag}</span>
                      <span className="identity-name">{currentPlayer.player_name}</span>
                      <span className="identity-edit">✎</span>
                    </>
                  ) : (
                    <>
                      <span className="identity-avatar">👤</span>
                      <span className="identity-prompt">Who are you?</span>
                    </>
                  )}
                </button>
                <NavLink to="/challenges/new" className="btn-challenge">+ New Challenge</NavLink>
              </div>
            </div>
          </header>

          <main className="main">
            <Routes>
              <Route path="/" element={<Leaderboard />} />
              <Route path="/players" element={<Players />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/challenges/new" element={<NewChallenge />} />
              <Route path="/history" element={<History />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>

          <footer className="footer">
            <span>Bag Tag Rankings</span>
            <span className="footer-sep">·</span>
            <span>Lower number = Higher rank</span>
            <span className="footer-sep">·</span>
            <span>Tag #1 is the goal</span>
          </footer>
        </div>

        {showPicker && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPicker(false)}>
            <div className="modal">
              <h2 className="modal-title">WHO ARE YOU?</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                Select your name to pre-fill challenges. Saved on this device.
              </p>
              <div className="player-picker-list">
                {allPlayers.map(p => (
                  <button
                    key={p.player_id}
                    className={`player-picker-row ${currentPlayer?.player_id === p.player_id ? 'selected' : ''}`}
                    onClick={() => selectPlayer(p)}
                  >
                    <span className="picker-tag">#{p.bag_tag}</span>
                    <span className="picker-name">{p.player_name}</span>
                    <span className={`badge badge-${p.player_division.toLowerCase()}`}>{p.player_division}</span>
                    {currentPlayer?.player_id === p.player_id && <span className="picker-check">✓</span>}
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                {currentPlayer && (
                  <button className="btn btn-danger" onClick={clearPlayer}>Clear</button>
                )}
                <button className="btn btn-secondary" onClick={() => setShowPicker(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </BrowserRouter>
    </CurrentUserContext.Provider>
  )
}
