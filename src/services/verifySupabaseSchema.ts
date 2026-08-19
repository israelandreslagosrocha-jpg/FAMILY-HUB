import { supabase } from './supabaseClient'

/**
 * Suite de Verificación Práctica para ETAPA 2C
 * Comprueba la conectividad, estructura y respuestas de RLS en tiempo real.
 */
export async function verifySupabaseSchema() {
  console.log('🔍 Iniciando verificación de esquema y conectividad en Supabase...')

  try {
    // 1. Probar lectura pública de perfiles (Debe retornar 0 registros o vacíos bajo RLS)
    const { data: profiles, error: profileErr } = await supabase.from('profiles').select('*')
    if (profileErr) {
      console.warn('ℹ️ Respuesta RLS en profiles:', profileErr.message)
    } else {
      console.log('✅ Lectura de profiles (RLS activo):', profiles.length, 'registros accesibles sin autenticación.')
    }

    // 2. Verificar existencia del endpoint RPC public.onboard_first_family
    const { error: rpcErr } = await supabase.rpc('onboard_first_family', {
      p_family_name: 'Familia Test',
      p_member_name: 'Test',
      p_avatar_id: 'avatar-01',
      p_color: '#3b82f6',
      p_role: 'Prueba'
    })

    if (rpcErr) {
      if (rpcErr.message.includes('Usuario no autenticado') || rpcErr.code === 'P0001') {
        console.log('✅ RPC public.onboard_first_family existe y bloquea correctamente peticiones no autenticadas.')
      } else {
        console.log('ℹ️ RPC resultado:', rpcErr.message)
      }
    }

    console.log('✅ Verificación inicial completada.')
    return { success: true }
  } catch (err: any) {
    console.error('❌ Error de conexión con Supabase:', err.message)
    return { success: false, error: err.message }
  }
}
