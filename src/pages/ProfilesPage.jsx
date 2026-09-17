import { useState } from 'react'
import CharacterProfile from '../components/CharacterProfile'
import ProfileEditor from '../components/ProfileEditor'
import { profileDefaults } from '../data/profileDefaults'
import { useCharacters } from '../hooks/useCharacters'

function ProfilesPage() {
  const { characters, editCharacter } = useCharacters()
  const [selectedId, setSelectedId] = useState(characters[0]?.id || '')
  const [notice, setNotice] = useState('')
  const character = characters.find((item) => item.id === selectedId)
  if (!character) return <section className="empty-state"><h2>No hay personajes disponibles</h2><p>Crea un personaje antes de diseñar su perfil.</p></section>
  const profile = { ...profileDefaults, ...character.profile, stats: { ...profileDefaults.stats, ...character.profile?.stats } }
  return <section className="profiles-page"><div className="page-heading"><div><p className="eyebrow">Fichas de combate</p><h1>Perfiles</h1><p>Personaliza la presentación de cada personaje.</p></div><label className="field character-picker">Personaje<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{characters.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>{notice && <p className="notice">{notice}</p>}<div className="profile-workspace"><ProfileEditor key={character.id} character={character} onSave={(newProfile) => { editCharacter(character.id, { profile: newProfile }); setNotice('Perfil guardado.') }} /><div className="profile-preview"><p className="eyebrow">Vista previa</p><CharacterProfile character={character} profile={profile} /></div></div></section>
}

export default ProfilesPage
