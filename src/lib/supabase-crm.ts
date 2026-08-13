import { createClient } from "@supabase/supabase-js"

const supabaseCrmUrl = import.meta.env.VITE_SUPABASE_CRM_URL as string | undefined
const supabaseCrmAnonKey = import.meta.env.VITE_SUPABASE_CRM_ANON_KEY as string | undefined

if (!supabaseCrmUrl || !supabaseCrmAnonKey) {
  throw new Error(
    "Missing CRM Supabase config. Set VITE_SUPABASE_CRM_URL and VITE_SUPABASE_CRM_ANON_KEY."
  )
}

export const supabaseCrm = createClient(supabaseCrmUrl, supabaseCrmAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
})
