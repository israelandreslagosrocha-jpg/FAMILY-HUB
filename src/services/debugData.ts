import { supabase } from './supabaseClient'

async function debugData() {
  const email = import.meta.env.VITE_TEST_USER_EMAIL || 'israel@familyhub.cl'
  const password = import.meta.env.VITE_TEST_USER_PASSWORD || ''

  await supabase.auth.signInWithPassword({ email, password })

  const { data: members, error: memErr } = await supabase.from('family_members').select('*')
  console.log('MEMBERS:', members, 'ERR:', memErr)

  const { data: cats, error: catErr } = await supabase.from('categories').select('*')
  console.log('CATEGORIES count:', cats?.length, 'ERR:', catErr)
}

debugData()
