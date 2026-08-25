---
name: mobile-first-design
description: Directrices avanzadas de diseño e implementación Mobile-First para FAMILY-HUB (Apple HIG / Android Material Touch).
---

# Mobile-First Design Guidelines for FAMILY-HUB

Esta habilidad define los estándares técnicos y visuales para garantizar una experiencia táctil impecable (**10/10**) en teléfonos móviles.

## 1. Zonas del Pulgar & Touch Targets (≥ 44px × 44px)
- **Área Táctil Mínima**: Todos los elementos interactivos (botones, chips, iconos de acción, switches y tiradores) deben tener un tamaño de objetivo táctil mínimo de **44px × 44px** (según Apple HIG).
- **Primary Thumb Zone**: Las acciones principales (Registrar Movimiento, Nuevo Evento, Confirmar) deben ubicarse en el tercio inferior de la pantalla para ser alcanzadas fácilmente con el pulgar.
- **Prevención de Zoom Automático en iOS**: Todos los elementos `<input>`, `<select>` y `<textarea>` en vista móvil deben tener un `font-size` base de **16px** para evitar que iOS ejecute un zoom automático disruptivo al enfocar.

## 2. Soporte de Áreas Seguras (Safe Areas & Notch)
- **Safe Area Insets**: Respetar las zonas con muesca (Notch/Dynamic Island) y la barra de inicio en teléfonos modernos utilizando variables CSS:
  ```css
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  padding-top: max(0.5rem, env(safe-area-inset-top));
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
  ```
- **Navegación Inferior (`AppBottomNav`)**: Mantener fija en la parte inferior de la pantalla con un alto mínimo de `64px` más la compensación de `env(safe-area-inset-bottom)`.

## 3. Modales Táctiles tipo Bottom Sheet
- **Diseño Hoja Inferior**: En teléfonos (pantallas ≤ 768px), los modales se abren desde la parte inferior ocupando el 90% de la altura del viewport.
- **Tirador Táctil (*Grabber Handle*)**: Incluir una barra visual redondeada superior (`40px × 5px`, color translúcido) que indique que el modal es deslizable.
- **Bordes Curvados**: Esquinas superiores redondeadas con radio de `28px`.

## 4. Desplazamiento y Momentum Táctil
- **Desplazamiento Suave**: Activar `-webkit-overflow-scrolling: touch` en contenedores con scroll.
- **Sin Desbordamiento Horizontal**: Garantizar `overflow-x: hidden` en la raíz para evitar balanceos laterales accidentales.
