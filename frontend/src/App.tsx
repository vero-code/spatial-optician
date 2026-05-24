import React from 'react'
import './App.css'

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="hero-header">
        <h1>Spatial Optician</h1>
        <p className="subtitle"></p>
      </header>
      <main className="content">
        <div className="card">
          <h2>Welcome!</h2>
          <p>Frontend is successfully launched.</p>
          <div className="status-badge">React &bull; TypeScript &bull; Vite</div>
        </div>
      </main>
    </div>
  )
}

export default App
