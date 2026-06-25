import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileQuery, useUpdateProfileMutation } from '@/hooks/useSettingsData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Bell, Clock, Loader2, Mail, MessageSquare, ShieldCheck } from 'lucide-react';
import MFASetup from '@/components/auth/MFASetup';
import { toast } from 'sonner';

export default function SecuritySettings() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfileQuery(user?.id);
  const updateProfileMutation = useUpdateProfileMutation();

  const [notif, setNotif] = useState({
    psicologo_email: true,
    psicologo_whatsapp: false,
    paciente_email: true,
    paciente_whatsapp: false,
    recordatorio_24h_email: true,
    recordatorio_24h_whatsapp: false,
    recordatorio_horas: 24,
  });

  useEffect(() => {
    if (profile?.notification_settings) {
      setNotif({
        psicologo_email: profile.notification_settings.psicologo_email ?? true,
        psicologo_whatsapp: profile.notification_settings.psicologo_whatsapp ?? false,
        paciente_email: profile.notification_settings.paciente_email ?? true,
        paciente_whatsapp: profile.notification_settings.paciente_whatsapp ?? false,
        recordatorio_24h_email: profile.notification_settings.recordatorio_24h_email ?? true,
        recordatorio_24h_whatsapp: profile.notification_settings.recordatorio_24h_whatsapp ?? false,
        recordatorio_horas: profile.notification_settings.recordatorio_horas ?? 24,
      });
    }
  }, [profile]);

  const handleSaveNotif = async () => {
    if (!user) return;
    try {
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        data: {
          notification_settings: notif,
        },
      });
      toast.success('Notificaciones guardadas');
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notificaciones */}
      <Card variant="flat" className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Canales de Notificación</CardTitle>
              <CardDescription>Define cómo quieres recibir recordatorios de citas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Ajustes Generales</p>
            <p className="text-xs text-muted-foreground">Configura cómo recibes avisos de tus citas.</p>
          </div>

          {/* Psicólogo */}
          <div className="space-y-3 border-t border-border pt-5">
            <p className="text-sm font-semibold text-foreground">Mis notificaciones (Psicólogo)</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Correo electrónico</p>
                    <p className="text-xs text-muted-foreground">Recibe recordatorios a tu correo</p>
                  </div>
                </div>
                <Switch
                  id="psic_email"
                  checked={notif.psicologo_email}
                  onCheckedChange={(v) => setNotif({ ...notif, psicologo_email: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Mensajes de WhatsApp <span className="text-success font-medium">— Habilitado</span></p>
                  </div>
                </div>
                <Switch
                  id="psic_wa"
                  checked={notif.psicologo_whatsapp}
                  onCheckedChange={(v) => setNotif({ ...notif, psicologo_whatsapp: v })}
                />
              </div>
            </div>
          </div>

          {/* Pacientes */}
          <div className="space-y-3 border-t border-border pt-5">
            <p className="text-sm font-semibold text-foreground">Notificaciones de pacientes</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Correo electrónico al paciente</p>
                    <p className="text-xs text-muted-foreground">Envía recordatorios a los pacientes por correo</p>
                  </div>
                </div>
                <Switch
                  id="pac_email"
                  checked={notif.paciente_email}
                  onCheckedChange={(v) => setNotif({ ...notif, paciente_email: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">WhatsApp al paciente</p>
                    <p className="text-xs text-muted-foreground">Mensajes de WhatsApp <span className="text-success font-medium">— Habilitado</span></p>
                  </div>
                </div>
                <Switch
                  id="pac_wa"
                  checked={notif.paciente_whatsapp}
                  onCheckedChange={(v) => setNotif({ ...notif, paciente_whatsapp: v })}
                />
              </div>
            </div>
          </div>

          {/* Recordatorios Automáticos */}
          <div className="space-y-3 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Recordatorios Automáticos</p>
                <p className="text-xs text-muted-foreground">Configura notificaciones automáticas antes de la cita para reducir inasistencias.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 bg-muted/5">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Anticipación del recordatorio</p>
                    <p className="text-xs text-muted-foreground">Define cuántas horas antes de la cita se enviará el aviso</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    step={1}
                    value={notif.recordatorio_horas ?? 24}
                    onChange={(e) => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val)) val = 24;
                      if (val > 24) val = 24;
                      if (val < 1) val = 1;
                      setNotif({ ...notif, recordatorio_horas: val });
                    }}
                    className="w-20 text-center bg-background font-bold text-primary"
                  />
                  <span className="text-sm font-medium text-muted-foreground">hrs antes</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Recordatorio por Correo</p>
                    <p className="text-xs text-muted-foreground">Envía un email automático de aviso al paciente.</p>
                  </div>
                </div>
                <Switch
                  id="rec_email"
                  checked={notif.recordatorio_24h_email}
                  onCheckedChange={(v) => setNotif({ ...notif, recordatorio_24h_email: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Recordatorio por WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Envía un mensaje automático de WhatsApp al paciente <span className="text-success font-medium">— Habilitado</span></p>
                  </div>
                </div>
                <Switch
                  id="rec_wa"
                  checked={notif.recordatorio_24h_whatsapp}
                  onCheckedChange={(v) => setNotif({ ...notif, recordatorio_24h_whatsapp: v })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="zen"
              disabled={updateProfileMutation.isLoading}
              className="gap-2"
              onClick={handleSaveNotif}
            >
              {updateProfileMutation.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                'Guardar notificaciones'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MFA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Seguridad — Autenticación en dos pasos
          </h2>
        </div>
        <MFASetup />
      </div>
    </div>
  );
}
