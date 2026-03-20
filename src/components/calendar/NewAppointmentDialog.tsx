import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO, startOfDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Video, Loader2, XCircle } from 'lucide-react';

const APPOINTMENT_COLORS = [
    { value: 'violet', label: 'Morado', bg: 'bg-violet-500', ring: 'ring-violet-400' },
    { value: 'blue', label: 'Azul', bg: 'bg-blue-500', ring: 'ring-blue-400' },
    { value: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-400' },
    { value: 'green', label: 'Verde', bg: 'bg-green-500', ring: 'ring-green-400' },
    { value: 'yellow', label: 'Amarillo', bg: 'bg-yellow-400', ring: 'ring-yellow-300' },
    { value: 'orange', label: 'Naranja', bg: 'bg-orange-500', ring: 'ring-orange-400' },
    { value: 'rose', label: 'Rosa', bg: 'bg-rose-500', ring: 'ring-rose-400' },
    { value: 'slate', label: 'Gris', bg: 'bg-slate-500', ring: 'ring-slate-400' },
    { value: 'teal', label: 'Teal', bg: 'bg-teal-500', ring: 'ring-teal-400' },
];

import { cn } from '@/lib/utils';
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import ClockPicker from '@/components/ui/ClockPicker';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';



interface EditingAppointment {
    id: string;
    patientId?: string;
    patientName: string;
    startTime: string;
    endTime: string;
    type?: string;
    fee?: number;
    meetingLink?: string;
    meetingPlatform?: string;
    notes?: string;
    status?: string;
    color?: string;
}

interface NewAppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate?: Date;
    onAppointmentAdded?: () => void;
    editingAppointment?: EditingAppointment | null;
}

const NewAppointmentDialog = ({
    open,
    onOpenChange,
    selectedDate,
    onAppointmentAdded,
    editingAppointment,
}: NewAppointmentDialogProps) => {
    const { user } = useAuth();
    const isEditing = !!editingAppointment;
    const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);

    // Schedule config loaded from profile
    const [horarioConfig, setHorarioConfig] = useState({
        inicio: '08:00',
        fin: '17:00',
        dias: [1, 2, 3, 4, 5] as number[],
        dias_no_laborables: [] as string[],
    });

    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('horario_atencion')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.horario_atencion) {
                    const h = data.horario_atencion;
                    setHorarioConfig({
                        inicio: h.inicio || '08:00',
                        fin: h.fin || '17:00',
                        dias: Array.isArray(h.dias) ? h.dias : [1, 2, 3, 4, 5],
                        dias_no_laborables: Array.isArray(h.dias_no_laborables) ? h.dias_no_laborables : [],
                    });
                    // Snap default startTime to configured start hour if not editing
                    setFormData(prev => ({
                        ...prev,
                        startTime: h.inicio || '08:00',
                    }));
                }
            });
    }, [user]);

    // Returns a warning message if the given date is blocked
    const getDateWarning = (d: Date | undefined): string | null => {
        if (!d) return null;
        const isoDate = format(d, 'yyyy-MM-dd');
        if (horarioConfig.dias_no_laborables.includes(isoDate)) return 'Este día está marcado como festivo o no laborable.';
        const weekday = d.getDay(); // 0=Sun
        if (!horarioConfig.dias.includes(weekday)) return 'Este día no es un día de atención configurado.';
        return null;
    };
    const [formData, setFormData] = useState({
        patientId: '',
        patientName: '',
        type: '',
        status: 'scheduled',
        color: 'violet',
        startTime: '09:00',
        fee: '',
        meetingLink: '',
        meetingPlatform: '',
        notes: '',
    });

    // Sincronizar fecha cuando cambia selectedDate
    useEffect(() => {
        if (selectedDate && !isEditing) setDate(selectedDate);
    }, [selectedDate, isEditing]);

    // Pre-llenar formulario al editar
    useEffect(() => {
        if (editingAppointment) {
            const start = parseISO(editingAppointment.startTime);
            setDate(start);
            setFormData({
                patientId: editingAppointment.patientId || '',
                patientName: editingAppointment.patientName || '',
                type: editingAppointment.type || '',
                status: editingAppointment.status || 'scheduled',
                color: editingAppointment.color || 'violet',
                startTime: (() => {
                    const m = parseInt(format(start, 'mm'));
                    const snapped = Math.round(m / 5) * 5;
                    const mm = String(Math.min(snapped, 55)).padStart(2, '0');
                    return `${format(start, 'HH')}:${mm}`;
                })(),
                fee: editingAppointment.fee != null ? String(editingAppointment.fee) : '',
                meetingLink: editingAppointment.meetingLink || '',
                meetingPlatform: editingAppointment.meetingPlatform || '',
                notes: editingAppointment.notes || '',
            });
        } else {
            resetForm();
        }
        setConfirmCancel(false);
    }, [editingAppointment, open]);

    const resetForm = () => {
        setFormData({
            patientId: '',
            patientName: '',
            type: '',
            status: 'scheduled',
            color: 'violet',
            startTime: '09:00',
            fee: '',
            meetingLink: '',
            meetingPlatform: '',
            notes: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.patientName) {
            toast.error('Por favor selecciona un paciente');
            return;
        }
        if (!formData.startTime) {
            toast.error('Por favor ingresa la hora de inicio');
            return;
        }
        if (!date) {
            toast.error('Por favor selecciona una fecha');
            return;
        }

        setIsSubmitting(true);

        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const startDateTime = new Date(`${dateStr}T${formData.startTime}:00`);

            // Validar que no sea fecha/hora en el pasado
            if (isBefore(startDateTime, new Date())) {
                toast.error('No puedes agendar una cita en el pasado');
                setIsSubmitting(false);
                return;
            }

            // Duración fija: 1 hora
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                patient_id: formData.patientId || null,
                patient_name: formData.patientName,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                type: formData.type || 'individual',
                fee: formData.fee ? parseFloat(formData.fee) : 0,
                meeting_link: formData.meetingLink || null,
                meeting_platform: formData.meetingPlatform || null,
                notes: formData.notes || null,
                color: formData.color || 'violet',
                user_id: user?.id ?? null,
            };

            if (isEditing && editingAppointment) {
                const { error } = await supabase
                    .from('appointments')
                    .update({ ...payload, status: formData.status })
                    .eq('id', editingAppointment.id);
                if (error) throw error;
                toast.success('Cita actualizada');
            } else {
                const { error } = await supabase.from('appointments').insert([{
                    ...payload,
                    status: formData.status || 'scheduled',
                    payment_status: 'pending',
                }]);
                if (error) throw error;
                toast.success(`Cita con ${formData.patientName} agendada correctamente`);

                // Send email notifications (non-blocking): psychologist + patient confirmation
                const { data: { session } } = await supabase.auth.getSession();
                supabase.functions.invoke('notify-appointment', {
                    headers: {
                        Authorization: `Bearer ${session?.access_token}`
                    },
                    body: {
                        patientId: formData.patientId || null,
                        patientName: formData.patientName,
                        startTime: startDateTime.toISOString(),
                        endTime: endDateTime.toISOString(),
                        sessionType: formData.type || 'individual',
                        fee: formData.fee || 0,
                        meetingLink: formData.meetingLink || null,
                        meetingPlatform: formData.meetingPlatform || null,
                        notes: formData.notes || null,
                    },
                }).catch((err: any) => {
                    console.warn('Email de notificación no enviado:', err.message);
                });
            }

            resetForm();
            onOpenChange(false);
            if (onAppointmentAdded) onAppointmentAdded();

        } catch (error: any) {
            console.error('Error al guardar cita:', error);
            toast.error('Error al guardar la cita: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelAppointment = async () => {
        if (!editingAppointment) return;
        setIsCancelling(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', editingAppointment.id);
            if (error) throw error;
            toast.success('Cita cancelada');
            onOpenChange(false);
            if (onAppointmentAdded) onAppointmentAdded();
        } catch (err: any) {
            toast.error('Error al cancelar: ' + err.message);
        } finally {
            setIsCancelling(false);
            setConfirmCancel(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setConfirmCancel(false); }}>
            <DialogContent className="sm:max-w-[600px] h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Modifica los datos de la cita o cancélala'
                                : 'Agenda una nueva sesión con un paciente'}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {/* Fecha */}
                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !date && 'text-muted-foreground'
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, 'PPP', { locale: es }) : 'Selecciona una fecha'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        locale={es}
                                        initialFocus
                                        disabled={(d) => {
                                            const now = new Date();
                                            if (isBefore(startOfDay(d), startOfDay(now))) return true;
                                            if (format(d, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
                                                const [finH, finM] = horarioConfig.fin.split(':').map(Number);
                                                if (now.getHours() > finH || (now.getHours() === finH && now.getMinutes() >= finM)) return true;
                                            }
                                            return false;
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Paciente */}
                        <div className="space-y-2">
                            <Label htmlFor="patient">Paciente *</Label>
                            <PatientAutocomplete
                                value={formData.patientId}
                                onSelect={(patientId, patientName) => {
                                    setFormData({ ...formData, patientId, patientName });
                                }}
                                placeholder={formData.patientName || 'Buscar paciente por nombre o email...'}
                            />
                        </div>

                        {/* Estado de la cita */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Estado de la cita</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona el estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
                                            Agendada
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="confirmed">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                                            Confirmada
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="pending">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />
                                            En espera
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="completed">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />
                                            Completada
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="cancelled">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                                            Cancelada
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Color de la cita */}
                        <div className="space-y-2">
                            <Label>Color de la cita</Label>
                            <div className="flex flex-wrap gap-2">
                                {APPOINTMENT_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        title={c.label}
                                        onClick={() => setFormData({ ...formData, color: c.value })}
                                        className={cn(
                                            'h-7 w-7 rounded-full transition-all',
                                            c.bg,
                                            formData.color === c.value
                                                ? `ring-2 ring-offset-2 ${c.ring} scale-110`
                                                : 'opacity-70 hover:opacity-100 hover:scale-105'
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Tipo de sesión */}
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de Sesión</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona el tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="individual">Sesión Individual</SelectItem>
                                    <SelectItem value="couple">Terapia de Pareja</SelectItem>
                                    <SelectItem value="group">Sesión Grupal</SelectItem>
                                    <SelectItem value="initial">Consulta Inicial</SelectItem>
                                    <SelectItem value="follow_up">Seguimiento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Horario */}
                        <div className="space-y-2">
                            <Label>Hora de inicio *</Label>
                            <div className="flex items-center gap-2">
                                <ClockPicker
                                    value={formData.startTime}
                                    onChange={(v) => setFormData({ ...formData, startTime: v })}
                                    disabled={isSubmitting}
                                    minTime={horarioConfig.inicio}
                                    maxTime={horarioConfig.fin}
                                />
                                <span className="text-sm text-muted-foreground">— Duración: 1 hora</span>
                            </div>
                        </div>

                        {/* Tarifa */}
                        <div className="space-y-2">
                            <Label htmlFor="fee">Tarifa ($)</Label>
                            <Input
                                id="fee"
                                type="number"
                                placeholder="80"
                                value={formData.fee}
                                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Plataforma de videollamada */}
                        <div className="space-y-2">
                            <Label htmlFor="platform">Plataforma de Videollamada (Opcional)</Label>
                            <Select
                                value={formData.meetingPlatform}
                                onValueChange={(value) => setFormData({ ...formData, meetingPlatform: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona la plataforma" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                                    <SelectItem value="meet">Google Meet</SelectItem>
                                    <SelectItem value="zoom">Zoom</SelectItem>
                                    <SelectItem value="other">Otra</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Link de videollamada */}
                        <div className="space-y-2">
                            <Label htmlFor="meetingLink">Link de Videollamada (Opcional)</Label>
                            <div className="relative">
                                <Video className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="meetingLink"
                                    type="url"
                                    placeholder="https://teams.microsoft.com/... o https://meet.google.com/..."
                                    className="pl-9"
                                    value={formData.meetingLink}
                                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Puedes agregar el link después de crear la reunión en Teams o Meet
                            </p>
                        </div>

                        {/* Notas */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (Opcional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Notas adicionales sobre la cita..."
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t bg-background">
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            {/* Cancelar cita (solo en modo edición) */}
                            {isEditing && editingAppointment?.status !== 'cancelled' && (
                                confirmCancel ? (
                                    <div className="flex items-center gap-2 mr-auto">
                                        <span className="text-sm text-muted-foreground">¿Confirmar cancelación?</span>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleCancelAppointment}
                                            disabled={isCancelling}
                                        >
                                            {isCancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sí, cancelar'}
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                                            No
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="mr-auto gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                                        onClick={() => setConfirmCancel(true)}
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Cancelar cita
                                    </Button>
                                )
                            )}
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                {isEditing ? 'Cerrar' : 'Cancelar'}
                            </Button>
                            <Button type="submit" variant="zen" disabled={isSubmitting}>
                                {isSubmitting
                                    ? (isEditing ? 'Guardando...' : 'Creando...')
                                    : (isEditing ? 'Guardar cambios' : 'Crear Cita')}
                            </Button>
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewAppointmentDialog;
