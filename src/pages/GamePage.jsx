import { useState } from 'react'
import { useCharacters } from '../hooks/useCharacters'

const comparisonFields = [
  ['age', 'Edad'],
  ['gender', 'Género'],
  ['species', 'Especie'],
  ['alignment', 'Alineación'],
  ['power', 'Poder'],
  ['weapon', 'Arma'],
]

function getCharacterImage(character) {
  return (
    character.profile?.primaryImage ||
    character.image ||
    ''
  )
}

function formatFieldValue(
  character,
  key
) {
  const value = character?.[key]

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '—'
  }

  if (key === 'age') {
    return `${value} años`
  }

  return value
}

function GamePage({ onCharacters }) {
  const { characters } = useCharacters()

  const [targetId, setTargetId] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [guesses, setGuesses] = useState([])
  const [hasWon, setHasWon] = useState(false)

  const target = characters.find(
    (character) =>
      character.id === targetId
  )

  function startGame() {
    if (characters.length < 2) {
      return
    }

    const randomCharacter =
      characters[
        Math.floor(
          Math.random() *
            characters.length
        )
      ]

    setTargetId(
      randomCharacter.id
    )

    setSelectedId('')
    setQuery('')
    setGuesses([])
    setHasWon(false)
  }

  function submitGuess(event) {
    event.preventDefault()

    const guessedCharacter =
      characters.find(
        (character) =>
          character.id === selectedId
      )

    if (
      !guessedCharacter ||
      !target ||
      guesses.some(
        (guess) =>
          guess.id ===
          guessedCharacter.id
      )
    ) {
      return
    }

    /*
     * Agregamos el nuevo intento
     * al principio del array.
     *
     * Antes:
     * [...guesses, guessedCharacter]
     *
     * Ahora:
     * [guessedCharacter, ...guesses]
     */

    setGuesses(
      (previousGuesses) => [
        guessedCharacter,
        ...previousGuesses,
      ]
    )

    setSelectedId('')
    setQuery('')

    if (
      guessedCharacter.id ===
      target.id
    ) {
      setHasWon(true)
    }
  }

  function isMatch(
    character,
    key
  ) {
    const guessValue =
      character[key]

    const targetValue =
      target?.[key]

    if (
      guessValue === undefined ||
      guessValue === null ||
      guessValue === '' ||
      targetValue === undefined ||
      targetValue === null ||
      targetValue === ''
    ) {
      return false
    }

    return (
      String(guessValue).trim() ===
      String(targetValue).trim()
    )
  }

  function getAgeHint(character) {
    const guessAge = Number(
      character?.age
    )

    const targetAge = Number(
      target?.age
    )

    if (
      !Number.isFinite(guessAge) ||
      !Number.isFinite(targetAge)
    ) {
      return null
    }

    if (guessAge === targetAge) {
      return null
    }

    if (guessAge < targetAge) {
      return '↑'
    }

    return '↓'
  }

  if (characters.length < 2) {
    return (
      <section className="game-page">

        <p className="eyebrow">
          Modo de juego
        </p>

        <h1>
          El duelo necesita{' '}
          <span>rivales.</span>
        </h1>

        <div className="empty-state game-empty">

          <h2>
            Agrega al menos dos personajes
          </h2>

          <p>
            El personaje secreto se
            elige de tu elenco. Cuando
            tengas dos o más, podrás
            comenzar a adivinar.
          </p>

          <button
            className="button"
            onClick={onCharacters}
            type="button"
          >
            Ir a personajes
          </button>

        </div>

      </section>
    )
  }

  const availableCharacters =
    characters.filter(
      (character) =>
        !guesses.some(
          (guess) =>
            guess.id ===
            character.id
        )
    )

  const normalizedQuery =
    query
      .toLocaleLowerCase()
      .trim()

  const matches =
    availableCharacters.filter(
      (character) =>
        character.name
          .toLocaleLowerCase()
          .includes(
            normalizedQuery
          )
    )

  return (
    <section className="game-page">

      <div className="game-heading">

        <div>

          <p className="eyebrow">
            Modo de juego
          </p>

          <h1>
            ¿Quién es el{' '}
            <span>personaje?</span>
          </h1>

          <p>
            Escribe un nombre y elige
            un personaje por intento.
            Los atributos en rojo no
            coinciden con el personaje
            secreto.
          </p>

        </div>

        <button
          className="button secondary"
          onClick={startGame}
          type="button"
        >
          Nueva partida
        </button>

      </div>

      {!target ? (

        <div className="empty-state game-empty">

          <h2>
            Preparado para el duelo
          </h2>

          <p>
            Se elegirá un personaje
            secreto de tu elenco.
          </p>

          <button
            className="button"
            onClick={startGame}
            type="button"
          >
            Comenzar
          </button>

        </div>

      ) : (

        <>

          <form
            className="guess-form"
            onSubmit={submitGuess}
          >

            <label className="field">

              Tu intento

              <div className="character-search">

                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(
                      event.target.value
                    )

                    setSelectedId('')
                  }}
                  placeholder="Escribe un personaje..."
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={
                    Boolean(query) &&
                    !selectedId
                  }
                />

                {query &&
                  !selectedId && (
                    <div
                      className="suggestions"
                      role="listbox"
                    >

                      {matches.length ? (
                        matches.map(
                          (character) => (
                            <button
                              key={
                                character.id
                              }
                              onClick={() => {
                                setSelectedId(
                                  character.id
                                )

                                setQuery(
                                  character.name
                                )
                              }}
                              role="option"
                              type="button"
                            >

                              {getCharacterImage(
                                character
                              ) && (
                                <img
                                  src={getCharacterImage(
                                    character
                                  )}
                                  alt=""
                                />
                              )}

                              <span>
                                {
                                  character.name
                                }
                              </span>

                            </button>
                          )
                        )
                      ) : (
                        <p>
                          No se encontró
                          ningún personaje.
                        </p>
                      )}

                    </div>
                  )}

              </div>

            </label>

            <button
              className="button"
              disabled={
                !selectedId ||
                hasWon
              }
              type="submit"
            >
              Adivinar
            </button>

          </form>

          {hasWon && (
            <div
              className="win-message"
              role="status"
            >

              <strong>
                ¡Duelo ganado!
              </strong>

              {' '}Adivinaste a{' '}
              {target.name}.

              <button
                onClick={startGame}
                type="button"
              >
                Jugar otra vez
              </button>

            </div>
          )}

          {guesses.length > 0 && (
            <div className="guess-table">

              <div className="guess-header">

                <span>
                  Personaje
                </span>

                {comparisonFields.map(
                  ([, label]) => (
                    <span key={label}>
                      {label}
                    </span>
                  )
                )}

              </div>

              {guesses.map(
                (guess) => (
                  <div
                    className="guess-row"
                    key={guess.id}
                  >

                    <span
                      className={
                        guess.id ===
                        target.id
                          ? 'guess-name is-match'
                          : 'guess-name'
                      }
                      style={{
                        '--reveal-delay':
                          '0ms',
                      }}
                    >

                      {getCharacterImage(
                        guess
                      ) ? (
                        <img
                          src={getCharacterImage(
                            guess
                          )}
                          alt=""
                        />
                      ) : (
                        <span className="guess-avatar">
                          {guess.name?.[0] ||
                            '?'}
                        </span>
                      )}

                      <strong>
                        {guess.name}
                      </strong>

                    </span>

                    {comparisonFields.map(
                      (
                        [key],
                        index
                      ) => {

                        const match =
                          isMatch(
                            guess,
                            key
                          )

                        return (
                          <span
                            className={
                              match
                                ? 'is-match'
                                : 'is-miss'
                            }
                            key={key}
                            style={{
                              '--reveal-delay': `${
                                (index + 1) * 180
                              }ms`,
                            }}
                          >
                          {key === 'age' && !match && (
                            <span
                              className={`age-hint ${
                                getAgeHint(guess) === '↑'
                                  ? 'age-hint-up'
                                  : 'age-hint-down'
                              }`}
                            >
                              <span className="age-hint-arrow">
                                {getAgeHint(guess) === '↑'
                                  ? '▲'
                                  : '▼'}
                              </span>
                            </span>
                          )}

                            {formatFieldValue(
                              guess,
                              key
                            )}
                          </span>
                        )
                      }
                    )}

                  </div>
                )
              )}

            </div>
          )}

        </>

      )}

    </section>
  )
}

export default GamePage