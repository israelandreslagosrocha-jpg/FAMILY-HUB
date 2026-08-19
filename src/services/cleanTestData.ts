import { supabase } from './supabaseClient'

export async function cleanTestData() {
  console.log('🧹 Limpiando registros de prueba de Supabase...')

  // 1. Iniciar sesión
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
  })

  if (authErr) {
    console.error('❌ Error de login:', authErr.message)
    return
  }

  console.log('✅ Autenticado como:', authData.user.email)

  // 2. Desactivar / Eliminar 'Esposa (Prueba 4D)'
  const { error: updErr } = await supabase
    .from('family_members')
    .update({ is_active: false })
    .eq('name', 'Esposa (Prueba 4D)')

  if (updErr) {
    console.warn('⚠️ Error al actualizar Esposa (Prueba 4D):', updErr.message)
  } else {
    console.log('✅ "Esposa (Prueba 4D)" desactivada en family_members')
  }

  const { error: delMemErr } = await supabase
    .from('family_members')
    .delete()
    .eq('name', 'Esposa (Prueba 4D)')

  if (delMemErr) {
    console.warn('⚠️ Intentó borrado físico de Esposa (Prueba 4D):', delMemErr.message)
  } else {
    console.log('✅ "Esposa (Prueba 4D)" eliminada de family_members')
  }

  // 3. Borrar transferencias de prueba 6C.3 y 6D
  const { error: trfErr } = await supabase
    .from('transfers')
    .delete()
    .or('description.ilike.%6C.3%,description.ilike.%6D%')

  if (trfErr) {
    console.warn('⚠️ Error al eliminar transferencias:', trfErr.message)
  } else {
    console.log('✅ Transferencias 6C.3 y 6D eliminadas de transfers')
  }

  // 4. Borrar cualquier gasto de prueba si existiera
  await supabase.from('expenses').delete().or('title.ilike.%Prueba%,title.ilike.%Test%')

  console.log('🎉 Limpieza finalizada.')
}

cleanTestData()
