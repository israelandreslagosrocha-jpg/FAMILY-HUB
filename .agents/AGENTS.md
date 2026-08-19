# REGLAS GENERALES DEL PROYECTO FAMILY-HUB

## 1. Principio de control y aprobación
No realizar implementaciones, modificar archivos, instalar dependencias, alterar arquitectura o crear tablas en Supabase sin obtener aprobación previa.
Antes de cada implementación relevante explicar:
1. Qué se va a implementar.
2. Por qué es necesario.
3. Cómo se propone implementarlo.
4. Qué archivos, componentes, servicios o datos serán afectados.
5. Qué riesgos o consecuencias puede tener.
6. Cómo se comprobará que la implementación funciona correctamente.

## 2. Presentación obligatoria de alternativas
Presentar al menos 3 alternativas técnicamente viables antes de cada implementación relevante.
Para cada alternativa evaluar:
- Complejidad de implementación.
- Rendimiento.
- Impacto en UX/UI.
- Mantenibilidad.
- Dependencias necesarias.
- Ventajas.
- Desventajas.
- Consecuencias futuras.
Se debe declarar explícitamente la **OPCIÓN RECOMENDADA** priorizando: UX > Rapidez > Simplicidad > Confiabilidad > Mantenibilidad > Seguridad > Complejidad razonable.

## 3. Principio de simplicidad
Uso exclusivamente familiar. Evitar sobreingeniería, abstracciones prematuras y arquitecturas SaaS/multitenant complejas.

## 4. Prioridad: velocidad y respuesta
Interfaz ultra rápida y fluida en teléfono y computador. Respuesta visual inmediata. Caché local / IndexedDB cuando aporte valor.

## 5. Arquitectura tecnológica
- Vue 3 (Composition API con `<script setup>`)
- Vite
- PWA (infraestructura inicial)
- Supabase (Auth, PostgreSQL, Storage - en etapas posteriores)
- IndexedDB (caché/almacenamiento local - cuando aporte valor)

## 6. Diseño UX/UI
Inspiración en patrones de diseño Apple (iOS, iPadOS, macOS): claridad, jerarquía visual, simplicidad, consistencia y controles familiares.

## 7. Tipografía
SF Pro / San Francisco (fuente de sistema). Jerarquía mediante tamaño, peso, espaciado, posición y contraste.

## 8. Navegación
Barra inferior en teléfono, navegación lateral en pantallas grandes. Las pestañas sirven para navegar, no para ejecutar acciones.

## 9. Diseño responsive
Diseño multiplataforma desde el primer momento (móvil vertical/horizontal, tablet, notebook, desktop).

## 10. Datos y sincronización
Supabase como fuente principal. Caché local para velocidad percibida. Responsabilidades claras entre datos locales y remotos.

## 11. Seguridad
Variables de entorno para claves públicas, datos privados, políticas RLS en Supabase antes de dar por terminada la arquitectura de datos.

## 12. Desarrollo por etapas (Roadmap v1.0 Family Stable)
Desarrollo secuencial y controlado por etapas. No avanzar a la siguiente etapa sin validar y obtener confirmación de la actual.
- Etapa 1: Carcasa técnica y visual (Shell con datos mock). ✅ COMPLETADA
- Etapa 2A: Diseño y aprobación del modelo de datos + Auth + Seguridad. ✅ APROBADA
- Etapa 2B: Generación y revisión del Script SQL reproducible de Migración (`supabase/migrations/00001_initial_schema.sql`). ✅ EJECUTADA
- Etapa 2C: Ejecución en Supabase + Pruebas y Verificación de Seguridad. ✅ COMPLETADA CON ÉXITO (100% PASS)
- Etapa 3A: Arquitectura Funcional y UX del Calendario. ✅ APROBADA
- Etapa 3B: Desarrollo Visual del Calendario en Vue 3 con Datos Mock. ✅ COMPLETADA
- Etapa 3C: Integración del Calendario con Supabase (`00002_calendar_event_rpc.sql` + `calendarService.ts`). ✅ EJECUTADA Y COMPLETADA
- Etapa 3D: Pruebas Reales de Integración del Calendario. ✅ COMPLETADA CON ÉXITO (100% PASS)
- Etapa 4A: Arquitectura Funcional y UX de Tareas y Responsabilidades. ✅ APROBADA
- Etapa 4B: Desarrollo Visual de Tareas en Vue 3 con Datos Mock. ✅ COMPLETADA
- Etapa 4C: Integración de Tareas con Supabase (`00003_task_rpc_and_audit.sql` + `taskService.ts`). ✅ EJECUTADA Y COMPLETADA
- Etapa 4D: Pruebas Reales de Integración de Tareas. ✅ COMPLETADA CON ÉXITO (100% PASS)
- Etapa 5: Motor de Automatizaciones del Hogar. ✅ IMPLEMENTADA, INTEGRADA Y VERIFICADA AL 100% DE LA BATERÍA DE PRUEBAS DEFINIDA.
- Etapa 6: Finanzas del Hogar. ✅ IMPLEMENTADA, INTEGRADA Y VERIFICADA AL 100% DE LA BATERÍA DE PRUEBAS DEFINIDA.
- Etapa 7: Boletas / Captura OCR. ✅ IMPLEMENTADA, INTEGRADA Y VERIFICADA AL 100% DE LA BATERÍA DE PRUEBAS DEFINIDA.
- Etapa 8A: Arquitectura Funcional y UX de PWA / Notificaciones / Offline avanzado. ✅ APROBADA CON 10 PRECISIONES
- Etapa 8B: Desarrollo Visual de PWA, Alertas Offline y Centro de Notificaciones. ✅ COMPLETADA (0 ERRORES)
- Etapa 8C: Propuesta Técnica, Idempotencia en Servidor (`00007_idempotency_and_push.sql` V2.3) y WebPush. ✅ IMPLEMENTADA, INTEGRADA Y VERIFICADA AL 100% DE LA BATERÍA DE PRUEBAS DEFINIDA (9/9 PASS).
- Etapa 8D: Pruebas Reales de PWA, Notificaciones y Comportamiento Offline (ÚLTIMA SUB-ETAPA). 🔄 EN CURSO
- 🎯 **FAMILY-HUB v1.0 FAMILY STABLE**: CONGELACIÓN DE FUNCIONALIDADES (FEATURE FREEZE) Y DESPLIEGUE PARA USO FAMILIAR COTIDIANO REAL.

## 13. Documentación
Mantener la documentación del proyecto actualizada (arquitectura, modelo de datos, componentes, decisiones).

## 14. Regla fundamental
Optimizar por **utilidad + rapidez + claridad + confiabilidad + facilidad de uso**. Preferir siempre la solución simple.

## 15. Usuarios, miembros y perfiles familiares
Distinción clave: `Auth User` (cuenta de acceso) ≠ `Family Member` (perfil en el hogar). Cada miembro tiene un perfil propio: Nombre, Avatar (`avatarId` catalogado localmente), Color identificador, Preferencias, Cuenta opcional y Estado activo/inactivo.

## 16. Avatares
Catálogo local de 8 avatares SVG modernos y consistentes referenciados por `avatarId`. Sin dependencia de APIs externas.

## 17. Identidad visual de cada miembro
Color identificador único por miembro, usado como identificador secundario acompañado siempre de avatar y nombre (accesible para daltonismo).

## 18. Sistema semántico de colores
Separación clara entre colores personales de miembros y colores de estado (Verde=completado, Amarillo=pendiente, Rojo=urgente/atención, Azul=info, Gris=archivado).

## 19. Histórico
Registro histórico estructurado e inalterable generado exclusivamente por triggers de PostgreSQL: Actor (`auth.uid()`) → Acción → Entidad → Metadatos → Fecha. La UI formatea el texto dinámicamente.

## 20. Dashboard personalizado
Visión principal "Mi día" personalizada para el miembro autenticado (tareas personales, responsabilidades, próximos eventos).

## 21. Dashboard familiar
Vista "Familia" para el estado general del hogar (calendario global, tareas del hogar, balance financiero, actividad reciente).

## 22. Cambio entre vista personal y familiar
Conmutador rápido e inmediato `[ Mi día ]` / `[ Familia ]` en la pantalla principal sin navegar a otra sección.

## 23. Filtros familiares
Filtro rápido por miembros (`Todos | Israel | Esposa | ...`) con avatar, nombre y distintivo de color.

## 24. Principio de contexto
Priorización clara de información: 1. Qué tengo que hacer, 2. Qué viene después, 3. Pendiente, 4. Atención, 5. Estado de la familia, 6. Información secundaria.

## 25. Personalización sin complejidad
Valores predeterminados razonables sin menús de configuración abrumadores.

## 26. Principio visual general
Identidad visual: **familiar + moderna + clara + tranquila + rápida**. Sin infantilidad ni saturación empresarial.

## 27. Regla de separación entre interfaz, lógica y datos
La aplicación deberá mantener separadas las capas:
`UI → Estado (Pinia Store) → Servicios (APIs / Mocks) → Supabase / Almacenamiento local`
Los componentes visuales (.vue) no deberán realizar directamente consultas complejas a Supabase ni manipular persistencia directa.

## 28. Desarrollo visual con datos simulados (Mock Data)
Durante las primeras etapas, cuando una funcionalidad todavía no tenga implementado su backend, se utilizarán datos mock claramente identificados. No se crearán tablas, autenticación ni lógica de persistencia únicamente para hacer funcionar una pantalla en etapa de diseño.

## 29. Principio de diseño consciente e inspirado
Antes de implementar componentes visuales importantes, presentar la propuesta de estructura visual y justificarla según los principios UX definidos. No asumir que "estilo Apple" significa copiar interfaces de Apple ni utilizar componentes genéricos con apariencia similar.
