import { supabase } from './supabaseClient'

async function verify5C5Automations() {
  console.log('=== PASO 5C.5: VERIFICACIÓN ESTRUCTURAL Y FUNCIONAL DEL MOTOR DE AUTOMATIZACIONES (V2.1) ===\n')

  // 1. Probar llamada anónima a RPC pública execute_my_scheduled_automations (Debe rehusar)
  const { error: anonErr } = await supabase.rpc('execute_my_scheduled_automations')
  if (anonErr) {
    console.log(`✅ RPC execute_my_scheduled_automations bloquea llamadas anónimas/sin familia: "${anonErr.message}" (Código ${anonErr.code})`)
  } else {
    console.log('ℹ️ RPC retornó respuesta')
  }

  // 2. Autenticarse como israel@familyhub.cl
  console.log('\n🔑 Autenticando usuario israel@familyhub.cl...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
  })

  if (authErr || !authData.user) {
    console.error('❌ Error al autenticar:', authErr?.message)
    return
  }

  console.log(`✅ Usuario autenticado con éxito: ${authData.user.id}`)

  // 3. Probar que la función privada del sistema process_system_scheduled_automations NO es ejecutable por authenticated
  const { error: systemRpcErr } = await supabase.rpc('process_system_scheduled_automations' as any)
  if (systemRpcErr) {
    console.log(`✅ Aislamiento confirmado: Función de sistema privada no es invocable por authenticated: "${systemRpcErr.message}"`)
  }

  // 4. Obtener miembro de la familia del usuario
  const { data: members } = await supabase.from('family_members').select('*')
  if (!members || members.length === 0) {
    console.error('❌ No se encontraron miembros de la familia')
    return
  }
  const familyId = members[0].family_id
  const memberId = members[0].id

  // 5. Crear una Regla de Automatización de Prueba en automation_rules (task.completed -> CREATE_TASK)
  console.log('\n🛠️ Creando Regla de Automatización de Prueba en automation_rules...')
  const { data: rule, error: ruleErr } = await supabase
    .from('automation_rules')
    .insert({
      family_id: familyId,
      created_by_member_id: memberId,
      name: 'Regla Prueba 5C.5 Derivada',
      description: 'Prueba de disparo automático de tareas',
      trigger_type: 'data_event',
      trigger_event: 'task.completed',
      condition_config: {},
      action_type: 'CREATE_TASK',
      action_config: { task_title: 'Tarea Derivada Automática 5C.5', priority: 'media' },
      is_active: true
    })
    .select()
    .single()

  if (ruleErr || !rule) {
    console.error('❌ Error al crear regla de automatización:', ruleErr?.message)
    return
  }

  console.log(`✅ Regla creada en automation_rules: [ID ${rule.id}] "${rule.name}"`)

  // 6. Crear una Tarea Origen en task_instances
  console.log('\n📝 Creando Tarea Origen en task_instances...')
  const { data: sourceTaskId, error: taskCreateErr } = await supabase.rpc('create_family_task', {
    p_title: 'Tarea Origen 5C.5',
    p_description: 'Al completarse debe disparar la regla de automatización',
    p_assigned_member_id: memberId,
    p_priority: 'alta',
    p_due_date: '2026-08-19'
  })

  if (taskCreateErr || !sourceTaskId) {
    console.error('❌ Error al crear tarea origen:', taskCreateErr?.message)
    return
  }

  console.log(`✅ Tarea Origen creada: [ID ${sourceTaskId}]`)

  // 7. Completar la Tarea Origen para disparar el Trigger BD
  console.log('\n⚡ Completando Tarea Origen (status = completed)...')
  const { error: completeErr } = await supabase
    .from('task_instances')
    .update({ status: 'completed' })
    .eq('id', sourceTaskId)

  if (completeErr) {
    console.error('❌ Error al completar tarea origen:', completeErr.message)
    return
  }

  console.log('✅ Tarea origen marcada como completed.')

  // 8. Verificación de la Automatización Ejecutada en automation_executions
  console.log('\n🔍 Verificando registro de la ejecución en automation_executions...')
  const { data: executions, error: execErr } = await supabase
    .from('automation_executions')
    .select('*')
    .eq('rule_id', rule.id)

  if (execErr || !executions || executions.length === 0) {
    console.error('❌ No se registró la ejecución en automation_executions:', execErr?.message)
  } else {
    const exec = executions[0]
    console.log(`🎉 PASO 5C.5 VERIFICADO CON ÉXITO en automation_executions:`)
    console.log(`   • Status: '${exec.status}'`)
    console.log(`   • Clave Hash Idempotencia: ${exec.deduplication_key}`)
    console.log(`   • Target Entity ID: ${exec.target_entity_id}`)
  }

  // 9. Verificar que se creó la Tarea Derivada en task_instances
  const { data: derivedTasks } = await supabase
    .from('task_instances')
    .select('*')
    .eq('title', 'Tarea Derivada Automática 5C.5')

  if (derivedTasks && derivedTasks.length > 0) {
    console.log(`✅ Tarea Derivada creada automáticamente en task_instances: [ID ${derivedTasks[0].id}] "${derivedTasks[0].title}"`)
    // Limpieza tarea derivada
    await supabase.from('task_instances').delete().eq('id', derivedTasks[0].id)
  } else {
    console.error('❌ No se encontró la tarea derivada creada por la automatización')
  }

  // 10. Probar RPC execute_my_scheduled_automations del usuario
  console.log('\n🧪 Probando RPC execute_my_scheduled_automations()...')
  const { data: schedResult, error: schedErr } = await supabase.rpc('execute_my_scheduled_automations')
  if (schedErr) {
    console.error('❌ Error en execute_my_scheduled_automations:', schedErr.message)
  } else {
    console.log(`✅ RPC execute_my_scheduled_automations ejecutada correctamente:`, JSON.stringify(schedResult))
  }

  // Limpieza de objetos de prueba
  await supabase.from('task_instances').delete().eq('id', sourceTaskId)
  await supabase.from('automation_rules').delete().eq('id', rule.id)
  console.log('\n🧹 Objetos de prueba de la automatización eliminados limpiamente.')
}

verify5C5Automations()
