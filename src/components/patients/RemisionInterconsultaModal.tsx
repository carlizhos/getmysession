import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Stethoscope,
  Download,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { downloadRemisionPDF } from '@/lib/generateRemisionPDF';

interface RemisionInterconsultaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    id: string;
    name: string;
    document_type?: string | null;
    document_number?: string | null;
    phone?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
  };
  profile: any;
}

const SPECIALTIES = [
  { id: 'psiquiatria', label: 'Psiquiatría / Salud Mental' },
  { id: 'neurologia', label: 'Neurología Clínica' },
  { id: 'medicina_general', label: 'Medicina General / Familiar' },
  { id: 'neuropsicologia', label: 'Evaluación Neuropsicológica' },
  { id: 'toxicologia', label: 'Toxicología / Adicciones' },
  { id: 'urgencias_salud_mental', label: 'Urgencias en Salud Mental' },
];

export default function RemisionInterconsultaModal({
  open,
  onOpenChange,
  patient,
  profile,
}: RemisionInterconsultaModalProps) {
  const [specialty, setSpecialty] = useState('psiquiatria');
  const [priority, setPriority] = useState<'ordinaria' | 'prioritaria' | 'urgencia'>('ordinaria');
  const [targetInstitution, setTargetInstitution] = useState('');
  const [reason, setReason] = useState('');
  const [cie10Code, setCie10Code] = useState('F411');
  const [dsm5Code, setDsm5Code] = useState('');
  const [diagDesc, setDiagDesc] = useState('');
  const [mentalStateSummary, setMentalStateSummary] = useState('');
  const [riskEvaluation, setRiskEvaluation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open && patient.id) {
      // Fetch latest note to prefill diagnostic and mental state
      (async () => {
        try {
          const { data: note } = await supabase
            .from('session_notes')
            .select('cie10_code, dsm5_code, diagnostico_principal, subjective, objective, assessment, plan')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (note) {
            if (note.cie10_code) setCie10Code(note.cie10_code);
            if (note.dsm5_code) setDsm5Code(note.dsm5_code);
            if (note.diagnostico_principal) setDiagDesc(note.diagnostico_principal);

            const summary = [note.subjective, note.assessment].filter(Boolean).join('. ');
            if (summary) {
              setMentalStateSummary(summary.slice(0, 300));
            }
          }

          // Default reason template based on specialty
          if (!reason) {
            setReason('Se remite al paciente para valoración diagnóstica especializada e inicio/ajuste de tratamiento psicofarmacológico coadyuvante al proceso de psicoterapia.');
          }
        } catch (err) {
          console.error('Error fetching clinical note for referral:', err);
        }
      })();
    }
  }, [open, patient.id]);

  const handleGenerate = async () => {
    if (!reason.trim()) {
      toast.error('Por favor escribe el motivo o justificación de la remisión');
      return;
    }

    setIsGenerating(true);
    try {
      await downloadRemisionPDF({
        patient: {
          name: patient.name,
          document_type: patient.document_type,
          document_number: patient.document_number,
          phone: patient.phone,
          emergency_contact_name: patient.emergency_contact_name,
          emergency_contact_phone: patient.emergency_contact_phone,
        },
        profile: {
          full_name: profile?.full_name,
          nit: profile?.nit,
          reps_code: profile?.reps_code,
          rethus_number: profile?.rethus_number,
          telefono_profesional: profile?.telefono_profesional,
          signature_data: profile?.signature_data,
        },
        specialty,
        targetInstitution,
        priority,
        reason,
        cie10Code,
        dsm5Code,
        diagnosticDescription: diagDesc,
        mentalStateSummary,
        riskEvaluation,
      });

      toast.success('Orden de remisión e interconsulta generada con éxito');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error generating remision:', err);
      toast.error('Error al generar la remisión: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Orden de Remisión e Interconsulta</DialogTitle>
              <DialogDescription className="text-xs">
                {patient.name} · Marco Ley 1616 de 2013 de Salud Mental
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Especialidad Destino y Prioridad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Especialidad Receptora</Label>
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {SPECIALTIES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Carácter / Prioridad</Label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'ordinaria', label: 'Ordinaria', color: 'border-cyan-500 text-cyan-700 bg-cyan-50 dark:bg-cyan-950/40' },
                  { id: 'prioritaria', label: 'Prioritaria', color: 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40' },
                  { id: 'urgencia', label: 'Urgencia', color: 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950/40' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as any)}
                    className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border text-center transition-all ${
                      priority === p.id ? `${p.color} border-2` : 'border-border text-muted-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inst" className="text-xs font-medium">Institución Receptora o EPS sugerida (Opcional)</Label>
            <Input
              id="inst"
              placeholder="Ej: Clínica de Nuestra Señora de la Paz / EPS Sanitas / Red Hospitalaria"
              value={targetInstitution}
              onChange={e => setTargetInstitution(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Diagnóstico */}
          <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-900/40 p-3 space-y-2">
            <Label className="text-xs font-semibold text-foreground">Impresión Diagnóstica Clínica</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="CIE-10 (ej: F411 o F321)"
                value={cie10Code}
                onChange={e => setCie10Code(e.target.value.toUpperCase())}
                className="text-xs h-8 bg-background font-mono"
              />
              <Input
                placeholder="DSM-5 (ej: 300.02)"
                value={dsm5Code}
                onChange={e => setDsm5Code(e.target.value)}
                className="text-xs h-8 bg-background font-mono"
              />
            </div>
            <Input
              placeholder="Descripción del diagnóstico o motivo clínico principal"
              value={diagDesc}
              onChange={e => setDiagDesc(e.target.value)}
              className="text-xs h-8 bg-background"
            />
          </div>

          {/* Motivo de la remisión */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-semibold">
              1. Motivo y Justificación Clínica de la Remisión <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe detalladamente por qué se remite y qué se solicita al especialista..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Resumen del Estado Mental */}
          <div className="space-y-1.5">
            <Label htmlFor="mental" className="text-xs font-medium">
              2. Resumen de la Evolución y Estado Mental Actual
            </Label>
            <Textarea
              id="mental"
              value={mentalStateSummary}
              onChange={e => setMentalStateSummary(e.target.value)}
              placeholder="Afecto, juicio, pensamiento, síntomas cardinales observados en sesiones previas..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Factores de Riesgo */}
          <div className="space-y-1.5">
            <Label htmlFor="risk" className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> 3. Factores de Riesgo y Seguridad (si aplica)
            </Label>
            <Textarea
              id="risk"
              value={riskEvaluation}
              onChange={e => setRiskEvaluation(e.target.value)}
              placeholder="Evaluación de ideación o intencionalidad autolítica, red de apoyo familiar, impulsividad..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            variant="zen"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !reason.trim()}
            className="gap-1.5 font-bold"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Descargar Orden de Remisión (PDF)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
