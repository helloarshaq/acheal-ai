import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const getSupabaseClient = () => {
  return createClientComponentClient()
}
