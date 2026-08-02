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
};
