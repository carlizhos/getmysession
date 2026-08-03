import { DriveStep } from 'driver.js';

export interface TourConfig {
  steps: DriveStep[];
}

export const MODULE_TOURS: Record<string, TourConfig> = {
  dashboard: {
    steps: [
      {
        element: '#tour-dashboard-header',
        popover: {
          title: '👋 ¡Bienvenido a Saudade!',
          description: 'Este es tu centro de control clínico. Aquí verás el resumen de tu práctica diaria, tus pacientes activos y el avance de tus metas.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-dashboard-kpis',
        popover: {
          title: '📊 Indicadores Clave (KPIs)',
          description: 'Visualiza rápidamente tus Ingresos del Mes, Pacientes Activos, Sesiones Completadas y Citas de Hoy.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-dashboard-agenda',
        popover: {
          title: '📅 Agenda de Hoy',
          description: 'Consulta tus citas programadas para el día de hoy, con sus horarios, pacientes y accesos directos.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#tour-dashboard-pending-payments',
        popover: {
          title: '💳 Pagos Pendientes',
          description: 'Mantén el control de tus cobranzas. Haz clic en "Ver detalles" para ir directo al módulo de Finanzas.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '#tour-dashboard-session-goal',
        popover: {
          title: '🎯 Meta Mensual de Sesiones',
          description: 'Sigue tu avance respecto a la meta de sesiones que te propongas. Puedes hacer clic en la insignia de "Meta" para personalizarla.',
          side: 'left',
          align: 'center',
        },
      },
    ],
  },
  patients: {
    steps: [
      {
        element: '#tour-patients-header',
        popover: {
          title: '👥 Expedientes de Pacientes',
          description: 'Administra todo el historial clínico, notas, pruebas y datos de contacto de tus pacientes cumpliendo con la NOM-024.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-patients-search',
        popover: {
          title: '🔍 Búsqueda y Filtros',
          description: 'Encuentra a cualquier paciente por su nombre, teléfono o etiqueta de estado.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-patients-add-btn',
        popover: {
          title: '➕ Registrar Nuevo Paciente',
          description: 'Añade un nuevo expediente ingresando sus datos generales, de contacto e historia clínica inicial.',
          side: 'left',
          align: 'center',
        },
      },
    ],
  },
  agenda: {
    steps: [
      {
        element: '#tour-agenda-views',
        popover: {
          title: '📅 Vistas de Agenda',
          description: 'Cambia fácilmente entre vista de Día, Semana, Mes o Lista de Citas según tus preferencias.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-agenda-new-btn',
        popover: {
          title: '➕ Agendar Cita',
          description: 'Programa nuevas sesiones eligiendo paciente, modalidad (Presencial o En línea), fecha y hora con el selector inteligente.',
          side: 'left',
          align: 'center',
        },
      },
    ],
  },
  finance: {
    steps: [
      {
        element: '#tour-finance-kpis',
        popover: {
          title: '💰 Resumen Financiero',
          description: 'Monitorea el Total Cobrado, Por Cobrar, Sesiones Cobradas y Tus Honorarios Netos calculados automáticamente.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-finance-pending',
        popover: {
          title: '⚡ Cobros Pendientes Accionables',
          description: 'Registra cobros en Efectivo, Transferencia o genera un Link de Stripe directamente desde esta sección.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  aiAssistant: {
    steps: [
      {
        element: '#tour-ai-header',
        popover: {
          title: '🧠 Asistente IA Clínico',
          description: 'Tu copiloto clínico de inteligencia artificial. Genera hipótesis diagnósticas, resúmenes de sesión y recomendaciones de tratamiento.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-ai-patient-select',
        popover: {
          title: '👤 Vinculación de Paciente',
          description: 'Selecciona a un paciente para contextualizar la IA con su expediente activo y guardar las sugerencias directamente en sus notas.',
          side: 'left',
          align: 'center',
        },
      },
    ],
  },
  notes: {
    steps: [
      {
        element: '#tour-notes-header',
        popover: {
          title: '📝 Notas Clínicas Estructuradas',
          description: 'Crea, consulta y gestiona las notas de sesión formateadas bajo la norma mexicana NOM-024-SSA3-2012.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-notes-patient-select',
        popover: {
          title: '🔍 Filtro por Paciente',
          description: 'Filtra las notas para consultar la evolución clínica continua de cada paciente registrado.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-notes-new-btn',
        popover: {
          title: '➕ Redactar Nueva Nota',
          description: 'Inicia la creación de una nota mediante dictado por voz IA, plantillas del sistema (SOAP, TCC) o texto libre.',
          side: 'left',
          align: 'center',
        },
      },
    ],
  },
  consents: {
    steps: [
      {
        element: '#tour-consents-header',
        popover: {
          title: '📄 Consentimientos Informados Legalmente Válidos',
          description: 'Genera y resguarda consentimientos firmados digitalmente por tus pacientes con trazabilidad y folio único.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-consents-new-btn',
        popover: {
          title: '✒️ Crear Nuevo Consentimiento',
          description: 'Genera un documento legal personalizado para enviarlo a firma digital o descargarlo en PDF.',
          side: 'left',
          align: 'center',
        },
      },
    ],
  },
  messages: {
    steps: [
      {
        element: '#tour-messages-header',
        popover: {
          title: '💬 Centro de Comunicación WhatsApp',
          description: 'Envía y recibe mensajes de WhatsApp con tus pacientes, realiza envíos de plantillas oficiales y recordatorios de citas.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
  settings: {
    steps: [
      {
        element: '#tour-settings-header',
        popover: {
          title: '⚙️ Configuración General de Cuenta',
          description: 'Personaliza tus datos profesionales, establece tus horarios de atención, configura comisiones y enlaces de cobro.',
          side: 'bottom',
          align: 'start',
        },
      },
    ],
  },
};
