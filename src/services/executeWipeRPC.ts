import { supabase } from './supabaseClient'

export async function executeWipeRPC() {
  console.log('⚡ Ejecutando limpieza vía RPC Supabase...')
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
  })

  if (authErr) {
    console.error('❌ Login error:', authErr.message)
    return
  }

  const { data, error } = await supabase.rpc('wipe_family_test_data')
  if (error) {
    console.warn('⚠️ Error al llamar wipe_family_test_data (tal vez falta crear la función en el Dashboard SQL de Supabase):', error.message)
  } else {
    console.log('🎉 RPC wipe_family_test_data ejecutada con exito:', data)
  }
}

executeWipeRPC()
