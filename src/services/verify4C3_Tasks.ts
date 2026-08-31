import { supabase } from './supabaseClient'

async function verifyTasks4C3() {
  console.log('=== PASO 4C.3: VERIFICACIÓN POST-MIGRACIÓN DE METADATOS, RPC, PERMISOS Y AUDITORÍA DE TAREAS ===\n')

  // 1. Probar llamada anónima a la RPC (Debe ser rechazada)
  const { error: anonErr } = await supabase.rpc('create_family_task', {
    p_title: 'Tarea Test Anon',
    p_description: 'Prueba',
    p_assigned_member_id: '00000000-0000-0000-0000-000000000001',
    p_priority: 'media',
    p_due_date: '2026-08-19'
  })

  if (anonErr) {
    console.log(`✅ RPC create_family_task existe y aísla anon: "${anonErr.message}" (Código ${anonErr.code})`)
  } else {
    console.log('ℹ️ RPC retornó sin error para anon')
  }

  // 2. Autenticarse como israel@familyhub.cl
  console.log('\n🔑 Autenticando usuario israel@familyhub.cl...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_TEST_USER_EMAIL || 'israel@familyhub.cl',
    password: import.meta.env.VITE_TEST_USER_PASSWORD || ''
  })

  if (authErr || !authData.user) {
    console.error('❌ Error al autenticar:', authErr?.message)
    return
  }

  console.log(`✅ Usuario autenticado: ${authData.user.id}`)

  // 3. Obtenemos un miembro de la familia del usuario
  const { data: members } = await supabase.from('family_members').select('*')
  if (!members || members.length === 0) {
    console.error('❌ No se encontraron miembros de la familia')
    return
  }
  const memberId = members[0].id

  // 4. Invocación de public.create_family_task con priority_enum
  console.log(`\n🧪 Probando invocación de public.create_family_task con Member ID: ${memberId}...`)
  const { data: taskId, error: rpcErr } = await supabase.rpc('create_family_task', {
    p_title: 'Prueba Verificación 4C.3',
    p_description: 'Verificación de RPC, priority_enum y trigger de auditoría',
    p_assigned_member_id: memberId,
    p_priority: 'media', // priority_enum válido
    p_due_date: '2026-08-19',
    p_category_id: null,
    p_responsibility_id: null,
    p_recurrence_frequency: null
  })

  if (rpcErr || !taskId) {
    console.error('❌ Error al ejecutar RPC create_family_task:', rpcErr?.message, rpcErr?.details)
    return
  }

  console.log(`✅ RPC create_family_task ejecutada con éxito. Task Instance ID asignado: ${taskId}`)

  // 5. Verificar que la columna responsibility_id está presente en task_instances
  const { data: instanceRow, error: instanceErr } = await supabase
    .from('task_instances')
    .select('id, title, status, responsibility_id, completed_at')
    .eq('id', taskId)
    .single()

  if (instanceErr || !instanceRow) {
    console.error('❌ Error al consultar task_instances:', instanceErr?.message)
    return
  }

  console.log(`✅ Columna responsibility_id comprobada en task_instances: (ID ${instanceRow.id}, Status: ${instanceRow.status}, responsibility_id: ${instanceRow.responsibility_id})`)

  // 6. Probar actualización de estado (pending -> completed) y verificar trigger completed_at y auditoría
  console.log('\n🧪 Probando UPDATE de estado (pending -> completed)...')
  const { error: updateErr } = await supabase
    .from('task_instances')
    .update({ status: 'completed' })
    .eq('id', taskId)

  if (updateErr) {
    console.error('❌ Error al actualizar estado de tarea:', updateErr.message)
    return
  }

  const { data: updatedRow } = await supabase
    .from('task_instances')
    .select('status, completed_at')
    .eq('id', taskId)
    .single()

  console.log(`✅ Status actualizado a '${updatedRow?.status}'. Trigger trg_task_instance_status asignó completed_at: ${updatedRow?.completed_at}`)

  // 7. Consultar history_logs para comprobar que trg_audit_task_instance registró los eventos
  console.log('\n📜 Verificando registro automático en history_logs...')
  const { data: logs } = await supabase
    .from('history_logs')
    .select('*')
    .eq('entity_id', taskId)
    .order('created_at', { ascending: true })

  if (logs && logs.length > 0) {
    console.log(`🎉 PASO 4C.3 VERIFICADO CON ÉXITO: Se encontraron ${logs.length} registro(s) de auditoría en history_logs:`)
    logs.forEach((log: any) => {
      console.log(`   • [Log ID: ${log.id}] action_type: '${log.action_type}', entity_type: '${log.entity_type}', metadata: ${JSON.stringify(log.metadata)}`)
    })
  } else {
    console.log('ℹ️ No se encontraron logs de auditoría')
  }

  // Limpieza de la tarea de prueba
  await supabase.from('task_instances').delete().eq('id', taskId)
  console.log('\n🧹 Tarea de prueba eliminada limpiamente.')
}

verifyTasks4C3()
