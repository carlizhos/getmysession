import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileQuery, useUpdateProfileMutation } from '@/hooks/useSettingsData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  CalendarOff, 
  Plus, 
  Trash2, 
  DollarSign, 
  AlertTriangle,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
];

export default function ScheduleSettings() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfileQuery(user?.id);
  const updateProfileMutation = useUpdateProfileMutation();

  const [horario, setHorario] = useState<{
    dias: Record<number, { activo: boolean; inicio: string; fin: string; max_sesiones?: number }>;
    dias_no_laborables: string[];
  }>({
    dias: {
      1: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
      2: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
      3: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
      4: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
      5: { activo: true, inicio: '08:00', fin: '17:00', max_sesiones: 8 },
      6: { activo: false, inicio: '08:00', fin: '13:00', max_sesiones: 4 },
      0: { activo: false, inicio: '08:00', fin: '13:00', max_sesiones: 4 },
    },
    dias_no_laborables: [],
  });

  const [commissions, setCommissions] = useState({
    stripe_fee_percent: 5.14,
    porcentaje_consultorio: 30,
    reschedule_policy_hours: 24,
  });

  const [newNonWorkingDay, setNewNonWorkingDay] = useState('');

  useEffect(() => {
    if (profile) {
      setCommissions({
        stripe_fee_percent: profile.stripe_fee_percent ?? 5.14,
        porcentaje_consultorio: profile.porcentaje_consultorio ?? 30,
        reschedule_policy_hours: profile.reschedule_policy_hours ?? 24,
      });

      if (profile.horario_atencion) {
        const h = profile.horario_atencion;
        if (Array.isArray(h.dias)) {
          const newDias: Record<number, { activo: boolean; inicio: string; fin: string; max_sesiones?: number }> = {};
          [0, 1, 2, 3, 4, 5, 6].forEach(d => {
            newDias[d] = {
              activo: (h.dias as number[]).includes(d),
              inicio: (h.inicio as string) || '08:00',
              fin: (h.fin as string) || '17:00',
              max_sesiones: 8,
            };
          });
          setHorario({
            dias: newDias,
            dias_no_laborables: h.dias_no_laborables || [],
          });
        } else if (h.dias) {
          setHorario(h);
        }
      }
    }
  }, [profile]);

  const toggleDia = (d: number) => {
    setHorario((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [d]: {
          ...prev.dias[d],
          activo: !prev.dias[d].activo
        }
      }
    }));
  };

  const updateDiaHorario = (d: number, field: 'inicio' | 'fin', value: string) => {
    const current = horario.dias[d];
    const nextInicio = field === 'inicio' ? value : current.inicio;
    const nextFin = field === 'fin' ? value : current.fin;

    if (nextFin <= nextInicio) {
      toast.warning('La hora de fin debe ser posterior a la de inicio');
    }

    setHorario((prev: any) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [d]: {
          ...prev.dias[d],
          [field]: value
        }
      }
    }));
  };

  const updateMaxSesiones = (d: number, value: string) => {
    const num = parseInt(value) || 0;
    setHorario((prev: any) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [d]: {
          ...prev.dias[d],
          max_sesiones: Math.max(0, Math.min(num, 30))
        }
      }
    }));
  };

  const copiarHorarioATodos = (sourceDia: number) => {
    const { inicio, fin, max_sesiones } = horario.dias[sourceDia];
    const newDias = { ...horario.dias };
    Object.keys(newDias).forEach((k) => {
      const key = parseInt(k);
      if (newDias[key].activo) {
        newDias[key] = { ...newDias[key], inicio, fin, max_sesiones };
      }
    });
    setHorario({ ...horario, dias: newDias });
    toast.success(`Copiado ${inicio} - ${fin} (máx. ${max_sesiones ?? '∞'}) a todos los días activos`);
  };

  const addNonWorkingDay = () => {
    if (!newNonWorkingDay) return;
    if (horario.dias_no_laborables.includes(newNonWorkingDay)) {
      toast.info('Ese día ya está registrado');
      return;
    }
    setHorario(prev => ({
      ...prev,
      dias_no_laborables: [...prev.dias_no_laborables, newNonWorkingDay].sort(),
    }));
    setNewNonWorkingDay('');
  };

  const removeNonWorkingDay = (day: string) => {
    setHorario(prev => ({
      ...prev,
      dias_no_laborables: prev.dias_no_laborables.filter(d => d !== day),
    }));
  };

  const handleSaveHorarios = async () => {
    if (!user) return;
    
    // Validation
    const invalidDays = Object.entries(horario.dias).filter(([_, config]) => {
      return config.activo && config.fin <= config.inicio;
    });

    if (invalidDays.length > 0) {
      toast.error('Uno o más días tienen un horario inválido (Fin debe ser mayor a Inicio)');
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        data: {
          horario_atencion: horario,
          porcentaje_consultorio: commissions.porcentaje_consultorio,
          stripe_fee_percent: commissions.stripe_fee_percent,
          reschedule_policy_hours: commissions.reschedule_policy_hours,
        }
      });
      toast.success('Ajustes guardados');
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Top Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-2xs">
        <div>
          <h2 className="text-base font-bold tracking-tight">Horarios y Disponibilidad</h2>
          <p className="text-xs text-muted-foreground">Configura tus días de atención, horarios por día, días no laborables y comisiones.</p>
        </div>
        <Button 
          type="button" 
          variant="zen" 
          disabled={updateProfileMutation.isLoading} 
          className="gap-2 shadow-xs font-bold px-6 shrink-0" 
          onClick={handleSaveHorarios}
        >
          {updateProfileMutation.isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
          ) : (
            <><Check className="h-4 w-4 stroke-[3]" /> Guardar Horarios</>
          )}
        </Button>
      </div>

      {/* Horarios */}
      <Card variant="flat" className="border border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Horario de Atención</CardTitle>
                <CardDescription>Define tus días y horas de trabajo</CardDescription>
              </div>
            </div>
            <Button 
              type="button" 
              variant="zen" 
              size="sm"
              disabled={updateProfileMutation.isLoading} 
              className="gap-1.5 font-bold px-4 hidden sm:flex" 
              onClick={handleSaveHorarios}
            >
              {updateProfileMutation.isLoading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...</>
              ) : (
                <><Check className="h-3.5 w-3.5 stroke-[3]" /> Guardar</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Días y Horas de Atención</Label>
            </div>
            
            <div className="space-y-3">
              {DIAS_SEMANA.map((d) => {
                const config = horario.dias?.[d.value] || { activo: false, inicio: '08:00', fin: '17:00' };
                const isInvalid = config.activo && config.fin <= config.inicio;
                
                return (
                  <div key={d.value} className={cn(
                    "flex flex-wrap items-center gap-4 p-3 rounded-lg border transition-all relative",
                    config.activo 
                      ? (isInvalid ? "bg-red-50 border-red-500" : "bg-primary/5 border-primary/20") 
                      : "bg-muted/10 border-transparent opacity-60"
                  )}>
                    <div className="w-20 shrink-0">
                      <p className={cn(
                        "font-medium text-sm",
                        isInvalid && "text-red-700"
                      )}>{d.label}</p>
                    </div>

                    <div className="flex items-center shrink-0">
                      <Switch
                        checked={config.activo}
                        onCheckedChange={() => toggleDia(d.value)}
                      />
                    </div>

                    {config.activo ? (
                      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Desde</span>
                          <Input
                            type="time"
                            value={config.inicio}
                            onChange={(e) => updateDiaHorario(d.value, 'inicio', e.target.value)}
                            className="h-9 py-1 px-2 border-none bg-background shadow-none focus-visible:ring-1"
                            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Hasta</span>
                          <Input
                            type="time"
                            value={config.fin}
                            onChange={(e) => updateDiaHorario(d.value, 'fin', e.target.value)}
                            className="h-9 py-1 px-2 border-none bg-background shadow-none focus-visible:ring-1"
                            onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0 border-l border-border/40 pl-3 ml-1" title="Máximo de sesiones por día">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Máx. sesiones</span>
                          <div className="flex items-center gap-1 bg-muted/20 rounded-lg p-0.5 border border-border/40">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary rounded-md"
                              onClick={() => updateMaxSesiones(d.value, String((config.max_sesiones || 0) - 1))}
                              disabled={(config.max_sesiones || 0) <= 0}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={0}
                              max={30}
                              value={config.max_sesiones ?? ''}
                              onChange={(e) => updateMaxSesiones(d.value, e.target.value)}
                              placeholder="∞"
                              className="h-7 w-10 p-0 text-center border-none bg-transparent shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-sm font-medium"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary rounded-md"
                              onClick={() => updateMaxSesiones(d.value, String((config.max_sesiones || 0) + 1))}
                              disabled={(config.max_sesiones || 0) >= 30}
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Copiar este horario a todos los días activos"
                          onClick={() => copiarHorarioATodos(d.value)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 text-xs text-muted-foreground italic">
                        Cerrado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Días no laborables */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <CalendarOff className="h-4 w-4 text-muted-foreground" />
              <Label>Días No Laborables</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Estos días aparecerán bloqueados en la agenda y no podrán agendarse citas.
            </p>

            <div className="flex gap-2">
              <Input
                type="date"
                value={newNonWorkingDay}
                onChange={(e) => setNewNonWorkingDay(e.target.value)}
                onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                className="max-w-[200px]"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNonWorkingDay}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </Button>
            </div>

            {horario.dias_no_laborables.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {horario.dias_no_laborables.map((day) => {
                  const [year, month, dayNum] = day.split('-');
                  const formatted = `${dayNum}/${month}/${year}`;
                  return (
                    <div
                      key={day}
                      className="flex items-center gap-1.5 bg-destructive/10 text-destructive text-xs px-2.5 py-1 rounded-full border border-destructive/20"
                    >
                      <CalendarOff className="h-3 w-3" />
                      {formatted}
                      <button
                        onClick={() => removeNonWorkingDay(day)}
                        className="hover:opacity-70 transition-opacity ml-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {horario.dias_no_laborables.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Sin días no laborables registrados.</p>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button 
              type="button" 
              variant="zen" 
              disabled={updateProfileMutation.isLoading} 
              className="gap-2 font-bold px-6" 
              onClick={handleSaveHorarios}
            >
              {updateProfileMutation.isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                <><Check className="h-4 w-4 stroke-[3]" /> Guardar Horarios</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comisiones */}
      <Card variant="flat" className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <div>
              <CardTitle className="text-base">Comisiones</CardTitle>
              <CardDescription>Configura el reparto entre consultorio y tus honorarios netos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="stripe_fee">
              Comisión Stripe (%)
              <span className="ml-2 text-xs text-muted-foreground font-normal">— según tu plan</span>
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="stripe_fee"
                type="number"
                min={0}
                max={10}
                step={0.01}
                value={commissions.stripe_fee_percent}
                onChange={(e) => setCommissions({ ...commissions, stripe_fee_percent: parseFloat(e.target.value) || 0 })}
                className="max-w-[120px]"
                disabled={updateProfileMutation.isLoading}
              />
              <span className="text-xs text-muted-foreground">Último cobro fue ≈ 5.14%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pct_consultorio">
              % que retiene el consultorio
              <span className="ml-2 text-xs text-muted-foreground font-normal">— el resto es tuyo</span>
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="pct_consultorio"
                type="number"
                min={0}
                max={100}
                step={1}
                value={commissions.porcentaje_consultorio}
                onChange={(e) => setCommissions({ ...commissions, porcentaje_consultorio: parseFloat(e.target.value) || 0 })}
                className="max-w-[120px]"
                disabled={updateProfileMutation.isLoading}
              />
              <span className="text-sm text-muted-foreground">
                Tú recibes: <strong>{(100 - commissions.porcentaje_consultorio).toFixed(0)}%</strong>
              </span>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Vista previa — sesión de $900 MXN</p>
            {(() => {
              const bruto = 900;
              const fee = bruto * (commissions.stripe_fee_percent / 100);
              const neto = bruto - fee;
              const consultorio = neto * (commissions.porcentaje_consultorio / 100);
              const psicologo = neto - consultorio;
              return (<>
                <div className="flex justify-between"><span className="text-muted-foreground">Cobrado al paciente</span><span>${bruto.toFixed(2)}</span></div>
                <div className="flex justify-between text-destructive"><span>− Fees Stripe ({commissions.stripe_fee_percent}%)</span><span>−${fee.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold border-t pt-2"><span>Neto</span><span>${neto.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Consultorio ({commissions.porcentaje_consultorio}%)</span><span>−${consultorio.toFixed(2)}</span></div>
                <div className="flex justify-between text-success font-bold text-base border-t pt-2"><span>Ingreso Neto del Psicólogo</span><span>${psicologo.toFixed(2)} MXN</span></div>
              </>);
            })()}
          </div>

          <div className="flex justify-end">
            <Button 
              type="button" 
              variant="zen" 
              disabled={updateProfileMutation.isLoading} 
              className="gap-2" 
              onClick={handleSaveHorarios}
            >
              {updateProfileMutation.isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Políticas de Cancelación */}
      <Card variant="flat" className="border border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">Políticas de Cancelación</CardTitle>
              <CardDescription>Configura las reglas de reprogramación y cancelación de citas para tus pacientes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reschedule_policy">
              Límite de tiempo global (Horas)
              <span className="ml-2 text-xs text-muted-foreground font-normal">— ventana mínima requerida antes de la sesión</span>
            </Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Input
                id="reschedule_policy"
                type="number"
                min={0}
                step={1}
                value={commissions.reschedule_policy_hours}
                onChange={(e) => setCommissions({ ...commissions, reschedule_policy_hours: parseInt(e.target.value) || 0 })}
                className="max-w-[120px]"
                disabled={updateProfileMutation.isLoading}
              />
              <span className="text-sm text-muted-foreground">
                Los pacientes podrán reprogramar o cancelar de forma autónoma hasta <strong>{commissions.reschedule_policy_hours} horas</strong> antes de la sesión.
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="button" 
              variant="zen" 
              disabled={updateProfileMutation.isLoading} 
              className="gap-2" 
              onClick={handleSaveHorarios}
            >
              {updateProfileMutation.isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
