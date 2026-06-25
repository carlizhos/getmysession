import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardList, Brain, Clock, Loader2, Save } from 'lucide-react';
import { Patient, SessionNote } from '@/types';

interface PatientClinicalHistoryProps {
  patient: Patient;
  patientNotes: SessionNote[];
  onNotesSaved: () => void;
}

export function PatientClinicalHistory({
  patient,
  patientNotes,
  onNotesSaved,
}: PatientClinicalHistoryProps) {
  const { organization } = useOrganization();
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSavingGeneralNotes, setIsSavingGeneralNotes] = useState(false);

  useEffect(() => {
    setGeneralNotes(patient.notes || '');
  }, [patient.id, patient.notes]);

  const handleSaveGeneralNotes = async () => {
    if (!patient.id || !organization?.id) return;
    setIsSavingGeneralNotes(true);
    try {
      const { error } = await supabase
        .from('patient_clinical_data')
        .upsert(
          {
            patient_id: patient.id,
            organization_id: organization.id,
            notes: generalNotes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'patient_id' }
        );

      if (error) throw error;
      toast.success('Resumen clínico general actualizado.');
      onNotesSaved();
    } catch (err: any) {
      console.error('Error saving clinical notes:', err);
      toast.error('Error al guardar resumen clínico: ' + err.message);
    } finally {
      setIsSavingGeneralNotes(false);
    }
  };

  const activeDiagnoses = Array.isArray(patientNotes)
    ? patientNotes
        .filter((n) => n.cie10_code || n.diagnostico_principal)
        .reduce((acc: any[], current) => {
          const code = current.cie10_code || 'S/C';
          const desc = current.cie10_description || 'Diagnóstico principal';
          const principal = current.diagnostico_principal || '';
          const exists = acc.find(
            (item) => item.code === code && item.principal === principal
          );
          if (!exists) {
            acc.push({
              code,
              description: desc,
              principal,
              date: current.date,
              sessionNumber: current.session_number,
            });
          }
          return acc;
        }, [])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold">Historia Clínica</h3>
        <p className="text-sm text-muted-foreground">
          Información diagnóstica y resumen clínico acumulado del paciente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Resumen clínico (editable) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6 border-border/50 shadow-soft bg-white">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h4 className="font-bold text-sm uppercase tracking-wide text-primary">
                Resumen Clínico General
              </h4>
              <ClipboardList className="h-4 w-4 text-primary opacity-40" />
            </div>
            <div className="space-y-4">
              <Textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Ingresa antecedentes heredofamiliares, patológicos, evolución general, diagnóstico presuntivo o notas de seguimiento a largo plazo..."
                className="min-h-[280px] bg-white border border-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="zen"
                  disabled={isSavingGeneralNotes}
                  onClick={handleSaveGeneralNotes}
                  className="h-9 px-4 rounded-xl text-xs font-bold gap-2 shadow-sm"
                >
                  {isSavingGeneralNotes ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Diagnósticos y estadísticas */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 border-border/50 shadow-soft bg-white">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h4 className="font-bold text-sm uppercase tracking-wide text-secondary">
                Diagnósticos Registrados
              </h4>
              <Brain className="h-4 w-4 text-secondary opacity-40" />
            </div>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-zen">
              {activeDiagnoses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No hay diagnósticos CIE-10 registrados en las sesiones.
                </p>
              ) : (
                activeDiagnoses.map((diag, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/15 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5">
                        {diag.code}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Sesión {diag.sessionNumber} ({format(new Date(diag.date), 'dd/MM/yy')})
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800">{diag.description}</p>
                    {diag.principal && (
                      <p className="text-[11px] text-slate-500 mt-0.5 italic">
                        "{diag.principal}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-6 border-border/50 shadow-soft bg-white">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h4 className="font-bold text-sm uppercase tracking-wide text-slate-700">
                Resumen del Expediente
              </h4>
              <Clock className="h-4 w-4 text-slate-500 opacity-40" />
            </div>
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  Total de Consultas:
                </span>
                <span className="font-bold text-slate-800">
                  {patientNotes.length} sesiones
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  Primera Sesión:
                </span>
                <span className="font-semibold text-slate-700">
                  {patientNotes.length > 0
                    ? format(
                        new Date(patientNotes[patientNotes.length - 1].date),
                        "d 'de' MMMM, yyyy",
                        { locale: es }
                      )
                    : 'Sin registro'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  Última Sesión:
                </span>
                <span className="font-semibold text-slate-700">
                  {patientNotes.length > 0
                    ? format(
                        new Date(patientNotes[0].date),
                        "d 'de' MMMM, yyyy",
                        { locale: es }
                      )
                    : 'Sin registro'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
