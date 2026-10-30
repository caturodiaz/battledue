import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { uploadBattleDueImage, MAX_IMAGE_SIZE } from '../lib/imageStorage'
import './StorageImageField.css'

function StorageImageField({ label, value, onChange, folder, placeholder = 'https://...' }) {
  const { profile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')
    setUploading(true)

    try {
      const result = await uploadBattleDueImage(file, folder)
      onChange(result.publicUrl)
      setSuccess('Imagen subida a Supabase Storage.')
    } catch (uploadError) {
      console.error('Error subiendo imagen:', uploadError)
      setError(uploadError.message || 'No se pudo subir la imagen.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="storage-image-field">
      <label className="field-label">{label}</label>
      <input
        type="url"
        value={value || ''}
        onChange={(event) => {
          setError('')
          setSuccess('')
          onChange(event.target.value)
        }}
        placeholder={placeholder}
      />

      <div className="storage-image-field__actions">
        {profile?.role === 'admin' ? (
          <label className={`button secondary small storage-image-field__upload ${uploading ? 'is-loading' : ''}`}>
            {uploading ? 'Subiendo...' : '↑ Subir a Supabase'}
            <input
              type="file"
              accept="image/webp,image/png,image/jpeg,image/gif"
              onChange={handleFileChange}
              disabled={uploading}
              aria-label="Seleccionar imagen para subir a Supabase Storage"
            />
          </label>
        ) : (
          <span className="storage-image-field__hint">La carga directa está disponible para administradores.</span>
        )}
        <span className="storage-image-field__hint">WebP, PNG, JPG o GIF · Máx. {MAX_IMAGE_SIZE / 1024 / 1024} MB</span>
      </div>

      {uploading && <p className="storage-image-field__status" role="status">Subiendo imagen...</p>}
      {success && <p className="storage-image-field__success" role="status">{success}</p>}
      {error && <p className="storage-image-field__error" role="alert">{error}</p>}
      {value && (
        <img
          className="storage-image-field__preview"
          src={value}
          alt="Vista previa de la imagen"
          loading="lazy"
        />
      )}
    </div>
  )
}

export default StorageImageField
