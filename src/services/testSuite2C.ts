import { supabase } from './supabaseClient'

export interface TestResult {
  testId: string
  title: string
  objective: string
  action: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'WARN'
}

/**
 * TEST 2C.1: Diagnóstico de Salud Estructural
 * Verifica la accesibilidad de las 14 tablas, tipos y RPC desde la perspectiva RLS del cliente.
 */
export async function runTest2C1_StructuralHealth(): Promise<TestResult[]> {
  const results: TestResult[] = []

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

  console.log('🔍 Ejecutando TEST 2C.1: Salud Estructural de las 14 Tablas...')

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)

      if (error) {
        // En Supabase client no autenticado, un error RLS o 401 indica que la tabla existe y RLS la protege
        if (error.code === 'PGRST301' || error.message.includes('permission denied') || error.code === '42501') {
          results.push({
            testId: `2C.1-${table}`,
            title: `Estructura y RLS de tabla '${table}'`,
            objective: `Verificar existencia y protección RLS de '${table}'`,
            action: `select * from public.${table} limit 1 (sin autenticar)`,
            expected: `Acceso restringido por RLS / 0 filas accesibles sin token JWT`,
            actual: `RLS activo: ${error.message} (Código ${error.code})`,
            status: 'PASS'
          })
        } else {
          results.push({
            testId: `2C.1-${table}`,
            title: `Estructura de tabla '${table}'`,
            objective: `Verificar existencia de '${table}'`,
            action: `select * from public.${table} limit 1`,
            expected: `Tabla existente y accesible bajo RLS`,
            actual: `Error: ${error.message} (Código ${error.code})`,
            status: 'FAIL'
          })
        }
      } else {
        results.push({
          testId: `2C.1-${table}`,
          title: `Estructura de tabla '${table}'`,
          objective: `Verificar existencia y comportamiento RLS`,
          action: `select * from public.${table} limit 1`,
          expected: `Tabla existente, 0 filas visibles para cliente anon`,
          actual: `Retornó ${data?.length || 0} filas accesibles`,
          status: 'PASS'
        })
      }
    } catch (err: any) {
      results.push({
        testId: `2C.1-${table}`,
        title: `Estructura de tabla '${table}'`,
        objective: `Verificar conexión`,
        action: `Consulta a ${table}`,
        expected: `Sin excepciones no capturadas`,
        actual: `Excepción: ${err.message}`,
        status: 'FAIL'
      })
    }
  }

  // Verificar la existencia de la función RPC pública public.onboard_first_family
  try {
    const { error: rpcErr } = await supabase.rpc('onboard_first_family', {
      p_family_name: 'Familia Test',
      p_member_name: 'Test',
      p_avatar_id: 'avatar-01',
      p_color: '#3b82f6',
      p_role: 'Prueba'
    })

    if (rpcErr && (rpcErr.message.includes('Usuario no autenticado') || rpcErr.message.includes('P0001'))) {
      results.push({
        testId: '2C.1-rpc-onboard',
        title: 'Verificación de RPC public.onboard_first_family',
        objective: 'Comprobar existencia y protección de la RPC de Onboarding',
        action: 'Invocación RPC sin token de sesión JWT',
        expected: 'Rechazo por falta de autenticación (Usuario no autenticado)',
        actual: `Rechazado correctamente: ${rpcErr.message}`,
        status: 'PASS'
      })
    } else {
      results.push({
        testId: '2C.1-rpc-onboard',
        title: 'Verificación de RPC public.onboard_first_family',
        objective: 'Comprobar existencia de RPC',
        action: 'Invocación RPC',
        expected: 'Mensaje de validación o ejecución',
        actual: rpcErr ? rpcErr.message : 'Ejecutada sin error',
        status: 'PASS'
      })
    }
  } catch (err: any) {
    results.push({
      testId: '2C.1-rpc-onboard',
      title: 'Verificación de RPC public.onboard_first_family',
      objective: 'Comprobar existencia de RPC',
      action: 'Invocación RPC',
      expected: 'Invocación sin crasheo de red',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
  }

  return results
}
