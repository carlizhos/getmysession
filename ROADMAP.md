# 🗺️ Roadmap — MindCare / Mindful Flow

## Leyenda
- ✅ **Completado**
- 🚧 **En Progreso**
- 📅 **Pendiente**

---

## Fase 1: Fundamentos y MVP ✅
- ✅ Configuración: Vite + React + TypeScript + Tailwind + shadcn/ui
- ✅ Navegación con React Router (8 secciones)
- ✅ Layout responsive: Sidebar, Header móvil con hamburguesa
- ✅ Modo claro / oscuro
- ✅ **Autenticación con Supabase**:
  - ✅ Login con Google OAuth
  - ✅ Protección de rutas
  - ✅ Caducidad por inactividad (30s aviso + 30s countdown)
  - ✅ Auto-logout al llegar a 0s
- ✅ **Audit Log HIPAA**:
  - ✅ `session_logs` — login / logout / timeout / session_extended
  - ✅ `page_views` — registro de cada página visitada

---

## Fase 2: Gestión Core ✅
- ✅ **Pacientes**:
  - ✅ Lista con búsqueda y filtros
  - ✅ Vista de detalle con tabs (Info / Historial / Notas)
  - ✅ Crear nuevo paciente
  - ✅ Editar paciente (formulario pre-llenado)
  - ✅ Eliminar paciente (confirmación en 2 pasos)
  - ✅ Botón "Agendar Nueva Cita" → navega a Calendario
  - ✅ Layout 50/50 (lista · detalle)

- ✅ **Pipeline CRM (Kanban)**:
  - ✅ 6 etapas: Nuevo Lead → Contactado → Cita Agendada → Primera Sesión → Paciente Activo → Descartado
  - ✅ Drag & drop con sincronización Supabase
  - ✅ Formulario "Nuevo Lead" con fuente de origen
  - ✅ Badge de fuente en cada tarjeta
  - ✅ Modal de celebración al convertir lead en paciente activo
  - ✅ Stats de conversión
  - ✅ Scroll horizontal en móvil

- ✅ **Calendario y Citas Inteligente**:
  - ✅ Vistas mensual, semanal, diaria y lista
  - ✅ **Prevención de Solapamiento Cero-Latencia**: Detección de colisiones en tiempo real antes de enviar formulario
  - ✅ **Deshabilitación en Vivo de Horarios Ocupados**: Visualización de chips con estado (🟢 Libre | 🔴 Ocupado tachado) e inhabilitación en reloj `ClockPicker`
  - ✅ **Sugerencia por Historial del Paciente**: Recomendación con 1-clic basada en el hábito de agendamiento del paciente
  - ✅ **Motor de Zonas Horarias (Browser-Agnostic)**: `buildUTCFromClinicTime` reescrito con `Intl.DateTimeFormat.formatToParts` + `Date.UTC` para eliminar desfasamiento de 1 hora
  - ✅ Crear, editar y cancelar citas con actualización reactiva
  - ✅ Hora fin automática configurada por servicio
  - ✅ Vista semanal con scroll horizontal en móvil

- ✅ **Notas Clínicas**:
  - ✅ Crear notas con formulario estructurado (NOM-024)
  - ✅ Guardado en `session_notes` (Supabase)
  - ✅ Lista con búsqueda y vista de detalle
  - ✅ Editar reporte de nota
  - ✅ Eliminar nota (confirmación)
  - ✅ Layout 50/50 (lista · detalle)
  - ✅ Diagnóstico CIE-10 (Chapter V — Mental Disorders)

- ✅ **Dashboard con datos reales**:
  - ✅ Ingresos del mes, pacientes activos, citas hoy, sesiones completadas
  - ✅ Agenda del día desde `appointments`
  - ✅ Notas recientes desde `session_notes`
  - ✅ Gráfico de ingresos (últimos 6 meses)

---

## Fase 3: Inteligencia y Pagos ✅
- ✅ **IA Asistente**:
  - ✅ Interfaz de chat
  - ✅ Generación de notas clínicas con IA (Edge Function `process-clinical-note`)
  - ✅ Contexto de paciente en el chat (Seguro: sin datos sensibles)

- ✅ **Pagos en Línea (Stripe)**:
  - ✅ Edge Function `create-checkout-session` → genera Stripe Checkout Session
  - ✅ Edge Function `stripe-webhook` → sincroniza estado `paid` (producción)
  - ✅ Edge Function `verify-stripe-payment` → verificación manual post-redirect (desarrollo local)
  - ✅ UI en Finanzas: modal "Registrar Pago" con métodos (Efectivo / Transferencia / Stripe)
  - ✅ Registro automático al regresar del checkout de Stripe (`?payment=success&apt=ID`)
  - ✅ Notas/referencia en pagos de efectivo y transferencia
- ✅ **Facturación Electrónica (Facturapi)**:
  - ✅ Integración con CFDI 4.0 (México)
  - ✅ Automatización de correo al paciente
  - ✅ Descarga directa de PDF

- ✅ **Finanzas**:
  - ✅ KPIs: Total cobrado, Por cobrar, Sesiones cobradas, Honorarios netos
  - ✅ Desglose por método: Efectivo / Transferencia / Stripe
  - ✅ Resumen consolidado con fees y splits (consultorio vs. psicólogo)
  - ✅ Gráfico semanal de ingresos
  - ✅ Tabla de cobros con detalle por transacción
  - ✅ Secciones reordenables con drag & drop
  - ✅ Configuración de splits en Ajustes

- ✅ **Consentimientos Informados**:
  - ✅ Generación y gestión de consentimientos

---

## Fase 4: Experiencia Integral y Portales ✅
- ✅ **Expediente Clínico 360**:
  - ✅ Fusión de lista y detalle (layout full-width)
  - ✅ Edición rápida de perfil de paciente
  - ✅ Header unificado y dinámico
- ✅ **Portal Público de Reservas**:
  - ✅ Configuración de "slug" único y horario laboral por día
  - ✅ Página estilo Calendly pública (`/reservar/:slug`)
  - ✅ Motor de disponibilidad en tiempo real
- ✅ **Portal de Pacientes (MVP)**:
  - ✅ Login con match de correo y teléfono
  - ✅ Dashboard de próximas citas para el paciente
  - ✅ Cancelación autónoma por el paciente
- ✅ **Gestor de Pruebas Psicométricas**:
  - ✅ Diálogo de asignación de pruebas con generación de URL segura
- ✅ **Identidad y Configuración Premium**:
  - ✅ Rebranding a Saudade (estética UI/UX glassmorphism)
  - ✅ Sistema de Avatar y subida de imágenes a Storage con soporte de iniciales

---

## 📌 Fase 5: Saudade Premium (Inteligencia y Retención) 📅

1. 📅 **Firma Digital de Consentimientos Integrada** — Conectar `SignaturePad` al Portal de Pacientes para firmas remotas previas a la primera cita.
2. 📅 **Asistente de IA (Voz a Texto / Análisis)** — Subir audio o nota de voz al expediente y generar la nota clínica SOAP/CIE-10 automáticamente.
3. 📅 **Paquetes de Sesiones y "Créditos" (Stripe)** — Venta de paquetes de N sesiones por adelantado, descontando créditos al agendar.
4. 📅 **Diario Emocional y Tareas Clínicas** — Módulo en el Portal de Pacientes para registrar Mood y responder ejercicios entre sesiones.
5. 📅 **Recordatorios Automáticos (Notificaciones)** — Edge Functions para envío de correos/SMS 24h antes de la cita.

---

## Tareas Menores Pendientes 📅
- 📅 Contexto de paciente en la pestaña del chat de IA
- 📅 Auto-mover lead en Pipeline a "Cita Agendada" al guardar cita
---

## Fase 6: Infraestructura, Branding y UX ✅
- ✅ **Optimización de Hosting (Vercel)**:
  - ✅ Configuración de rewrites en `vercel.json` para soporte de SPA (soluciona error 404 en refresco y navegación directa).
- ✅ **Experiencia de Usuario (Branding)**:
  - ✅ Rediseño premium de la página 404 con identidad Saudade (ilustración 3D, gradientes y animaciones).
- ✅ **Autenticación de Siguiente Nivel**:
  - ✅ **Google Authentication (Native/GSI)**: Implementación de popup nativo que muestra la marca "Saudade" en lugar del dominio de Supabase.
  - ✅ **Google One Tap**: Activación de inicio de sesión con un solo clic.
  - ✅ **Fix de UX**: Resolución del bug de botón deshabilitado al navegar hacia atrás.
- ✅ **Unificación Estética "Island Design"**:
  - ✅ Rediseño de headers en todos los módulos (Pacientes, CRM, Finanzas, etc.) al patrón de "isla" premium.
  - ✅ Estandarización de alturas compactas para optimizar el área de trabajo.
  - ✅ Iconografía coherente con degradados Sage Green y tipografía editorial.
- ✅ **Configuración y Límites**:
  - ✅ Reparación de la sección de Ajustes y lógica de límites de reserva.
- ✅ **Seguridad, Autenticación y UX**:
  - ✅ **Restablecimiento de Contraseña Pro (`ResetPassword.tsx`)**: Rediseño integral sin condiciones de carrera (Race Condition) con detección directa de tokens de recuperación de Supabase (`access_token`, `type=recovery`, `code`)
  - ✅ **Indicador de Fortaleza & Requisitos en Vivo**: Checklist dinámico (8+ caracteres, mayúscula, número, especial) y barra de 4 niveles
  - ✅ **Rate Limiting & Cooldowns**: Temporizador de enfriamiento de 60s en `ForgotPassword.tsx` y reenviar `Magic Link`
  - ✅ **Portales de React para Modales de Pantalla Completa**: Implementación de `createPortal(..., document.body)` en `OnboardingModal.tsx` y `PricingModal.tsx` para garantizar alineación superior y scroll fluido sin atrapamiento por `backdrop-blur` CSS
  - ✅ **Audit Logs**: Registro inmutable de exportaciones de datos en Supabase.
  - ✅ **Cifrado ALE (Application-Level Encryption)**: Protección Zero-Knowledge para CURP y RFC utilizando `crypto-js`.
  - ✅ **Segregación de Tablas**: Separación física de notas clínicas e información fiscal para reducir el radio de impacto.
  - ✅ **Privacidad en Exportaciones**: Eliminación automática de campos sensibles en descargas de CSV.
