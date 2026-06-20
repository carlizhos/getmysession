# Task Checklist

## 🗺️ Roadmap Status Summary
- **Fase 1: Fundamentos y MVP** — ✅ Completado
- **Fase 2: Gestión Core** — ✅ Completado
- **Fase 3: Inteligencia y Pagos** — ✅ Completado
- **Fase 4: Experiencia Integral y Portales** — ✅ Completado
- **Fase 5: Saudade Premium** — 📅 Pendiente
- **Fase 6: Infraestructura y Branding** — ✅ Completado

## 🎯 Próximos Pasos (Fase 5)
- [x] **Firma Digital de Consentimientos Integrada**
    - [x] Conectar `SignaturePad` al Portal de Pacientes para firmas remotas.
- [x] Install Playwright package and setup playwright.config.ts
- [x] Create E2E test tests/critical-flow.spec.ts
- [x] Add E2E scripts to package.json
- [x] Create Vitest test src/test/whatsapp-webhooks.test.ts
- [x] Run and verify all tests
- [x] **Asistente de IA (Voz a Texto)**
    - [x] Implementar transcripción de audio para generar notas SOAP automáticamente.
- [x] **Paquetes de Sesiones y Créditos**
    - [x] Integrar venta de paquetes en Stripe y descuento de créditos al agendar.
- [x] **Diario Emocional y Tareas**
    - [x] Módulo en Portal de Pacientes para Mood Tracking y ejercicios.
- [x] **Recordatorios Automáticos**
    - [x] Configurar cron jobs/edge functions para avisos 24h antes.

## 🛠️ Tareas Menores Pendientes
- [ ] **Contexto de Paciente en IA**: Pasar historial del paciente al chat para respuestas personalizadas.
- [ ] **Automatización de Pipeline**: Mover leads a "Cita Agendada" automáticamente al crear el primer appointment.
- [x] **Fix de UX**: Bug de botón deshabilitado al navegar hacia atrás (Completado en Fase 6).
- [x] **Google GSI**: Implementar login nativo con marca Saudade (Completado en Fase 6).
- [x] **Unificación de Headers**: Patrón "Island" aplicado en toda la plataforma (Completado en Fase 6).
- [x] **Límites de Reserva**: Lógica de configuración reparada en Ajustes (Completado en Fase 6).

## 📊 Estado Actual
La mayoría de la infraestructura core y las integraciones externas (Stripe, Facturapi, Google Calendar) están listas y funcionando. El enfoque ahora vira hacia la **retención del paciente** y la **automatización avanzada** mediante IA y el portal.
