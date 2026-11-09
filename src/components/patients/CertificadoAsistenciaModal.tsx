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
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Loader2, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { downloadCertificadoAsistenciaPDF } from '@/lib/generateCertificadoAsistenciaPDF';

interface CertificadoAsistenciaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    id: string;
    name: string;
    document_type?: string | null;
    document_number?: string | null;
    municipality_code?: string | null;
  };
  profile: any;
}

export default function CertificadoAsistenciaModal({
  open,
  onOpenChange,
  patient,
  profile,
}: CertificadoAsistenciaModalProps) {
  const [purpose, setPurpose] = useState<'laboral' | 'academico' | 'personal' | 'general'>('laboral');
  const [customPurpose, setCustomPurpose] = useState('');
  const [observations, setObservations] = useState('');
  const [includeDiagnostic, setIncludeDiagnostic] = useState(false);
  const [diagnosticText, setDiagnosticText] = useState('');
  const [appointments, setAppointments] = useState<Array<{ id: string; start_time: string; modality?: string; selected: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open && patient.id) {
      // Fetch completed appointments for this patient
      (async () => {
        setIsLoading(true);
        try {
          const { data: appts } = await supabase
            .from('appointments')
            .select('id, start_time, modality, status')
            .eq('patient_id', patient.id)
            .order('start_time', { ascending: false });

          if (appts && appts.length > 0) {
            setAppointments(
              appts.map(a => ({
                id: a.id,
                start_time: a.start_time,
                modality: a.modality === 'online' ? 'Telepsicología (Res. 2654/2019)' : 'Consulta Externa (Presencial)',
                selected: true,
              }))
            );
          } else {
            setAppointments([]);
          }

          // Fetch last session note for diagnosis suggestion
          const { data: lastNote } = await supabase
            .from('session_notes')
            .select('cie10_code, dsm5_code, diagnostico_principal')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastNote) {
            const cie = lastNote.cie10_code ? `CIE-10: ${lastNote.cie10_code}` : '';
            const dsm = lastNote.dsm5_code ? ` · DSM-5: ${lastNote.dsm5_code}` : '';
            const desc = lastNote.diagnostico_principal ? ` — ${lastNote.diagnostico_principal}` : '';
            setDiagnosticText(`${cie}${dsm}${desc}`.trim());
          }
        } catch (err) {
          console.error('Error fetching patient appointments:', err);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [open, patient.id]);

  const toggleSelectAll = (checked: boolean) => {
    setAppointments(prev => prev.map(a => ({ ...a, selected: checked })));
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setAppointments(prev => prev.map(a => a.id === id ? ({ ...a, selected: checked }) : a));
  };

  const handleGenerate = async () => {
    const selectedSessions = appointments
      .filter(a => a.selected)
      .map(a => ({
        date: format(parseISO(a.start_time), "d 'de' MMMM 'de' yyyy · HH:mm", { locale: es }),
        modality: a.modality,
      }));

    if (selectedSessions.length === 0) {
      toast.error('Selecciona al menos una sesión para certificar');
      return;
    }

    setIsGenerating(true);
    try {
      await downloadCertificadoAsistenciaPDF({
        patient: {
          name: patient.name,
          document_type: patient.document_type,
          document_number: patient.document_number,
        },
        profile: {
          full_name: profile?.full_name,
          nit: profile?.nit,
          reps_code: profile?.reps_code,
          rethus_number: profile?.rethus_number,
          telefono_profesional: profile?.telefono_profesional,
          signature_data: profile?.signature_data,
        },
        purpose: purpose,
        customPurposeText: customPurpose,
        sessions: selectedSessions,
        includeDiagnostic: includeDiagnostic,
        diagnosticText: diagnosticText,
        observations: observations,
      });

      toast.success('Constancia de asistencia generada y descargada');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error generating certificado:', err);
      toast.error('Error al generar la constancia: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Constancia de Asistencia a Consulta</DialogTitle>
              <DialogDescription className="text-xs">
                {patient.name} · {patient.document_type || 'CC'} {patient.document_number || 'Sin doc.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Destino / Finalidad */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Finalidad de la Constancia</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'laboral', label: 'Laboral (Empleador)' },
                { id: 'academico', label: 'Académico (Colegio/U)' },
                { id: 'personal', label: 'Trámites Personales' },
                { id: 'general', label: 'General / Abierta' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPurpose(opt.id as any)}
                  className={`p-2 rounded-lg border text-xs font-medium text-left transition-all ${
                    purpose === opt.id
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {purpose === 'laboral' && (
            <div className="space-y-1.5">
              <Label htmlFor="customPurpose" className="text-xs font-medium">Nombre de la Empresa o Destinatario (Opcional)</Label>
              <Input
                id="customPurpose"
                placeholder="Ej: Departamento de Gestión Humana - Empresa S.A.S."
                value={customPurpose}
                onChange={e => setCustomPurpose(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Sesiones a certificar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Sesiones a Certificar ({appointments.filter(a => a.selected).length}/{appointments.length})
              </Label>
              {appointments.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleSelectAll(!appointments.every(a => a.selected))}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  {appointments.every(a => a.selected) ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="py-6 flex justify-center text-xs text-muted-foreground gap-2 items-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando sesiones...
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                No hay sesiones previas registradas para este paciente.
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-border/60 rounded-xl p-2 bg-slate-50 dark:bg-slate-900/30">
                {appointments.map(a => (
                  <label
                    key={a.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/40 hover:bg-accent/30 text-xs cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={a.selected}
                        onCheckedChange={checked => toggleSelectOne(a.id, !!checked)}
                      />
                      <span className="font-medium">
                        {format(parseISO(a.start_time), "d 'de' MMMM, yyyy · HH:mm", { locale: es })}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {a.modality?.includes('Telepsicología') ? 'Telepsicología' : 'Presencial'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Confidencialidad y Diagnóstico */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="includeDiagnostic"
                checked={includeDiagnostic}
                onCheckedChange={checked => setIncludeDiagnostic(!!checked)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label htmlFor="includeDiagnostic" className="text-xs font-semibold cursor-pointer">
                  Incluir Diagnóstico Clínico en la Constancia
                </Label>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Por norma deontológica (Ley 1090/2006 Art. 2 Numeral 5), las constancias laborales <strong>NO deben incluir el diagnóstico</strong> salvo autorización expresa del paciente.
                </p>
              </div>
            </div>

            {includeDiagnostic && (
              <div className="pt-2">
                <Input
                  value={diagnosticText}
                  onChange={e => setDiagnosticText(e.target.value)}
                  placeholder="CIE-10 / DSM-5 y descripción diagnóstica"
                  className="text-xs h-8 bg-background"
                />
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="space-y-1.5">
            <Label htmlFor="obs" className="text-xs font-medium">Observaciones adicionales (Opcional)</Label>
            <Textarea
              id="obs"
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Ej: El paciente continúa asistiendo periódicamente según plan de intervención acordado."
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
            disabled={isGenerating || appointments.filter(a => a.selected).length === 0}
            className="gap-1.5 font-bold"
          >
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Descargar Constancia (PDF)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
