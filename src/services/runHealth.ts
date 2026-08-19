import { supabase } from './supabaseClient'

async function runHealthCheck() {
  const tables = [
    'families',
    'profiles',
    'family_members',
    'categories',
    'responsibilities',
    'recurrence_rules',
    'task_series',
    'task_instances',
    'events',
    'event_members',
    'expenses',
    'incomes',
    'budgets',
    'history_logs'
  ]

  console.log('=== ETAPA 2C.1: DIAGNÓSTICO DE SALUD ESTRUCTURAL EN SUPABASE ===\n')

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`[${table}]: RLS_PROTECTED (${error.code}) - ${error.message}`)
    } else {
      console.log(`[${table}]: OK_ACCESSIBLE - Retornó ${data.length} filas`)
    }
  }

  console.log('\n--- VERIFICACIÓN RPC PUBLIC.ONBOARD_FIRST_FAMILY ---')
  const { data: rpcData, error: rpcError } = await supabase.rpc('onboard_first_family', {
    p_family_name: 'Test',
    p_member_name: 'Test',
    p_avatar_id: 'avatar-01',
    p_color: '#3b82f6',
    p_role: 'Test'
  })

  if (rpcError) {
    console.log(`[onboard_first_family]: RECHAZADA_CORRECTAMENTE - ${rpcError.message}`)
  } else {
    console.log(`[onboard_first_family]: RESULTADO -`, rpcData)
  }
}

runHealthCheck()
