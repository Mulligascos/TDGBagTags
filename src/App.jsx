import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Leaderboard from './pages/Leaderboard.jsx'
import Players from './pages/Players.jsx'
import Challenges from './pages/Challenges.jsx'
import NewChallenge from './pages/NewChallenge.jsx'
import History from './pages/History.jsx'
import './App.css'

export default function App() {
  return (
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
              <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                Leaderboard
              </NavLink>
              <NavLink to="/challenges" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                Challenges
              </NavLink>
              <NavLink to="/players" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                Players
              </NavLink>
              <NavLink to="/history" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                History
              </NavLink>
            </nav>
            <NavLink to="/challenges/new" className="btn-challenge">
              + New Challenge
            </NavLink>
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
    </BrowserRouter>
  )
}
