import { supabase } from './supabaseClient'

export async function executeWipeRPC() {
  console.log('⚡ Ejecutando limpieza vía RPC Supabase...')
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_TEST_USER_EMAIL || 'israel@familyhub.cl',
    password: import.meta.env.VITE_TEST_USER_PASSWORD || ''
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
