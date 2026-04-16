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
import { CalendarIcon, Video, Loader2, XCircle, MapPin, Repeat, CreditCard } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

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
import { useOrganization } from '@/hooks/useOrganization';
import { AlertTriangle } from 'lucide-react';
import { logActivity } from '@/lib/activityLogger';



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
    modality?: 'presencial' | 'online';
    isRecurring?: boolean;
    recurrenceId?: string;
    paymentStatus?: string;
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
    const { organization } = useOrganization();
    const isEditing = !!editingAppointment;
    const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);

    const [specialistName, setSpecialistName] = useState('');
    
    // Schedule config loaded from profile
    const [horarioConfig, setHorarioConfig] = useState<any>({
        dias: {},
        dias_no_laborables: [],
    });

    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('horario_atencion, full_name')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.full_name) setSpecialistName(data.full_name);
                if (data?.horario_atencion) {
                    const h = data.horario_atencion;
                    let normalized: any;

                    if (Array.isArray(h.dias)) {
                        const newDias: any = {};
                        [0, 1, 2, 3, 4, 5, 6].forEach(d => {
                            newDias[d] = {
                                activo: h.dias.includes(d),
                                inicio: h.inicio || '08:00',
                                fin: h.fin || '17:00'
                            };
                        });
                        normalized = {
                            dias: newDias,
                            dias_no_laborables: h.dias_no_laborables || [],
                        };
                    } else {
                        normalized = h;
                    }

                    setHorarioConfig(normalized);

                    // Snap default startTime to configured start hour of the selected date (if not editing)
                    if (!isEditing) {
                        const weekday = (selectedDate || new Date()).getDay();
                        const config = normalized.dias?.[weekday] || { inicio: '08:00' };
                        setFormData(prev => ({
                            ...prev,
                            startTime: config.inicio || '08:00',
                        }));
                    }
                }
            });
    }, [user, isEditing]);

    // Returns a warning message if the given date is blocked
    const getDateWarning = (d: Date | undefined): string | null => {
        if (!d) return null;
        const isoDate = format(d, 'yyyy-MM-dd');
        if (horarioConfig.dias_no_laborables.includes(isoDate)) return 'Este día está marcado como no laborable.';
        const weekday = d.getDay();
        if (!horarioConfig.dias?.[weekday]?.activo) return 'Este día no es un día de atención configurado.';
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
        modality: 'presencial' as 'presencial' | 'online',
        isRecurring: false,
        recurrenceWeeks: 8,
        editSeries: false,
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
                modality: editingAppointment.modality || 'presencial',
                isRecurring: editingAppointment.isRecurring || false,
                recurrenceWeeks: 8,
                editSeries: false,
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
            modality: 'presencial',
            isRecurring: false,
            recurrenceWeeks: 8,
            editSeries: false,
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

            // 1. Validar días laborables y festivos
            const weekday = date.getDay();
            const config = horarioConfig.dias?.[weekday];
            
            if (!config?.activo) {
                toast.error('Este día no es un día de atención configurado.');
                setIsSubmitting(false);
                return;
            }
            if (horarioConfig.dias_no_laborables.includes(dateStr)) {
                toast.error('Este día está marcado como no laborable.');
                setIsSubmitting(false);
                return;
            }

            // Validar horas del día específico
            const [hMin, mMin] = config.inicio.split(':').map(Number);
            const [hMax, mMax] = config.fin.split(':').map(Number);
            const [hSel, mSel] = formData.startTime.split(':').map(Number);
            
            if (hSel < hMin || (hSel === hMin && mSel < mMin) || hSel > hMax || (hSel === hMax && mSel > mMax)) {
                toast.error(`La hora seleccionada está fuera del horario de este día (${config.inicio} - ${config.fin})`);
                setIsSubmitting(false);
                return;
            }

            // 2. Validar que no sea fecha/hora en el pasado (solo para citas nuevas o si se cambió la fecha)
            const now = new Date();
            if (!isEditing && isBefore(startDateTime, now)) {
                toast.error('No puedes agendar una cita en el pasado');
                setIsSubmitting(false);
                return;
            }

            // Duración fija: 1 hora
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

            const { data: { user: sessionUser } } = await supabase.auth.getUser();

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
                user_id: sessionUser?.id ?? null,
                organization_id: organization?.id,
                modality: formData.modality,
                is_recurring: formData.isRecurring,
                recurrence_id: isEditing ? editingAppointment?.recurrenceId : (formData.isRecurring ? crypto.randomUUID() : null),
            };

            let finalMeetingLink = formData.meetingLink;

            // --- Google Calendar Sync (for Create and Edit) ---
            const isMeetSelected = formData.meetingPlatform === 'meet';
            const wasMeetSelected = isEditing && editingAppointment?.meetingPlatform === 'meet';
            
            // Logic: 
            // 1. If was Meet and now it's NOT Meet -> Clear link
            // 2. If it is Meet and (didn't have link OR was not Meet before) -> Generate link
            let shouldSync = false;

            if (isEditing && wasMeetSelected && !isMeetSelected) {
                finalMeetingLink = '';
            } else if (isMeetSelected && (!finalMeetingLink || !wasMeetSelected)) {
                shouldSync = true;
            }

            console.log('[MeetSync] shouldSync:', shouldSync, 'platform:', formData.meetingPlatform, 'linkExists:', !!finalMeetingLink);

            if (shouldSync) {
                try {
                    console.log('[MeetSync] Invoking google-calendar-sync for user:', sessionUser?.id);
                    const { data, error: syncErr } = await supabase.functions.invoke('google-calendar-sync', {
                        body: {
                            userId: sessionUser?.id,
                            createMeet: true,
                            event: {
                                summary: `Cita Saudade: ${formData.patientName}`,
                                description: `Tipo: ${formData.type}\nNotas: ${formData.notes || 'Ninguna'}`,
                                start: { dateTime: startDateTime.toISOString() },
                                end: { dateTime: endDateTime.toISOString() },
                            }
                        }
                    });

                    if (syncErr) {
                        console.error('[MeetSync] Network/Invoke Error:', syncErr);
                        toast.warning('No se pudo sincronizar con Google Calendar. La cita se guardará sin link actualizado.');
                    } else if (data?.error || data?.success === false) {
                        console.warn('[MeetSync] API Error:', data.error || data.googleApiError);
                        toast.warning('No se pudo generar el link de Google Meet. Verifica tu conexión con Google en Configuración.');
                    } else if (data?.meetLink) {
                        console.log('[MeetSync] Success! Link generated:', data.meetLink);
                        finalMeetingLink = data.meetLink;
                    } else if (data?.message === 'Google Calendar not connected') {
                        console.warn('[MeetSync] Not connected');
                        toast.warning('Google Calendar no está conectado. Conéctalo en Configuración para generar links.');
                    }
                } catch (err) {
                    console.error('[MeetSync] Unexpected Exception:', err);
                }
            }

            if (isEditing && editingAppointment) {
                let finalNotes = formData.notes;
                // Add cancellation audit if status changed to cancelled
                if (formData.status === 'cancelled' && editingAppointment.status !== 'cancelled') {
                    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
                    const cancelAudit = `\n[Cancelada por ${specialistName || 'el especialista'} el ${timestamp}]`;
                    finalNotes = (formData.notes || '') + cancelAudit;
                }

                if (formData.editSeries && editingAppointment.recurrenceId) {
                    // Update this one and all future instances in the series
                    const { error } = await supabase
                        .from('appointments')
                        .update({ 
                            type: payload.type,
                            fee: payload.fee,
                            meeting_link: finalMeetingLink,
                            meeting_platform: payload.meeting_platform,
                            notes: finalNotes, 
                            status: formData.status,
                            color: payload.color,
                            modality: payload.modality,
                        })
                        .eq('recurrence_id', editingAppointment.recurrenceId)
                        .gte('start_time', editingAppointment.startTime);
                    if (error) throw error;
                    toast.success('Serie de citas actualizada');
                } else {
                    const { error } = await supabase
                        .from('appointments')
                        .update({ 
                            ...payload, 
                            meeting_link: finalMeetingLink,
                            notes: finalNotes, 
                            status: formData.status 
                        })
                        .eq('id', editingAppointment.id);
                    if (error) throw error;
                    toast.success('Cita actualizada');
                }
            } else {
                if (formData.isRecurring) {
                    // Bulk creation
                    const sessions = [];
                    const recurrenceId = payload.recurrence_id;
                    
                    for (let i = 0; i < formData.recurrenceWeeks; i++) {
                        const currentStart = new Date(startDateTime.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                        const currentEnd = new Date(endDateTime.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                        
                        sessions.push({
                            ...payload,
                            start_time: currentStart.toISOString(),
                            end_time: currentEnd.toISOString(),
                            recurrence_id: recurrenceId,
                            meeting_link: finalMeetingLink,
                            status: formData.status || 'scheduled',
                            payment_status: 'pending',
                        });
                    }
                    
                    const { error } = await supabase.from('appointments').insert(sessions);
                    if (error) throw error;
                    toast.success(`${formData.recurrenceWeeks} citas agendadas correctamente`);
                } else {
                    const { error } = await supabase.from('appointments').insert([{
                        ...payload,
                        meeting_link: finalMeetingLink,
                        status: formData.status || 'scheduled',
                        payment_status: 'pending',
                    }]);
                    if (error) throw error;
                    toast.success(`Cita con ${formData.patientName} agendada correctamente`);
                }

                await logActivity({
                    profile_id: sessionUser!.id,
                    type: 'appointment_created',
                    title: 'Nueva Cita Agendada',
                    description: `Has agendado una cita con ${formData.patientName} el ${format(startDateTime, "d 'de' MMMM", { locale: es })} a las ${format(startDateTime, "HH:mm")}.`,
                    organization_id: organization?.id,
                });

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
                        meetingLink: finalMeetingLink,
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
                                            // 1. Past days
                                            if (isBefore(startOfDay(d), startOfDay(now))) return true;

                                            // 2. Specific Non-working days (holidays)
                                            const isoDate = format(d, 'yyyy-MM-dd');
                                            if (horarioConfig.dias_no_laborables.includes(isoDate)) return true;

                                            // 3. Regular non-working weekdays
                                            const weekday = d.getDay();
                                            const config = horarioConfig.dias?.[weekday];
                                            if (!config?.activo) return true;

                                            // 4. Today if past end hour
                                            if (isoDate === format(now, 'yyyy-MM-dd')) {
                                                const [finH, finM] = config.fin.split(':').map(Number);
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
                                            Sin confirmar
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
                                {(() => {
                                    const isTodayDate = date && format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                    const weekday = (date || new Date()).getDay();
                                    const config = horarioConfig.dias?.[weekday] || { inicio: '08:00', fin: '17:00' };
                                    let effectiveMin = config.inicio;

                                    if (isTodayDate) {
                                        const now = new Date();
                                        // Round up to next 5 minutes to match picker increments
                                        const roundedM = Math.ceil(now.getMinutes() / 5) * 5;
                                        const h = roundedM >= 60 ? now.getHours() + 1 : now.getHours();
                                        const m = roundedM % 60;
                                        const currentHM = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                        if (currentHM > effectiveMin) effectiveMin = currentHM;
                                    }

                                    return (
                                        <ClockPicker
                                            value={formData.startTime}
                                            onChange={(v) => setFormData({ ...formData, startTime: v })}
                                            disabled={isSubmitting}
                                            minTime={effectiveMin}
                                            maxTime={config.fin}
                                        />
                                    );
                                })()}
                                <span className="text-sm text-muted-foreground">— Duración: 1 hora</span>
                            </div>
                        </div>

                        {/* Modalidad */}
                        <div className="space-y-2">
                            <Label htmlFor="modality">Modalidad</Label>
                            <Select
                                value={formData.modality}
                                onValueChange={(value: any) => {
                                    const updates: any = { modality: value };
                                    if (value === 'online' && !formData.meetingPlatform) {
                                        updates.meetingPlatform = 'meet';
                                    }
                                    setFormData({ ...formData, ...updates });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona la modalidad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="presencial">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Presencial
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="online">
                                        <div className="flex items-center gap-2">
                                            <Video className="h-4 w-4" />
                                            En línea
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Recurrencia */}
                        {!isEditing && (
                            <div className="space-y-4 p-3 border rounded-lg bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-medium">Cita Recurrente</Label>
                                        <p className="text-xs text-muted-foreground">Repetir esta cita semanalmente</p>
                                    </div>
                                    <Switch
                                        checked={formData.isRecurring}
                                        onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
                                    />
                                </div>
                                {formData.isRecurring && (
                                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex-1 space-y-2">
                                            <Label htmlFor="weeks" className="text-xs">Número de semanas</Label>
                                            <Input
                                                id="weeks"
                                                type="number"
                                                min={2}
                                                max={12}
                                                value={formData.recurrenceWeeks}
                                                onChange={(e) => setFormData({ ...formData, recurrenceWeeks: parseInt(e.target.value) || 2 })}
                                                className="h-8"
                                            />
                                        </div>
                                        <div className="flex-[2] pt-6">
                                            <p className="text-[10px] text-muted-foreground italic">
                                                Se crearán {formData.recurrenceWeeks} sesiones en total.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Opción de editar serie */}
                        {isEditing && editingAppointment?.recurrenceId && (
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <Repeat className="h-4 w-4 text-blue-600" />
                                        <Label className="text-sm font-medium">Editar Serie</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Aplicar cambios a todas las citas futuras</p>
                                </div>
                                <Switch
                                    checked={formData.editSeries}
                                    onCheckedChange={(checked) => setFormData({ ...formData, editSeries: checked })}
                                />
                            </div>
                        )}

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
