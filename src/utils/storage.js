import { defaultCharacters } from '../data/defaultCharacters'

const STORAGE_KEY = 'battledue_characters'

export function getCharacters() { try { const value = localStorage.getItem(STORAGE_KEY); const characters = value ? JSON.parse(value) : defaultCharacters; return Array.isArray(characters) ? characters : defaultCharacters } catch { return defaultCharacters } }
export function saveCharacters(characters) { localStorage.setItem(STORAGE_KEY, JSON.stringify(characters)); return characters }
export function addCharacter(character) { return saveCharacters([...getCharacters(), { ...character, id: crypto.randomUUID() }]) }
export function updateCharacter(id, changes) { return saveCharacters(getCharacters().map((character) => character.id === id ? { ...character, ...changes, id } : character)) }
export function deleteCharacter(id) { return saveCharacters(getCharacters().filter((character) => character.id !== id)) }
export function replaceCharacters(characters) { return saveCharacters(characters) }
export { STORAGE_KEY }
