import { useState } from 'react'
import { addCharacter, deleteCharacter, getCharacters, replaceCharacters, updateCharacter } from '../utils/storage'

export function useCharacters() { const [characters, setCharacters] = useState(getCharacters); return { characters, createCharacter: (character) => setCharacters(addCharacter(character)), editCharacter: (id, changes) => setCharacters(updateCharacter(id, changes)), removeCharacter: (id) => setCharacters(deleteCharacter(id)), importCharacters: (items) => setCharacters(replaceCharacters(items)) } }
