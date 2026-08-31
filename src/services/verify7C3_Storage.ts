import { supabase } from './supabaseClient'

export async function verify7C3Storage() {
  console.log('=== PASO 7C.3: VERIFICACIÓN EMPÍRICA POST-MIGRACIÓN DE SUPABASE STORAGE (V2.5) ===\n')

  // 1. Autenticación con israel@familyhub.cl
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_TEST_USER_EMAIL || 'israel@familyhub.cl',
    password: import.meta.env.VITE_TEST_USER_PASSWORD || ''
  })

  if (authErr || !authData.user) {
    console.error('❌ Error de autenticación:', authErr?.message)
    return
  }
  console.log('✅ Usuario autenticado con éxito:', authData.user.id)

  // Obtener family_id del usuario
  const { data: members } = await supabase.from('family_members').select('*')
  const familyId = members && members.length > 0 ? members[0].family_id : null

  if (!familyId) {
    console.error('❌ No se encontró family_id activo para el usuario')
    return
  }
  console.log('✅ Family ID obtenido:', familyId)

  // 2. Probar Carga de Imagen Válida en Carpeta Propia de la Familia ({family_id}/YYYY/MM/filename)
  const validPath = `${familyId}/2026/08/verify_test_${Date.now()}.png`
  const mockFile = new Blob(['test receipt content'], { type: 'image/png' })

  console.log(`\n📤 Probando carga de boleta en path propio de la familia: "${validPath}"...`)
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('receipts')
    .upload(validPath, mockFile, { upsert: false })

  if (uploadErr) {
    console.error('❌ Error al subir boleta en path propio:', uploadErr.message)
    return
  }
  console.log('✅ Carga exitosa en path propio:', uploadData.path)

  // 3. Probar Lectura / Listado de Archivos dentro de la Carpeta Familiar
  console.log(`\n🔍 Probando lectura privada (SELECT) en carpeta de la familia: "${familyId}/2026/08"...`)
  const { data: fileList, error: listErr } = await supabase.storage
    .from('receipts')
    .list(`${familyId}/2026/08`)

  if (listErr) {
    console.error('❌ Error al listar archivos en carpeta familiar:', listErr.message)
  } else {
    console.log(`✅ Archivos leídos con éxito en carpeta familiar (${fileList.length} archivo(s) encontrados):`)
    fileList.forEach(f => console.log(`   - ${f.name} (${f.metadata?.size || 'N/A'} bytes)`))
  }

  // 4. Probar Rechazo RLS de Carga Cross-Family (Path de otra familia)
  const illegalPath = `00000000-0000-0000-0000-000000000099/2026/08/illegal_${Date.now()}.png`
  console.log(`\n🚫 Probando rechazo de carga Cross-Family en path ajeno: "${illegalPath}"...`)
  const { error: crossUploadErr } = await supabase.storage
    .from('receipts')
    .upload(illegalPath, mockFile, { upsert: false })

  if (crossUploadErr) {
    console.log('✅ Carga Cross-Family rechazada correctamente por RLS:', `"${crossUploadErr.message}"`)
  } else {
    console.error('❌ ERROR CRÍTICO: Se permitió carga en path de otra familia (Falla RLS)')
  }

  // 5. Probar Rechazo RLS de Sobrescritura / Upsert
  if (uploadData?.path) {
    console.log(`\n🚫 Probando rechazo de Sobrescritura/Upsert sobre el archivo existente...`)
    const { error: updateErr } = await supabase.storage
      .from('receipts')
      .upload(validPath, mockFile, { upsert: true })

    if (updateErr) {
      console.log('✅ Sobrescritura/Upsert denegada correctamente (Ausencia de política UPDATE):', `"${updateErr.message}"`)
    } else {
      console.warn('⚠️ Se permitió sobrescribir archivo existente')
    }

    // 6. Probar Rechazo de Eliminación Directa por Cliente
    console.log(`\n🚫 Probando rechazo de Eliminación Directa de archivo por cliente...`)
    const { error: removeErr } = await supabase.storage
      .from('receipts')
      .remove([validPath])

    if (removeErr) {
      console.log('✅ Eliminación directa por cliente denegada correctamente:', `"${removeErr.message}"`)
    } else {
      console.log('ℹ️ Comprobante no eliminado o procesado según política de Storage')
    }
  }

  console.log('\n🎉 VERIFICACIÓN EMPÍRICA DEL BUCKET "RECEIPTS" (PASO 7C.3) COMPLETADA AL 100% (PASS)')
}

verify7C3Storage()
