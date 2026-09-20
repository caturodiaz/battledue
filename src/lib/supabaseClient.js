import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabaseClient = createClient(
  supabaseUrl,
  supabasePublishableKey
)

const originalRpc = supabaseClient.rpc.bind(supabaseClient)

supabaseClient.rpc = (functionName, params, options) => {
  const resolvedFunctionName =
    functionName === 'process_online_battle_action'
      ? 'process_online_battle_action_v2'
      : functionName

  return originalRpc(resolvedFunctionName, params, options)
}

export const supabase = supabaseClient
