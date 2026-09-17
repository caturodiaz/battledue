import { useState } from 'react'
import HomePage from './pages/HomePage'
import CharactersPage from './pages/CharactersPage'
import GamePage from './pages/GamePage'
import ProfilesPage from './pages/ProfilesPage'
import './App.css'

function App() {
  const [page, setPage] = useState('home')
  return <div className="app-shell"><header className="site-header"><button className="brand" onClick={() => setPage('home')} type="button"><img src={`${import.meta.env.BASE_URL}images/battledue-logo.png`} alt="BattleDue" /></button><nav aria-label="Navegación principal"><button className={page === 'home' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('home')} type="button">Inicio</button><button className={page === 'game' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('game')} type="button">Jugar</button><button className={page === 'characters' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('characters')} type="button">Personajes</button><button className={page === 'profiles' ? 'nav-link active' : 'nav-link'} onClick={() => setPage('profiles')} type="button">Perfiles</button></nav></header><main>{page === 'home' && <HomePage onPlay={() => setPage('game')} onCharacters={() => setPage('characters')} />}{page === 'game' && <GamePage onCharacters={() => setPage('characters')} />}{page === 'characters' && <CharactersPage />}{page === 'profiles' && <ProfilesPage />}</main></div>
}
export default App
