import { supabase } from './supabaseClient'
import { taskService } from './taskService'

export interface Test4DItem {
  id: string
  title: string
  objective: string
  action: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL'
}

export async function runTestBattery4D(): Promise<Test4DItem[]> {
  const report: Test4DItem[] = []

  console.log('=== BATERÍA DE PRUEBAS REALES DE INTEGRACIÓN DE TAREAS (ETAPA 4D) ===\n')

  // 1. TEST 4D.1: Autenticación con israel@familyhub.cl
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
  })

  if (authErr || !authData.user) {
    report.push({
      id: 'TEST 4D.1',
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
    id: 'TEST 4D.1',
    title: 'Autenticación en Supabase Auth',
    objective: 'Iniciar sesión como israel@familyhub.cl',
    action: 'signInWithPassword',
    expected: 'Sesión autenticada (role: authenticated)',
    actual: `Sesión iniciada con éxito (User ID: ${authData.user.id})`,
    status: 'PASS'
  })

  // Obtener miembro válido de la familia del usuario
  const { data: members } = await supabase.from('family_members').select('*')
  const validMemberId = members && members.length > 0 ? members[0].id : null

  if (!validMemberId) {
    report.push({
      id: 'TEST 4D.2',
      title: 'Obtención de Contexto Familiar',
      objective: 'Obtener un member_id válido de la familia activa',
      action: 'select * from family_members',
      expected: 'Al menos 1 miembro encontrado',
      actual: 'No se encontraron miembros',
      status: 'FAIL'
    })
    return report
  }

  // Si solo hay 1 miembro, creamos un 2do miembro temporal de prueba en la misma familia para evaluar reasignación
  let secondMemberId = members && members.length > 1 ? members[1].id : null

  if (!secondMemberId) {
    const { data: familyIdData } = await supabase.from('family_members').select('family_id').eq('id', validMemberId).single()
    if (familyIdData) {
      const { data: tempMember } = await supabase.from('family_members').insert({
        family_id: familyIdData.family_id,
        name: 'Esposa (Prueba 4D)',
        avatar_id: 'avatar-02',
        color: '#ec4899',
        role: 'Familiar',
        is_active: true
      }).select().single()

      if (tempMember) {
        secondMemberId = tempMember.id
      }
    }
  }

  // 2. TEST 4D.2: Intento de Asignar Miembro Ajeno (Cross-Family)
  const fakeMemberId = '00000000-0000-0000-0000-000000000001'
  const { error: crossMemberErr } = await supabase.rpc('create_family_task', {
    p_title: 'Ataque Tarea Miembro Ajeno',
    p_description: 'Prueba',
    p_assigned_member_id: fakeMemberId,
    p_priority: 'media',
    p_due_date: '2026-08-19'
  })

  if (crossMemberErr && crossMemberErr.message.includes('no pertenece activamente a su familia')) {
    report.push({
      id: 'TEST 4D.2',
      title: 'Bloqueo de Asignación a Miembro Ajeno (Cross-Family)',
      objective: 'Impedir asignar tareas a member_ids de otra familia o inexistentes',
      action: 'Invocación RPC con member_id inexistente/ajeno',
      expected: 'Rechazo con "El miembro asignado no pertenece activamente a su familia"',
      actual: `Bloqueado correctamente: "${crossMemberErr.message}"`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 4D.2',
      title: 'Bloqueo de Asignación a Miembro Ajeno',
      objective: 'Impedir tareas a miembros ajenos',
      action: 'Invocación RPC con member_id ajeno',
      expected: 'Excepción de seguridad',
      actual: crossMemberErr ? crossMemberErr.message : 'Permitió tarea a miembro ajeno (FAIL)',
      status: 'FAIL'
    })
  }

  // 3. TEST 4D.3: Creación de Tarea Válida vía RPC Transaccional
  const { data: taskId, error: createErr } = await supabase.rpc('create_family_task', {
    p_title: 'Tarea Integración Pruebas 4D',
    p_description: 'Prueba de creación, status, reasignación y auditoría',
    p_assigned_member_id: validMemberId,
    p_priority: 'alta',
    p_due_date: '2026-08-19'
  })

  if (createErr || !taskId) {
    report.push({
      id: 'TEST 4D.3',
      title: 'Creación Atómica de Tarea (RPC)',
      objective: 'Crear una tarea física asignada a un miembro de la familia',
      action: 'taskService.createTask(...)',
      expected: 'Tarea creada en task_instances y log "created" en history_logs',
      actual: `Error: ${createErr?.message}`,
      status: 'FAIL'
    })
    return report
  }

  report.push({
    id: 'TEST 4D.3',
    title: 'Creación Atómica de Tarea (RPC)',
    objective: 'Crear una tarea física asignada a un miembro de la familia',
    action: 'taskService.createTask(...)',
    expected: 'Tarea creada en task_instances y log "created" en history_logs',
    actual: `Creada exitosamente (Task Instance ID: ${taskId})`,
    status: 'PASS'
  })

  // 4. TEST 4D.4: Transición de Estado (pending -> completed) y Trigger completed_at
  try {
    await taskService.updateTaskStatus(taskId, 'completed')
    const { data: updatedTask } = await supabase
      .from('task_instances')
      .select('status, completed_at')
      .eq('id', taskId)
      .single()

    if (updatedTask?.status === 'completed' && updatedTask?.completed_at) {
      report.push({
        id: 'TEST 4D.4',
        title: 'Completar Tarea y Trigger completed_at',
        objective: 'Verificar status = completed y asignación automática de completed_at por trigger BD',
        action: 'taskService.updateTaskStatus(taskId, "completed")',
        expected: 'status = completed y completed_at IS NOT NULL',
        actual: `Status: '${updatedTask.status}', completed_at: ${updatedTask.completed_at}`,
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 4D.4',
        title: 'Completar Tarea y Trigger completed_at',
        objective: 'Verificar status = completed y completed_at',
        action: 'taskService.updateTaskStatus(taskId, "completed")',
        expected: 'status = completed y completed_at IS NOT NULL',
        actual: `Status: ${updatedTask?.status}, completed_at: ${updatedTask?.completed_at}`,
        status: 'FAIL'
      })
    }
  } catch (err: any) {
    report.push({
      id: 'TEST 4D.4',
      title: 'Completar Tarea y Trigger completed_at',
      objective: 'Verificar actualización de estado',
      action: 'updateTaskStatus',
      expected: 'Actualización exitosa',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
  }

  // 5. TEST 4D.5: Reabrir Tarea (completed -> pending) y Verificar no falso 'completed'
  try {
    await taskService.updateTaskStatus(taskId, 'pending')
    const { data: reopenedTask } = await supabase
      .from('task_instances')
      .select('status, completed_at')
      .eq('id', taskId)
      .single()

    if (reopenedTask?.status === 'pending' && reopenedTask?.completed_at === null) {
      report.push({
        id: 'TEST 4D.5',
        title: 'Reabrir Tarea (completed -> pending)',
        objective: 'Verificar status = pending y completed_at reset a NULL por trigger',
        action: 'taskService.updateTaskStatus(taskId, "pending")',
        expected: 'status = pending y completed_at = NULL (Log "reopened")',
        actual: `Status: '${reopenedTask.status}', completed_at: ${reopenedTask.completed_at}`,
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 4D.5',
        title: 'Reabrir Tarea',
        objective: 'Verificar reset de completed_at',
        action: 'updateTaskStatus',
        expected: 'completed_at = NULL',
        actual: `completed_at: ${reopenedTask?.completed_at}`,
        status: 'FAIL'
      })
    }
  } catch (err: any) {
    report.push({
      id: 'TEST 4D.5',
      title: 'Reabrir Tarea',
      objective: 'Verificar reset de completed_at',
      action: 'updateTaskStatus',
      expected: 'Actualización exitosa',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
  }

  // 6. TEST 4D.6: Reasignación de Encargado Real
  if (secondMemberId) {
    try {
      await taskService.reassignTask(taskId, secondMemberId)
      const { data: reassignedTask } = await supabase
        .from('task_instances')
        .select('assigned_member_id')
        .eq('id', taskId)
        .single()

      if (reassignedTask?.assigned_member_id === secondMemberId) {
        report.push({
          id: 'TEST 4D.6',
          title: 'Reasignación Real de Encargado',
          objective: 'Verificar cambio real de member_id asignado y generación de log "reassigned"',
          action: `taskService.reassignTask(taskId, "${secondMemberId}")`,
          expected: 'assigned_member_id actualizado y log "reassigned" en history_logs',
          actual: `Reasignado con éxito a Member ID ${reassignedTask?.assigned_member_id}`,
          status: 'PASS'
        })
      } else {
        report.push({
          id: 'TEST 4D.6',
          title: 'Reasignación Real de Encargado',
          objective: 'Verificar reasignación de miembro',
          action: 'reassignTask',
          expected: 'assigned_member_id actualizado',
          actual: `assigned_member_id: ${reassignedTask?.assigned_member_id}`,
          status: 'FAIL'
        })
      }
    } catch (err: any) {
      report.push({
        id: 'TEST 4D.6',
        title: 'Reasignación Real de Encargado',
        objective: 'Verificar reasignación',
        action: 'reassignTask',
        expected: 'Reasignación exitosa',
        actual: `Error: ${err.message}`,
        status: 'FAIL'
      })
    }
  }

  // 7. TEST 4D.7: Verificación de Logs de Auditoría Inalterables en history_logs
  const { data: logs } = await supabase
    .from('history_logs')
    .select('action_type, entity_type, metadata')
    .eq('entity_id', taskId)

  const actionTypes = logs ? logs.map(l => l.action_type) : []
  const hasCreated = actionTypes.includes('created')
  const hasCompleted = actionTypes.includes('completed')
  const hasReopened = actionTypes.includes('reopened')
  const hasReassigned = actionTypes.includes('reassigned')

  if (hasCreated && hasCompleted && hasReopened && hasReassigned) {
    report.push({
      id: 'TEST 4D.7',
      title: 'Verificación Completa de Auditoría por Triggers PostgreSQL',
      objective: 'Verificar que history_logs capturó created, completed, reopened y reassigned',
      action: 'select action_type from history_logs where entity_id = taskId',
      expected: 'Registros inalterables: created, completed, reopened, reassigned',
      actual: `Capturados con éxito: [${actionTypes.join(', ')}]`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 4D.7',
      title: 'Verificación Completa de Auditoría por Triggers',
      objective: 'Verificar captura de todos los eventos en history_logs',
      action: 'select history_logs',
      expected: 'created, completed, reopened, reassigned',
      actual: `Acciones encontradas: [${actionTypes.join(', ')}]`,
      status: 'FAIL'
    })
  }

  // Limpieza de la tarea de prueba
  await supabase.from('task_instances').delete().eq('id', taskId)

  // Si creamos un miembro temporal, lo mantenemos en la familia para la interfaz
  return report
}

async function runMain() {
  const results = await runTestBattery4D()
  console.log('=== RESUMEN DE RESULTADOS DE PRUEBAS ETAPA 4D ===\n')
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
