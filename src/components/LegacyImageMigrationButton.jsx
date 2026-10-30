import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function LegacyImageMigrationButton() {
  const [isMigrating, setIsMigrating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleMigration = async () => {
    const confirmed = window.confirm(
      'Se intentarán copiar a Supabase Storage todas las imágenes que todavía usan ImgBB. Las URL originales solo se reemplazarán cuando la copia y la actualización en la base de datos tengan éxito. ¿Continuar?'
    )
    if (!confirmed) return

    setIsMigrating(true)
    setError('')
    setResult(null)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('migrate-imgbb-images')
      if (invokeError) throw invokeError
      setResult(data)
    } catch (migrationError) {
      console.error('Error migrando imágenes de ImgBB:', migrationError)
      setError(migrationError.message || 'No se pudo ejecutar la migración.')
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <div className="legacy-image-migration">
      <button className="button secondary" type="button" onClick={handleMigration} disabled={isMigrating}>
        {isMigrating ? 'Migrando imágenes...' : 'Migrar imágenes de ImgBB'}
      </button>
      {result && (
        <p className="legacy-image-migration__result" role="status">
          Migración finalizada: {result.migratedReferences} referencias actualizadas en {result.migratedFiles} archivos. {result.failedReferences} errores. Recargá la página para ver los cambios.
        </p>
      )}
      {error && <p className="legacy-image-migration__error" role="alert">{error}</p>}
    </div>
  )
}

export default LegacyImageMigrationButton
