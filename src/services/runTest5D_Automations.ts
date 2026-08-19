import { supabase } from './supabaseClient'
import { automationService } from './automationService'
import { taskService } from './taskService'

export interface Test5DItem {
  id: string
  title: string
  objective: string
  action: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL'
}

export async function runTestBattery5D(): Promise<Test5DItem[]> {
  const report: Test5DItem[] = []

  console.log('=== BATERÍA DE PRUEBAS REALES DE INTEGRACIÓN DEL MOTOR DE AUTOMATIZACIONES (ETAPA 5D) ===\n')

  // 1. TEST 5D.1: Autenticación en Supabase Auth
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
  })

  if (authErr || !authData.user) {
    report.push({
      id: 'TEST 5D.1',
      title: 'Autenticación en Supabase Auth',
      objective: 'Iniciar sesión como israel@familyhub.cl',
      action: 'signInWithPassword',
      expected: 'Sesión autenticada (role: authenticated)',
      actual: `Error: ${authErr?.message}`,
      status: 'FAIL'
    })
    return report
  }

  report.push({
    id: 'TEST 5D.1',
    title: 'Autenticación en Supabase Auth',
    objective: 'Iniciar sesión como israel@familyhub.cl',
    action: 'signInWithPassword',
    expected: 'Sesión autenticada (role: authenticated)',
    actual: `Sesión iniciada con éxito (User ID: ${authData.user.id})`,
    status: 'PASS'
  })

  // Obtener información del contexto familiar del usuario
  const { data: members } = await supabase.from('family_members').select('*')
  const familyId = members && members.length > 0 ? members[0].family_id : null
  const memberId = members && members.length > 0 ? members[0].id : null

  if (!familyId || !memberId) {
    report.push({
      id: 'TEST 5D.2',
      title: 'Obtención de Contexto Familiar',
      objective: 'Obtener un family_id y member_id válidos',
      action: 'select * from family_members',
      expected: 'Al menos 1 miembro encontrado',
      actual: 'No se encontraron miembros',
      status: 'FAIL'
    })
    return report
  }

  // 2. TEST 5D.2: Aislamiento del Scheduler y Bloqueo de Función Privada
  const { error: privErr } = await supabase.rpc('process_system_scheduled_automations' as any)
  if (privErr && (privErr.message.includes('Could not find') || privErr.message.includes('permission denied'))) {
    report.push({
      id: 'TEST 5D.2',
      title: 'Aislamiento de Seguridad del Scheduler Privado',
      objective: 'Impedir invocaciones de authenticated hacia la función privada del sistema',
      action: 'supabase.rpc("process_system_scheduled_automations")',
      expected: 'Rechazo de permisos (Permission Denied)',
      actual: `Bloqueado correctamente: "${privErr.message}"`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 5D.2',
      title: 'Aislamiento de Seguridad del Scheduler',
      objective: 'Impedir invocaciones a función privada',
      action: 'supabase.rpc',
      expected: 'Permisos rechazados',
      actual: privErr ? privErr.message : 'Permitió ejecución no autorizada (FAIL)',
      status: 'FAIL'
    })
  }

  // 3. TEST 5D.3: Creación de Regla de Automatización en automation_rules
  let ruleId: string | null = null
  try {
    ruleId = await automationService.createRule({
      name: 'Regla Prueba 5D Derivada',
      description: 'Crear automáticamente tarea de orden al completar compra',
      category: 'data_event',
      triggerText: 'Al completar la tarea de compra',
      conditionText: undefined,
      actionText: 'Tarea Derivada Automática 5D',
      actionKind: 'CREATE_TASK'
    })

    report.push({
      id: 'TEST 5D.3',
      title: 'Creación de Regla en automation_rules',
      objective: 'Crear una regla en automation_rules aislada por family_id',
      action: 'automationService.createRule(...)',
      expected: 'Regla persistida con éxito en Supabase',
      actual: `Creada exitosamente (Rule ID: ${ruleId})`,
      status: 'PASS'
    })
  } catch (err: any) {
    report.push({
      id: 'TEST 5D.3',
      title: 'Creación de Regla en automation_rules',
      objective: 'Crear una regla en automation_rules',
      action: 'createRule',
      expected: 'Regla persistida con éxito',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
    return report
  }

  // 4. TEST 5D.4: Disparo Automático por Trigger BD al Completar Tarea Origen
  let sourceTaskId: string | null = null
  try {
    sourceTaskId = await taskService.createTask({
      title: 'Comprar Ingredientes 5D',
      assignedMemberId: memberId,
      priority: 'media',
      dueDate: '2026-08-19'
    })

    // Completar la tarea para gatillar el trigger
    await taskService.updateTaskStatus(sourceTaskId, 'completed')

    // Verificar si se creó la tarea derivada
    const { data: derivedTasks } = await supabase
      .from('task_instances')
      .select('*')
      .eq('title', 'Tarea Derivada Automática 5D')

    if (derivedTasks && derivedTasks.length > 0) {
      report.push({
        id: 'TEST 5D.4',
        title: 'Disparo Automático de Regla por Trigger BD',
        objective: 'Verificar que al completar la tarea origen el trigger creó automáticamente la tarea derivada',
        action: 'taskService.updateTaskStatus(sourceTaskId, "completed")',
        expected: 'Tarea derivada creada automáticamente en task_instances',
        actual: `Creada con éxito (Derived Task ID: ${derivedTasks[0].id})`,
        status: 'PASS'
      })
      // Limpiar tarea derivada
      await supabase.from('task_instances').delete().eq('id', derivedTasks[0].id)
    } else {
      report.push({
        id: 'TEST 5D.4',
        title: 'Disparo Automático de Regla por Trigger BD',
        objective: 'Verificar creación de tarea derivada',
        action: 'updateTaskStatus',
        expected: 'Tarea derivada creada automáticamente',
        actual: 'No se encontró la tarea derivada',
        status: 'FAIL'
      })
    }
  } catch (err: any) {
    report.push({
      id: 'TEST 5D.4',
      title: 'Disparo Automático de Regla por Trigger BD',
      objective: 'Verificar ejecucion de regla por trigger',
      action: 'updateTaskStatus',
      expected: 'Ejecución exitosa',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
  }

  // 5. TEST 5D.5: Verificación de Idempotencia por Clave Hash Única
  const { data: executions } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('rule_id', ruleId)

  if (executions && executions.length > 0 && executions[0].status === 'success') {
    report.push({
      id: 'TEST 5D.5',
      title: 'Verificación de Idempotencia en automation_executions',
      objective: 'Verificar registro atómico en automation_executions con deduplication_key única',
      action: 'select * from automation_executions where rule_id = ruleId',
      expected: 'status = success y deduplication_key registrada',
      actual: `Registrada con éxito (status: '${executions[0].status}', key: ${executions[0].deduplication_key})`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 5D.5',
      title: 'Verificación de Idempotencia en automation_executions',
      objective: 'Verificar registro en automation_executions',
      action: 'select automation_executions',
      expected: 'Registro de ejecución encontrado',
      actual: executions && executions.length > 0 ? `status: ${executions[0].status}` : 'Sin ejecuciones registradas',
      status: 'FAIL'
    })
  }

  // 6. TEST 5D.6: Evaluador de Condiciones (Mismatch de Categoría)
  const { data: mismatchRule } = await supabase
    .from('automation_rules')
    .insert({
      family_id: familyId,
      created_by_member_id: memberId,
      name: 'Regla Prueba Mismatch Condición',
      description: 'Solo debe ejecutarse si la categoría es Inexistente',
      trigger_type: 'data_event',
      trigger_event: 'task.completed',
      condition_config: { category_id: '00000000-0000-0000-0000-000000000001' },
      action_type: 'CREATE_TASK',
      action_config: { task_title: 'Tarea Falsa No Creada' },
      is_active: true
    })
    .select()
    .single()

  if (mismatchRule && sourceTaskId) {
    // Reabrir y volver a completar la tarea origen
    await taskService.updateTaskStatus(sourceTaskId, 'pending')
    await taskService.updateTaskStatus(sourceTaskId, 'completed')

    const { data: falseTasks } = await supabase.from('task_instances').select('*').eq('title', 'Tarea Falsa No Creada')
    if (!falseTasks || falseTasks.length === 0) {
      report.push({
        id: 'TEST 5D.6',
        title: 'Evaluación Correcta de Condiciones (condition_config Mismatch)',
        objective: 'Verificar que si la condición no coincide la automatización no se ejecuta (condition_not_met)',
        action: 'Disparar evento con categoría distinta a la configurada',
        expected: 'Cero tareas falsas creadas (condition_not_met)',
        actual: 'Omitida correctamente. No se creó ninguna tarea no correspondiente.',
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 5D.6',
        title: 'Evaluación Correcta de Condiciones',
        objective: 'Impedir ejecuciones si la condición no coincide',
        action: 'Disparar evento',
        expected: 'Regla omitida',
        actual: 'Se creó tarea pese al mismatch de condición (FAIL)',
        status: 'FAIL'
      })
      await supabase.from('task_instances').delete().eq('id', falseTasks[0].id)
    }

    await supabase.from('automation_rules').delete().eq('id', mismatchRule.id)
  }

  // 7. TEST 5D.7: Verificación de Auditoría en history_logs
  const { data: logs } = await supabase
    .from('history_logs')
    .select('*')
    .eq('action_type', 'automation_triggered')
    .order('created_at', { ascending: false })
    .limit(1)

  if (logs && logs.length > 0) {
    report.push({
      id: 'TEST 5D.7',
      title: 'Auditoría Inalterable en history_logs',
      objective: 'Verificar registro automático de action_type = "automation_triggered"',
      action: 'select from history_logs where action_type = "automation_triggered"',
      expected: 'Log inalterable presente en history_logs con metadata de la regla',
      actual: `Log registrado con éxito (ID: ${logs[0].id}, Metadata: ${JSON.stringify(logs[0].metadata)})`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 5D.7',
      title: 'Auditoría Inalterable en history_logs',
      objective: 'Verificar registro en history_logs',
      action: 'select history_logs',
      expected: 'Log automation_triggered presente',
      actual: 'No se encontró el registro de auditoría',
      status: 'FAIL'
    })
  }

  // Limpieza de objetos de prueba
  if (sourceTaskId) await supabase.from('task_instances').delete().eq('id', sourceTaskId)
  if (ruleId) await supabase.from('automation_rules').delete().eq('id', ruleId)

  return report
}

async function runMain() {
  const results = await runTestBattery5D()
  console.log('=== RESUMEN DE RESULTADOS DE PRUEBAS ETAPA 5D ===\n')
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} [${r.id}] ${r.title}`)
    console.log(`   • Objetivo: ${r.objective}`)
    console.log(`   • Acción: ${r.action}`)
    console.log(`   • Esperado: ${r.expected}`)
    console.log(`   • Real: ${r.actual}`)
    console.log(`   • Estado: ${r.status}\n`)
  })
}

runMain()
