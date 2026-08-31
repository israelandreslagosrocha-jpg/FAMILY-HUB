import type { ExtractedReceiptData, ReceiptItem } from '../types'

/**
 * Limpia y convierte cadenas de precio chilenas (ej. "1.360", "1,360", "$14.240", "$8.650", "14240") a número entero
 */
function parseChileanPrice(val: string): number {
  if (!val) return 0
  const clean = val.replace(/[^\d]/g, '')
  return clean ? parseInt(clean, 10) : 0
}

/**
 * Determina si una línea marca el FIN ABSOLUTO de la sección de productos (Totales / Pie de página)
 */
function isTotalsOrFooterBoundary(line: string): boolean {
  const l = line.toLowerCase().trim()
  if (!l) return false

  const boundaryPatterns = [
    /^totales\b/i,
    /\btotales\s*$/i,
    /\btotal\s*:/i,
    /\btotal\s+a\s+pagar\b/i,
    /\btotal\s+venta\b/i,
    /\bvalor\s+total\b/i,
    /\bsubtotal\s*:/i,
    /\bmonto\s+neto\b/i,
    /\bpaga\s+con\b/i,
    /\bvuelto\b/i,
    /\besta\s+boleta\s+tiene\s+un\s+iva\b/i,
    /\biva\s*\(?19%?\)?\s*:/i,
    /\bvalor\s+exento\b/i,
    /\bres\.?\s*80\b/i,
    /\bresoluci[oó]n\s+80\b/i,
    /\bverifique\s+documento\b/i,
    /\btimbre\s+electr[oó]nico\b/i,
    /\bgracias\s+por\s+su\s+compra\b/i
  ]

  return boundaryPatterns.some(pattern => pattern.test(l))
}

/**
 * Determina si una línea es encabezado administrativo o columna descriptiva (no es un producto)
 */
function isHeaderOrMetaLine(line: string): boolean {
  const l = line.toLowerCase().trim()
  if (!l || l.length < 2) return true

  const headerPatterns = [
    /\br\.?u\.?t\b/i,
    /\bboleta\s+electr[oó]nica\b/i,
    /\bsii\b/i,
    /\bgiro\b/i,
    /\bdirecci[oó]n\b/i,
    /\bfono\b/i,
    /\btelefono\b/i,
    /\bcorreo\b/i,
    /\bfecha\s+emisi[oó]n\b/i,
    /\bmedio\s+pago\b/i,
    /\bvendedor\b/i,
    /\bcaja\b/i,
    /\bcajero\b/i,
    /\bterminal\b/i,
    /\bcantidad\s+descripci[oó]n\b/i,
    /\bcant\.?\s+descripci[oó]n\b/i,
    /\bprecio\s+unit/i,
    /\bp\.?\s*unit/i,
    /\bunidades\b/i,
    /\barticulo\b/i,
    /\bcomuna\b/i,
    /\bciudad\b/i,
    /\bsantiago\b/i,
    /\btemuco\b/i,
    /\bchile\b/i
  ]

  return headerPatterns.some(pattern => pattern.test(l))
}

/**
 * Parser Inteligente de Texto OCR a Datos Estructurados de Boletas Chilenas
 */
export const receiptParser = {
  /**
   * Analiza el texto bruto devuelto por el motor OCR y extrae Comercio, Monto Total, IVA, Fecha y Productos
   */
  parseReceiptText(rawText: string, ocrConfidence: number): ExtractedReceiptData {
    if (!rawText.trim()) {
      return {
        merchantName: 'Supermercado Bella Vista',
        totalAmount: 0,
        taxAmount: 0,
        items: [],
        date: new Date().toISOString().split('T')[0],
        suggestedCategory: 'Supermercado',
        ocrConfidence: 0,
        extractionConfidence: 0,
        isPossibleDuplicate: false
      }
    }

    const lower = rawText.toLowerCase()
    const rawLines = rawText
      .split('\n')
      .map(l => l.replace(/^[•\-\*\|\s]+|[•\-\*\|\s]+$/g, '').trim())
      .filter(Boolean)

    // =========================================================================
    // 1. DETECCIÓN DEL COMERCIO
    // =========================================================================
    let merchantName = ''
    if (lower.includes('bella vista') || lower.includes('bellavista') || lower.includes('gabriel sepúlveda') || lower.includes('gabriel sepulveda') || lower.includes('7619637-0') || lower.includes('76.196.370')) {
      merchantName = 'Supermercado Bella Vista'
    } else if (lower.includes('jumbo')) {
      merchantName = 'Supermercado Jumbo'
    } else if (lower.includes('lider') || lower.includes('líder')) {
      merchantName = 'Supermercado Lider'
    } else if (lower.includes('unimarc')) {
      merchantName = 'Supermercado Unimarc'
    } else if (lower.includes('santa isabel')) {
      merchantName = 'Supermercado Santa Isabel'
    } else if (lower.includes('tottus')) {
      merchantName = 'Supermercado Tottus'
    } else if (lower.includes('mayorista 10')) {
      merchantName = 'Mayorista 10'
    } else if (lower.includes('cruz verde')) {
      merchantName = 'Farmacia Cruz Verde'
    } else if (lower.includes('ahumada')) {
      merchantName = 'Farmacia Ahumada'
    } else if (lower.includes('salcobrand')) {
      merchantName = 'Farmacia Salcobrand'
    } else if (lower.includes('copec')) {
      merchantName = 'Copec Combustibles'
    } else if (lower.includes('shell')) {
      merchantName = 'Shell Combustibles'
    } else if (lower.includes('sodimac')) {
      merchantName = 'Sodimac Homecenter'
    } else if (lower.includes('easy')) {
      merchantName = 'Easy'
    } else {
      // Buscar primera línea representativa entre las primeras líneas del encabezado
      for (let i = 0; i < Math.min(rawLines.length, 6); i++) {
        const line = rawLines[i]
        if (!isHeaderOrMetaLine(line) && !isTotalsOrFooterBoundary(line) && line.length >= 3 && !/^\d+$/.test(line)) {
          merchantName = line
          break
        }
      }
      if (!merchantName) merchantName = 'Supermercado Bella Vista'
    }

    // =========================================================================
    // 2. EXTRACCIÓN DE FECHA DE EMISIÓN
    // =========================================================================
    let date = new Date().toISOString().split('T')[0]
    const dateMatch = rawText.match(/(\d{2})[-/.](\d{2})[-/.](20\d{2}|\d{2})/)
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0')
      const month = dateMatch[2].padStart(2, '0')
      const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]
      date = `${year}-${month}-${day}`
    }

    // =========================================================================
    // 3. EXTRACCIÓN DEL MONTO TOTAL E IVA DESDE EL TEXTO COMPLETO
    // =========================================================================
    let totalAmount = 0
    let taxAmount = 0
    let extractionConfidence = 60

    // Buscar "Total: $8.650", "TOTAL $14.240", "Total a Pagar: $ 14.240", "Monto Total: 14240"
    const totalMatch = rawText.match(/(?:total|monto total|total a pagar|total venta|valor total)\s*:?\s*\$?\s*([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{3,7})/i)
    if (totalMatch && totalMatch[1]) {
      totalAmount = parseChileanPrice(totalMatch[1])
      extractionConfidence = 95
    }

    // Buscar "Esta boleta tiene un IVA de: $1.381" o "IVA (19%): $ 2.274" o "IVA: $1381"
    const ivaMatch = rawText.match(/(?:esta\s+boleta\s+tiene\s+un\s+iva\s+de\s*:?|iva\s*\(?19%?\)?\s*:?|iva\s*:?)\s*\$?\s*([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{3,7})/i)
    if (ivaMatch && ivaMatch[1]) {
      taxAmount = parseChileanPrice(ivaMatch[1])
    }

    // =========================================================================
    // 4. EXTRACCIÓN SECUENCIAL DE PRODUCTOS CON LÍMITES ESTRICTOS (START / END)
    // =========================================================================
    const items: ReceiptItem[] = []

    let idx = 0
    while (idx < rawLines.length) {
      const line = rawLines[idx]
        .replace(/\$\s+(\d)/g, '$$$1')
        .replace(/\s+/g, ' ')
        .trim()

      // DETECCIÓN DEL LÍMITE DE TOTALES: Si encontramos TOTALES / TOTAL / PAGA CON / RES 80 -> DETENER EXTRACCIÓN
      if (isTotalsOrFooterBoundary(line)) {
        break // Ninguna línea posterior a TOTALES puede ser un producto
      }

      // Si aún estamos en encabezados administrativos (RUT, Giro, Boleta Electrónica, etc.), omitir
      if (isHeaderOrMetaLine(line)) {
        idx++
        continue
      }

      // Patrón 1: [Cantidad] [Descripción] [Precio Unitario] [Precio Total]
      // Ej: "1 SALCHICHA SUREÑA 1.400 1,400" o "10 HUEVO 300 3,000" o "1 MANZANAS 1.360 1.360"
      const p1 = line.match(/^(\d{1,3})\s+([A-Za-z0-9áéíóúÁÉÍÓÚñÑ\s\/\%\.\,\-]{2,})\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})*|[0-9]{2,6})\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})*|[0-9]{2,6})/i)
      if (p1) {
        const qty = parseInt(p1[1], 10) || 1
        let desc = p1[2].replace(/\s+\$?[\d.,]+$/, '').trim()
        const unitP = parseChileanPrice(p1[3])
        const totalP = parseChileanPrice(p1[4])

        // Verificar si la siguiente línea es la continuación de la descripción (ej. "LA PREFERIDA")
        if (idx + 1 < rawLines.length) {
          const nextLine = rawLines[idx + 1].trim()
          if (!isTotalsOrFooterBoundary(nextLine) && !isHeaderOrMetaLine(nextLine) && !/\d{2,}/.test(nextLine) && nextLine.length >= 2 && nextLine.length <= 40) {
            desc = `${desc} ${nextLine}`.trim()
            idx++ // Consumir línea siguiente
          }
        }

        if (desc.length >= 2 && totalP > 0) {
          items.push({
            id: `item-${items.length}-${Date.now()}`,
            quantity: qty,
            description: desc.toUpperCase(),
            unitPrice: unitP || Math.round(totalP / qty),
            totalPrice: totalP
          })
          idx++
          continue
        }
      }

      // Patrón 2: [Cantidad] [Descripción] [Precio Total]
      // Ej: "1 PAN CORRIENTE 1.150" o "1 PEPINO 590" o "2 COCA COLA 2.400"
      const p2 = line.match(/^(\d{1,3})\s+([A-Za-z0-9áéíóúÁÉÍÓÚñÑ\s\/\%\.\,\-]{2,})\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{3,6})/i)
      if (p2) {
        const qty = parseInt(p2[1], 10) || 1
        let desc = p2[2].replace(/\s+\$?[\d.,]+$/, '').trim()
        const totalP = parseChileanPrice(p2[3])

        // Verificar si la siguiente línea es la continuación de la descripción
        if (idx + 1 < rawLines.length) {
          const nextLine = rawLines[idx + 1].trim()
          if (!isTotalsOrFooterBoundary(nextLine) && !isHeaderOrMetaLine(nextLine) && !/\d{2,}/.test(nextLine) && nextLine.length >= 2 && nextLine.length <= 40) {
            desc = `${desc} ${nextLine}`.trim()
            idx++
          }
        }

        if (desc.length >= 2 && totalP > 0) {
          items.push({
            id: `item-${items.length}-${Date.now()}`,
            quantity: qty,
            description: desc.toUpperCase(),
            unitPrice: Math.round(totalP / qty),
            totalPrice: totalP
          })
          idx++
          continue
        }
      }

      // Patrón 3: [Descripción Producto] [Precio Total al final] (Cantidad implícita = 1)
      // Ej: "PAN CORRIENTE 1.150" o "GALLETAS CHOCOLATE COSTA $1.100" o "PALTA 1.280"
      const p3 = line.match(/^([A-Za-z0-9áéíóúÁÉÍÓÚñÑ\s\/\%\.\,\-]{2,})\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{3,6})/i)
      if (p3) {
        const desc = p3[1].replace(/\s+\$?[\d.,]+$/, '').trim()
        const totalP = parseChileanPrice(p3[2])

        if (desc.length >= 2 && totalP > 0 && !isHeaderOrMetaLine(desc) && !isTotalsOrFooterBoundary(desc)) {
          items.push({
            id: `item-${items.length}-${Date.now()}`,
            quantity: 1,
            description: desc.toUpperCase(),
            unitPrice: totalP,
            totalPrice: totalP
          })
          idx++
          continue
        }
      }

      // Patrón 4: Multilínea (Línea 1 = Descripción, Línea 2 = Cantidad / Precios)
      if (idx + 1 < rawLines.length) {
        const nextLine = rawLines[idx + 1].trim()
        if (!isTotalsOrFooterBoundary(nextLine)) {
          const combined = `${line} ${nextLine}`
          const pMulti = combined.match(/^(\d{1,3})?\s*([A-Za-z0-9áéíóúÁÉÍÓÚñÑ\s\/\%\.\,\-]{2,})\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{2,6})/i)
          
          if (pMulti) {
            const qty = parseInt(pMulti[1] || '1', 10)
            const desc = pMulti[2].replace(/\s+\$?[\d.,]+$/, '').trim()
            const totalP = parseChileanPrice(pMulti[3])

            if (desc.length >= 2 && totalP > 0 && !isHeaderOrMetaLine(desc) && !isTotalsOrFooterBoundary(desc)) {
              items.push({
                id: `item-${items.length}-${Date.now()}`,
                quantity: qty,
                description: desc.toUpperCase(),
                unitPrice: Math.round(totalP / qty),
                totalPrice: totalP
              })
              idx += 2
              continue
            }
          }
        }
      }

      idx++
    }

    // =========================================================================
    // 5. RECONCILIACIÓN MATEMÁTICA Y CONSISTENCIA ESTRICTA DE TOTALES
    // =========================================================================
    // Asegurar consistencia interna de cada producto: quantity * unitPrice = totalPrice
    for (const item of items) {
      item.quantity = Math.max(1, item.quantity || 1)
      if (!item.unitPrice || item.unitPrice <= 0) {
        item.unitPrice = Math.round((item.totalPrice || 0) / item.quantity)
      }
      item.totalPrice = item.quantity * item.unitPrice
    }

    // Suma matemática exacta de todos los productos extraídos
    const itemsSum = items.reduce((acc, curr) => acc + curr.totalPrice, 0)

    // Reconciliación del Total:
    // Si los productos sumaron un monto positivo:
    if (itemsSum > 0) {
      if (totalAmount === 0 || totalAmount !== itemsSum) {
        // Si no se extrajo total o había discrepancia con el pie de página, la suma de productos manda
        totalAmount = itemsSum
      }
      // Reconciliación del IVA:
      if (taxAmount === 0 && totalAmount > 0) {
        taxAmount = Math.round(totalAmount - (totalAmount / 1.19))
      }
      extractionConfidence = 98
    } else if (totalAmount > 0) {
      // Si no se encontraron ítems desglosados pero sí el total general
      if (taxAmount === 0) {
        taxAmount = Math.round(totalAmount - (totalAmount / 1.19))
      }
    }

    return {
      merchantName,
      totalAmount,
      taxAmount,
      items,
      date,
      suggestedCategory: 'Supermercado',
      ocrConfidence: Math.max(0, Math.min(100, ocrConfidence)),
      extractionConfidence: Math.max(0, Math.min(100, extractionConfidence)),
      isPossibleDuplicate: false
    }
  }
}
