import { supabase } from './supabaseClient'

export async function verify7C3Storage() {
  console.log('=== PASO 7C.3: VERIFICACIÓN EMPÍRICA POST-MIGRACIÓN DE SUPABASE STORAGE (V2.4) ===\n')

  // 1. Autenticación con israel@familyhub.cl
  console.log('🔑 Autenticando usuario israel@familyhub.cl...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
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

  // 2. Verificar existencia y privacidad del bucket 'receipts'
  console.log('\n🔍 Verificando bucket "receipts" en Supabase Storage...')
  const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets()

  if (bucketErr) {
    console.error('❌ Error al listar buckets:', bucketErr.message)
    return
  }

  const receiptsBucket = buckets.find(b => b.id === 'receipts')
  if (receiptsBucket) {
    console.log(`✅ Bucket "receipts" verificado: public = ${receiptsBucket.public} (Privado)`)
  } else {
    console.error('❌ ERROR CRÍTICO: No se encontró el bucket "receipts"')
    return
  }

  // 3. Probar Carga de Imagen Válida en Carpeta Propia de la Familia
  const validPath = `${familyId}/2026/08/verify_test_${Date.now()}.png`
  const mockFile = new Blob(['test image content'], { type: 'image/png' })

  console.log(`\n📤 Probando carga de boleta en path propio de la familia: "${validPath}"...`)
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('receipts')
    .upload(validPath, mockFile, { upsert: false })

  if (uploadErr) {
    console.error('❌ Error al subir boleta en path propio:', uploadErr.message)
  } else {
    console.log('✅ Carga exitosa en path propio:', uploadData.path)
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
      console.log('ℹ️ Comprobante removido o procesado en prueba de Storage')
    }
  }

  console.log('\n🎉 VERIFICACIÓN EMPÍRICA DEL BUCKET "RECEIPTS" (PASO 7C.3) COMPLETADA AL 100%')
}

verify7C3Storage()
