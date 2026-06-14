import { ReactNode } from 'react';
import { useSubscription, PremiumFeature, usePricingModal } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

interface FeatureGateProps {
  feature: PremiumFeature;
  children: ReactNode;
  /** Optional custom message */
  message?: string;
  /** If true, renders inline lock instead of overlay */
  inline?: boolean;
}

const FEATURE_LABELS: Record<PremiumFeature, { title: string; description: string }> = {
  ai_scribe: {
    title: 'Escriba de IA',
    description: 'La IA escucha tu sesión y redacta la nota SOAP automáticamente.',
  },
  ai_assistant: {
    title: 'Asistente de IA',
    description: 'Genera reportes clínicos, consulta expedientes y más con inteligencia artificial.',
  },
  ai_voice: {
    title: 'Dictado con IA',
    description: 'Dicta tus notas y la IA las estructura en formato clínico.',
  },
  telehealth: {
    title: 'Consultorio Virtual',
    description: 'Videollamadas integradas con notas en pantalla dividida.',
  },
  pdf_export: {
    title: 'Exportar a PDF',
    description: 'Descarga expedientes y notas clínicas en formato PDF profesional.',
  },
  invoicing: {
    title: 'Facturación Electrónica',
    description: 'Genera facturas CFDI directamente desde la plataforma.',
  },
  core_patients: {
    title: 'Gestión de Pacientes',
    description: 'Accede al CRM clínico para gestionar todos tus pacientes y expedientes.',
  },
  core_agenda: {
    title: 'Agenda Clínica',
    description: 'Organiza tus consultas, recordatorios automáticos y videollamadas.',
  },
  core_notes: {
    title: 'Notas Clínicas',
    description: 'Redacta y almacena notas de sesión de forma segura y estructurada.',
  },
  core_tests: {
    title: 'Pruebas Psicométricas',
    description: 'Asigna y evalúa cuestionarios clínicos (PHQ-9, GAD-7) de forma automática.',
  },
  core_consents: {
    title: 'Consentimientos Informados',
    description: 'Envía y recaba firmas electrónicas para tus documentos legales.',
  },
  core_finance: {
    title: 'Control Financiero',
    description: 'Administra tus cobros, facturación y reportes de ingresos.',
  },
};

export default function FeatureGate({ feature, children, message, inline = false }: FeatureGateProps) {
  const { canUse } = useSubscription();
  const { open: openModal } = usePricingModal();

  if (canUse(feature)) {
    return <>{children}</>;
  }

  const label = FEATURE_LABELS[feature];

  if (inline) {
    return (
      <button
        onClick={openModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-xs font-semibold text-primary hover:bg-primary/10 transition-all cursor-pointer"
      >
        <Lock className="h-3 w-3" />
        <span>Función Pro</span>
      </button>
    );
  }

  return (
    <div className="relative rounded-2xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent overflow-hidden">
      {/* Blurred placeholder */}
      <div className="pointer-events-none select-none opacity-20 blur-[2px] saturate-50">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-background/60 backdrop-blur-sm z-10">
        <div className="bg-primary/10 p-4 rounded-2xl mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          {message || label.title}
        </h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          {label.description}
        </p>
        <Button
          onClick={openModal}
          className="gap-2 rounded-xl font-bold bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white shadow-lg shadow-primary/25 px-6"
        >
          <Sparkles className="h-4 w-4" />
          Desbloquear con Plan Pro
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
