import { useState } from 'react'
import {
  characterFields,
  emptyCharacter,
} from '../data/characterFields'

function CharacterForm({
  character,
  onSave,
  onCancel,
}) {
  const [values, setValues] = useState(() => ({
    ...emptyCharacter,
    ...character,
    abilities: character?.abilities || [],
  }))

  const [error, setError] = useState('')

  const updateValue = (name, value) => {
    setValues((previousValues) => ({
      ...previousValues,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!String(values.name || '').trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    const cleanedCharacter = {
      ...values,

      name: String(values.name || '').trim(),

      image: String(values.image || '').trim(),

      age:
        values.age === '' ||
        values.age === null ||
        values.age === undefined
          ? ''
          : Number(values.age),

      gender: String(values.gender || '').trim(),

      species: String(values.species || '').trim(),

      alignment: String(values.alignment || '').trim(),

      power: String(values.power || '').trim(),

      weapon: String(values.weapon || '').trim(),

      abilities: Array.isArray(values.abilities)
        ? values.abilities
            .map((item) =>
              String(item).trim()
            )
            .filter(Boolean)
        : [],
    }

    onSave(cleanedCharacter)
  }

  return (
    <section className="form-panel">

      <div className="form-header">

        <div>
          <p className="eyebrow">
            Administrador
          </p>

          <h2>
            {character
              ? 'Editar personaje'
              : 'Nuevo personaje'}
          </h2>
        </div>

        <button
          className="icon-button"
          onClick={onCancel}
          type="button"
          aria-label="Cerrar formulario"
        >
          ×
        </button>

      </div>

      <form
        className="character-form"
        onSubmit={handleSubmit}
      >

        {characterFields.map(
          ([name, label, type]) => (
            <label
              className="field"
              key={name}
            >
              {label}

              <input
                name={name}
                type={type}
                value={
                  values[name] ?? ''
                }
                onChange={(event) =>
                  updateValue(
                    name,
                    event.target.value
                  )
                }
              />
            </label>
          )
        )}

        <label className="field full-width">
          Habilidades

          <input
            value={
              Array.isArray(
                values.abilities
              )
                ? values.abilities.join(', ')
                : ''
            }
            onChange={(event) =>
              updateValue(
                'abilities',
                event.target.value.split(',')
              )
            }
            placeholder="Separadas por comas"
          />
        </label>

        {error && (
          <p className="error full-width">
            {error}
          </p>
        )}

        <div className="form-actions">

          <button
            className="button secondary"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>

          <button
            className="button"
            type="submit"
          >
            Guardar personaje
          </button>

        </div>

      </form>

    </section>
  )
}

export default CharacterForm