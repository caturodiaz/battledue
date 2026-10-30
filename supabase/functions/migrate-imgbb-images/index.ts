import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKET = 'battle-due-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/gif'])
const EXTENSIONS = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isImgBbUrl(value) {
  if (typeof value !== 'string' || !value) return false
  try {
    return new URL(value).hostname === 'i.ibb.co'
  } catch {
    return false
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405)
  }

  const authorization = request.headers.get('Authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return jsonResponse({ error: 'Sesión requerida.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Falta configuración interna de Supabase.' }, 500)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !authData?.user) {
    return jsonResponse({ error: 'La sesión no es válida.' }, 401)
  }

  const { data: userProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .single()

  if (profileError || userProfile?.role !== 'admin') {
    return jsonResponse({ error: 'Solo un administrador puede migrar imágenes.' }, 403)
  }

  const { data: characters, error: charactersError } = await adminClient
    .from('characters')
    .select('id, name, image, profile')

  if (charactersError) {
    return jsonResponse({ error: 'No se pudieron consultar los personajes.' }, 500)
  }

  const migratedByUrl = new Map()
  const failures = []
  let migratedReferences = 0
  let migratedFiles = 0

  async function migrateUrl(url, character, field) {
    if (!isImgBbUrl(url)) return url
    if (migratedByUrl.has(url)) {
    migratedReferences += 1
    return migratedByUrl.get(url)
  }

    try {
      const response = await fetch(url, { redirect: 'follow' })
      if (!response.ok) throw new Error(`ImgBB respondió HTTP ${response.status}.`)

      const finalUrl = new URL(response.url)
      if (finalUrl.hostname !== 'i.ibb.co') {
        throw new Error('La URL redirigió a un dominio no permitido.')
      }

      const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (!ALLOWED_TYPES.has(contentType)) {
        throw new Error(`Formato no compatible: ${contentType || 'desconocido'}.`)
      }

      const declaredSize = Number(response.headers.get('content-length') || 0)
      if (declaredSize > MAX_FILE_SIZE) throw new Error('La imagen supera el límite de 5 MB.')

      const blob = await response.blob()
      if (blob.size > MAX_FILE_SIZE) throw new Error('La imagen supera el límite de 5 MB.')

      const filePath = `characters/${character.id}/migrated/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`
      const { error: uploadError } = await adminClient.storage
        .from(BUCKET)
        .upload(filePath, blob, {
          cacheControl: '31536000',
          contentType,
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data } = adminClient.storage.from(BUCKET).getPublicUrl(filePath)
      migratedByUrl.set(url, data.publicUrl)
      migratedFiles += 1
      migratedReferences += 1
      return data.publicUrl
    } catch (error) {
      failures.push({
        character: character.name,
        field,
        reason: error?.message || 'Error desconocido.',
      })
      return url
    }
  }

  let updatedCharacters = 0

  for (const character of characters || []) {
    let changed = false
    const nextProfile = { ...(character.profile || {}) }

    if (isImgBbUrl(character.image)) {
      const nextImage = await migrateUrl(character.image, character, 'image')
      if (nextImage !== character.image) {
        character.image = nextImage
        changed = true
      }
    }

    for (const field of ['primaryImage', 'ultimateImage']) {
      if (isImgBbUrl(nextProfile[field])) {
        const nextUrl = await migrateUrl(nextProfile[field], character, field)
        if (nextUrl !== nextProfile[field]) {
          nextProfile[field] = nextUrl
          changed = true
        }
      }
    }

    if (Array.isArray(nextProfile.galleryImages)) {
      const nextGallery = []
      for (let index = 0; index < nextProfile.galleryImages.length; index += 1) {
        const item = nextProfile.galleryImages[index]
        if (typeof item === 'string') {
          nextGallery.push(await migrateUrl(item, character, `galleryImages[${index}]`))
        } else if (item && typeof item === 'object') {
          const nextUrl = await migrateUrl(item.url, character, `galleryImages[${index}]`)
          nextGallery.push(nextUrl === item.url ? item : { ...item, url: nextUrl })
        } else {
          nextGallery.push(item)
        }
      }
      if (JSON.stringify(nextGallery) !== JSON.stringify(nextProfile.galleryImages)) {
        nextProfile.galleryImages = nextGallery
        changed = true
      }
    }

    if (changed) {
      const { error: updateError } = await adminClient
        .from('characters')
        .update({ image: character.image || '', profile: nextProfile })
        .eq('id', character.id)

      if (updateError) {
        failures.push({
          character: character.name,
          field: 'database',
          reason: updateError.message,
        })
      } else {
        updatedCharacters += 1
      }
    }
  }

  return jsonResponse({
    scannedCharacters: characters?.length || 0,
    updatedCharacters,
    migratedFiles,
    migratedReferences,
    failedReferences: failures.length,
    failures,
  })
})
