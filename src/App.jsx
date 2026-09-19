import { useState } from 'react'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import ProfilesPage from './pages/ProfilesPage'
import BattlePage from './pages/BattlePage'
import './App.css'
import './styles/BattleEvasion.css'
import './styles/BattleHealing.css'

function App() {
  const [page, setPage] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)

  const navigateTo = (nextPage) => {
    setPage(nextPage)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="site-header">

        <button
          className="brand"
          onClick={() => navigateTo('home')}
          type="button"
          aria-label="Ir al inicio"
        >
          <img
            src={`${import.meta.env.BASE_URL}images/battledue-logo.png`}
            alt="BattleDue"
          />
        </button>

        <button
          className={`menu-toggle ${
            menuOpen ? 'is-open' : ''
          }`}
          type="button"
          onClick={() =>
            setMenuOpen(
              (previous) => !previous
            )
          }
          aria-label={
            menuOpen
              ? 'Cerrar menú'
              : 'Abrir menú'
          }
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`site-nav ${
            menuOpen ? 'is-open' : ''
          }`}
          aria-label="Navegación principal"
        >

          <button
            className={
              page === 'home'
                ? 'nav-link active'
                : 'nav-link'
            }
            onClick={() =>
              navigateTo('home')
            }
            type="button"
          >
            Inicio
          </button>

          <button
            className={
              page === 'game'
                ? 'nav-link active'
                : 'nav-link'
            }
            onClick={() =>
              navigateTo('game')
            }
            type="button"
          >
            Jugar
          </button>

          <button
            className={
              page === 'battle'
                ? 'nav-link active'
                : 'nav-link'
            }
            onClick={() =>
              navigateTo('battle')
            }
            type="button"
          >
            ⚔️ Combate
          </button>

          <button
            className={
              page === 'profiles'
                ? 'nav-link active'
                : 'nav-link'
            }
            onClick={() =>
              navigateTo('profiles')
            }
            type="button"
          >
            Personajes
          </button>

        </nav>
      </header>

      <main>

        {page === 'home' && (
          <HomePage
            onPlay={() =>
              navigateTo('game')
            }
            onCharacters={() =>
              navigateTo('profiles')
            }
          />
        )}

        {page === 'game' && (
          <GamePage
            onCharacters={() =>
              navigateTo('profiles')
            }
          />
        )}

        {page === 'battle' && (
          <BattlePage />
        )}

        {page === 'profiles' && (
          <ProfilesPage />
        )}

      </main>
    </div>
  )
}

export default App