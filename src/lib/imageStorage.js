import { supabase } from './supabaseClient'

export const BATTLE_DUE_IMAGE_BUCKET = 'battle-due-images'
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const allowedImageTypes = new Set([
  'image/webp',
  'image/png',
  'image/jpeg',
  'image/gif',
])

const extensionByType = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
}

export async function uploadBattleDueImage(file, folder = 'characters') {
  if (!file) throw new Error('Seleccioná una imagen.')
  if (!allowedImageTypes.has(file.type)) {
    throw new Error('Formato no permitido. Usá WebP, PNG, JPG o GIF.')
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('La imagen supera el límite de 5 MB.')
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Iniciá sesión para subir imágenes.')

  const safeFolder = String(folder)
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, '-'))
    .join('/')
  const filePath = `${safeFolder}/${crypto.randomUUID()}.${extensionByType[file.type]}`

  const { error: uploadError } = await supabase.storage
    .from(BATTLE_DUE_IMAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from(BATTLE_DUE_IMAGE_BUCKET)
    .getPublicUrl(filePath)

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  }
}
