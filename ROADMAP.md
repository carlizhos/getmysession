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

- ✅ **Calendario y Citas**:
  - ✅ Vistas mensual, semanal y diaria
  - ✅ Crear citas → guardadas en `appointments`
  - ✅ Editar citas (click sobre la cita → diálogo pre-llenado)
  - ✅ Cancelar citas (estado `cancelled`, confirmación)
  - ✅ Hora fin automática (+1h)
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
  - 📅 Contexto de paciente en el chat

- ✅ **Pagos en Línea (Stripe)**:
  - ✅ Edge Function `create-checkout-session` → genera Stripe Checkout Session
  - ✅ Edge Function `stripe-webhook` → sincroniza estado `paid` (producción)
  - ✅ Edge Function `verify-stripe-payment` → verificación manual post-redirect (desarrollo local)
  - ✅ UI en Finanzas: modal "Registrar Pago" con métodos (Efectivo / Transferencia / Stripe)
  - ✅ Registro automático al regresar del checkout de Stripe (`?payment=success&apt=ID`)
  - ✅ Notas/referencia en pagos de efectivo y transferencia

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
- 📅 Despliegue en producción con dominio personalizado y SMTP real
