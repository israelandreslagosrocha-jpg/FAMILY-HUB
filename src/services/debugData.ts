import { supabase } from './supabaseClient'

async function debugData() {
  const email = 'israel@familyhub.cl'
  const password = 'P#2?hqfa2WK5Y$M'

  await supabase.auth.signInWithPassword({ email, password })

  const { data: members, error: memErr } = await supabase.from('family_members').select('*')
  console.log('MEMBERS:', members, 'ERR:', memErr)

  const { data: cats, error: catErr } = await supabase.from('categories').select('*')
  console.log('CATEGORIES count:', cats?.length, 'ERR:', catErr)
}

debugData()
