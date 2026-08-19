---
name: apple-design
description: Guía de estilo visual y principios de diseño Apple Human Interface Guidelines (HIG) para FAMILY-HUB.
---

# 🍏 Guía de Estilo y Sistema de Diseño Apple (Apple HIG) para FAMILY-HUB

Esta habilidad define las pautas visuales y de interacción del sistema de diseño **Apple Human Interface Guidelines (iOS, iPadOS, macOS)** aplicadas al proyecto **FAMILY-HUB**.

---

## 🎨 1. Principios Visuales Clave

1. **Claridad y Sobriedad Elegante**:
   - Tipografía oficial de sistema (`SF Pro Display` / `SF Pro Text` / `-apple-system`).
   - Jerarquía clara mediante peso, tamaño y contraste sin saturación empresarial ni infantilismo.
2. **Glassmorphic & Frosting (Efecto Cristal Esmerilado)**:
   - Fondos translúcidos con `backdrop-filter: blur(16px)` / `-webkit-backdrop-filter: blur(16px)`.
   - Bordes sutiles con resplandor suave (`border: 1px solid rgba(255, 255, 255, 0.08)` en modo oscuro y `rgba(0, 0, 0, 0.08)` en modo claro).
3. **Modo Oscuro (Dark Theme) & Modo Claro (Light Theme)**:
   - **Modo Oscuro**: Fondo `090d16`, cards `131b2e`, texto `f8fafc`.
   - **Modo Claro**: Fondo `f1f5f9`, cards `ffffff`, texto `0f172a`.
   - Transición fluida con el conmutador de tema `☀️ / 🌙`.
4. **Radios de Borde Continuos (Squircular Corners)**:
   - Cards y Modales: `border-radius: 20px` o `28px`.
   - Botones e Inputs: `border-radius: 12px` o `14px`.
   - Chips y Badges: `border-radius: 20px`.
5. **Colores Semánticos & Avatares por Integrante**:
   - Identificadores de miembros: Azul (`#3b82f6`), Rosa (`#ec4899`), Verde (`#10b981`), Naranja (`#f59e0b`), Púrpura (`#8b5cf6`).
   - Estados: Verde (`#22c55e`), Amarillo (`#eab308`), Rojo (`#ef4444`), Azul (`#3b82f6`), Gris (`#64748b`).

---

## 📱 2. Interacciones y Micro-animaciones
- Botones principales con elevación al pasar el cursor (`transform: scale(1.02)` / `scale(1.08)`).
- Modales táctiles tipo *Apple Bottom Sheet* y centrado suave con desfoque de fondo.
- Respuesta en la interfaz en menos de 50ms (Estado Optimista Sutil).
