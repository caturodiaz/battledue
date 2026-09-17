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

    if (!values.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    const cleanedCharacter = {
      ...values,

      name: values.name.trim(),

      image: values.image?.trim() || '',
      age: values.age?.trim() || '',
      gender: values.gender?.trim() || '',
      species: values.species?.trim() || '',
      alignment: values.alignment?.trim() || '',
      power: values.power?.trim() || '',
      weapon: values.weapon?.trim() || '',

      abilities: values.abilities
        .map((item) => item.trim())
        .filter(Boolean),
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
                value={values[name] || ''}
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
            value={values.abilities.join(', ')}
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