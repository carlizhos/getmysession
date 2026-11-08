import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Archive, Download, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { exportClinicalArchiveZip, BackupResult } from '@/lib/clinicalArchiveBackup';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const ClinicalArchiveBackupCard: React.FC = () => {
  const { organization } = useOrganization();
  const { user } = useAuth();

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('');
  const [lastBackup, setLastBackup] = useState<BackupResult | null>(null);

  const handleStartBackup = async () => {
    if (!organization?.id) {
      toast.error('No se encontró la organización activa.');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setCurrentStatus('Iniciando recopilación de expedientes...');

    try {
      const result = await exportClinicalArchiveZip(
        organization.id,
        user,
        (current, total, patientName) => {
          const pct = Math.round((current / total) * 100);
          setProgress(pct);
          setCurrentStatus(`Exportando expediente ${current} de ${total}: ${patientName}`);
        }
      );

      setLastBackup(result);
      toast.success(
        `Archivo clínico generado con éxito: ${result.totalPatients} pacientes (${result.totalNotes} notas).`,
        { icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> }
      );
    } catch (err: any) {
      console.error('Error al exportar archivo clínico:', err);
      toast.error('Error al generar copia de seguridad: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsExporting(false);
      setProgress(100);
    }
  };

  return (
    <Card variant="flat" className="border border-border/80 shadow-soft bg-gradient-to-br from-card via-card to-purple-500/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Custodia y Archivo Clínico Legal
                <Badge variant="outline" className="bg-purple-100/70 text-purple-800 border-purple-200 text-[10px] font-bold">
                  Res. 839 de 2017 (15 Años)
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Genera una copia de seguridad masiva e inmutable en formato ZIP con todas las historias clínicas oficiales en PDF.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Marco Legal */}
        <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
            <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
            Cumplimiento Normativo MinSalud de Colombia
          </p>
          <p className="text-[11px] leading-relaxed text-purple-800/90 dark:text-purple-300/90">
            La <strong>Resolución 839 de 2017</strong> y la <strong>Resolución 1995 de 1999</strong> exigen que todo psicólogo o prestador de salud conserve las historias clínicas por un término mínimo de <strong>15 años</strong> (5 años en archivo de gestión y 10 en archivo central). Este archivo comprimido incluye:
          </p>
          <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-purple-800/80 dark:text-purple-300/80">
            <li>Un archivo PDF formal e individual por cada paciente con sus evoluciones clínicas, diagnósticos (DSM-5 y CIE-10) y consentimientos firmados.</li>
            <li>El <strong>Acta e Índice Oficial de Custodia (txt)</strong> con folios, código REPS, ReTHUS y fecha exacta de auditoría.</li>
          </ul>
        </div>

        {/* Barra de Progreso durante Exportación */}
        {isExporting && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary truncate max-w-md">{currentStatus}</span>
              <span className="font-mono font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Último Resumen */}
        {lastBackup && !isExporting && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                Última exportación completada: {lastBackup.fileName}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {lastBackup.totalPatients} pacientes · {lastBackup.totalNotes} notas
            </span>
          </div>
        )}

        {/* Botón de Acción */}
        <div className="flex justify-between items-center pt-2">
          <p className="text-[11px] text-muted-foreground">
            🔒 Acción auditada y registrada en el registro de seguridad de la organización.
          </p>

          <Button
            type="button"
            variant="zen"
            onClick={handleStartBackup}
            disabled={isExporting}
            className="gap-2 font-bold shadow-sm"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generando Copia Legal...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Descargar Archivo Clínico (ZIP)</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicalArchiveBackupCard;
