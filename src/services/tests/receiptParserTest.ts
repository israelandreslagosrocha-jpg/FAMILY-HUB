import { receiptParser } from '../receiptParser'

async function runReceiptParserTests() {
  console.log('🧾 === INICIANDO BATERÍA DE PRUEBAS DE PARSER OCR DE BOLETAS CHILENAS ===\n')

  let passed = 0
  let total = 0

  function assert(condition: boolean, title: string) {
    total++
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${title}`)
    }
  }

  // CASO 1: Boleta Supermercado Bella Vista (Estilo Micropos / SII con desglose tradicional)
  const textBellaVista = `
    SUPERMERCADO BELLA VISTA
    GABRIEL SEPULVEDA ROJAS
    RUT: 76.196.370-0
    GIRO: VENTA AL POR MENOR
    BOLETA ELECTRONICA N: 562602
    FECHA: 16/08/2026 14:32

    CANT. DESCRIPCION P.UNIT TOTAL
    1 MANZANAS 1.360 1.360
    1 GALLETA SABOR CHOCOLATE COSTA 140 GR 1.100 1.100
    1 AZUCAR IANSA 400 G 850 850
    1 MANTEQUILLA SOPROLE 125GR 1.650 1.650
    1 PAPEL HIGIENICO ELITE 50METROS 3.350 3.350
    1 PLATANO 1.130 1.130
    1 PAN CORRIENTE 2.400 2.400
    8 HUEVO 300 2.400

    TOTAL: $ 14.240
    IVA (19%): $ 2.274
    GRACIAS POR SU COMPRA
  `

  const r1 = receiptParser.parseReceiptText(textBellaVista, 95)
  assert(r1.merchantName === 'Supermercado Bella Vista', 'Caso 1: Comercio detectado Bella Vista')
  assert(r1.totalAmount === 14240, `Caso 1: Monto total extraído $14.240 (obtenido: ${r1.totalAmount})`)
  assert(r1.items ? r1.items.length === 8 : false, `Caso 1: 8 productos desglosados (obtenidos: ${r1.items?.length})`)
  assert(r1.items ? r1.items.some(i => i.description.includes('MANZANAS') && i.totalPrice === 1360) : false, 'Caso 1: Producto MANZANAS con precio $1.360')
  assert(r1.items ? r1.items.some(i => i.description.includes('HUEVO') && i.quantity === 8 && i.totalPrice === 2400) : false, 'Caso 1: 8 HUEVOS x $300 = $2.400')

  // CASO 2: Boleta Supermercado Lider / Walmart Chile (Formato producto + precio sin cantidad previa)
  const textLider = `
    HIPER LIDER
    WALMART CHILE S.A.
    R.U.T.: 76.134.941-4
    FECHA EMISION: 25-08-2026

    ARROZ TUCAPEL G2 1KG $1.490
    ACEITE MARAVILLA 900CC 1.990
    LECHE ENTERA COLUN 1L $ 1.150
    2 YOGURT BATIDO 1.000

    TOTAL A PAGAR $5.630
    REDCOMPRA DEBITO $5.630
  `

  const r2 = receiptParser.parseReceiptText(textLider, 90)
  assert(r2.merchantName === 'Supermercado Lider', 'Caso 2: Comercio detectado Lider')
  assert(r2.totalAmount === 5630, `Caso 2: Total $5.630 extraído (obtenido: ${r2.totalAmount})`)
  assert(r2.items ? r2.items.length >= 4 : false, `Caso 2: Al menos 4 productos detectados (obtenidos: ${r2.items?.length})`)
  assert(r2.items ? r2.items.some(i => i.description.includes('ARROZ') && i.totalPrice === 1490) : false, 'Caso 2: ARROZ TUCAPEL $1.490')

  // CASO 3: Boleta de Farmacia Cruz Verde
  const textFarmacia = `
    FARMACIAS CRUZ VERDE S.A.
    RUT: 96.534.220-4
    FECHA: 28/08/2026

    1 PARACETAMOL 500MG 2.490 2.490
    1 IBUPROFENO 400MG 3.190 3.190

    TOTAL: $ 5.680
  `

  const r3 = receiptParser.parseReceiptText(textFarmacia, 92)
  assert(r3.merchantName === 'Farmacia Cruz Verde', 'Caso 3: Comercio detectado Cruz Verde')
  assert(r3.totalAmount === 5680, `Caso 3: Monto total $5.680`)
  assert(r3.items ? r3.items.length === 2 : false, `Caso 3: 2 medicamentos extraídos`)

  // CASO 4: Boleta con ruido OCR (caracteres extraños y viñetas)
  const textNoise = `
    * SUPERMERCADO SANTA ISABEL
    • FECHA 20/08/2026
    - PAN HALLULLA 1.890
    | QUESO GAUDAL 2.450
    TOTAL $4.340
  `

  const r4 = receiptParser.parseReceiptText(textNoise, 80)
  assert(r4.merchantName === 'Supermercado Santa Isabel', 'Caso 4: Comercio detectado Santa Isabel')
  assert(r4.totalAmount === 4340, `Caso 4: Total $4.340 extraído con ruido OCR`)
  assert(r4.items ? r4.items.length === 2 : false, `Caso 4: 2 productos extraídos limpiando viñetas`)

  console.log(`\n📊 RESULTADOS BATERÍA DE PARSER: ${passed} PASADOS / ${total - passed} FALLIDOS`)

  if (passed === total) {
    console.log('🎉 100% PASS: El motor de parseo y auto-relleno de productos funciona correctamente.')
  }
}

runReceiptParserTests()
