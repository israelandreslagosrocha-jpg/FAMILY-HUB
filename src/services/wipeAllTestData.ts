import { supabase } from './supabaseClient'

export async function wipeAllTestData() {
  console.log('🧹 Vaciando todo el historial de transferencias, gastos y registros de prueba en Supabase...')

  // 1. Iniciar sesión como Israel
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
  })

  if (authErr) {
    console.error('❌ Error de autenticación:', authErr.message)
    return
  }

  console.log('✅ Autenticado como:', authData.user.email)

  // 2. Eliminar todas las transferencias de prueba
  const { error: trfErr } = await supabase.from('transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (trfErr) {
    console.warn('⚠️ Error al vaciar transfers:', trfErr.message)
  } else {
    console.log('✅ Tabla transfers vaciada completamente')
  }

  // 3. Eliminar todos los gastos e ingresos de prueba
  const { error: expErr } = await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (expErr) console.warn('⚠️ Error al vaciar expenses:', expErr.message)
  else console.log('✅ Tabla expenses vaciada completamente')

  const { error: incErr } = await supabase.from('incomes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (incErr) console.warn('⚠️ Error al vaciar incomes:', incErr.message)
  else console.log('✅ Tabla incomes vaciada completamente')

  // 4. Vaciar historial de auditoría
  const { error: logErr } = await supabase.from('history_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (logErr) console.warn('⚠️ Error al vaciar history_logs:', logErr.message)
  else console.log('✅ Tabla history_logs vaciada completamente')

  // 5. Eliminar la cuenta antigua "Esposa (Prueba 4D)" o cualquier miembro inactivo
  const { error: memErr } = await supabase.from('family_members').delete().ilike('name', '%Prueba%')
  if (memErr) console.warn('⚠️ Error al eliminar miembros de prueba:', memErr.message)
  else console.log('✅ Miembros de prueba eliminados')

  console.log('🎉 Limpieza total completada con éxito en Supabase.')
}

wipeAllTestData()
