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
import { format, parseISO, startOfDay, endOfDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Video, Loader2, XCircle, MapPin, Repeat, CreditCard, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';

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
    location?: string;
    isRecurring?: boolean;
    recurrenceId?: string;
    paymentStatus?: string;
    patientAge?: number;
    reasonForConsultation?: string;
    serviceId?: string;
}

interface NewAppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate?: Date;
    onAppointmentAdded?: () => void;
    editingAppointment?: EditingAppointment | null;
    isReadOnly?: boolean;
}

const NewAppointmentDialog = ({
    open,
    onOpenChange,
    selectedDate,
    onAppointmentAdded,
    editingAppointment,
    isReadOnly = false,
}: NewAppointmentDialogProps) => {
    const { user } = useAuth();
    const { organization } = useOrganization();
    const navigate = useNavigate();
    const isEditing = !!editingAppointment;
    const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);

    const [specialistName, setSpecialistName] = useState('');
    const [porcentajeGlobal, setPorcentajeGlobal] = useState<number>(30);
    const [reschedulePolicyGlobal, setReschedulePolicyGlobal] = useState<number>(24);

    // Schedule config loaded from profile
    const [horarioConfig, setHorarioConfig] = useState<any>({
        dias: {},
        dias_no_laborables: [],
    });

    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('horario_atencion, full_name, porcentaje_consultorio, reschedule_policy_hours')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.full_name) setSpecialistName(data.full_name);
                if (data?.porcentaje_consultorio !== undefined && data?.porcentaje_consultorio !== null) {
                    setPorcentajeGlobal(data.porcentaje_consultorio);
                }
                if (data?.reschedule_policy_hours !== undefined && data?.reschedule_policy_hours !== null) {
                    setReschedulePolicyGlobal(data.reschedule_policy_hours);
                }
                if (data?.horario_atencion) {
                    const h = data.horario_atencion;
                    let normalized: any;

                    if (Array.isArray(h.dias)) {
                        const newDias: any = {};
                        [0, 1, 2, 3, 4, 5, 6].forEach(d => {
                            newDias[d] = {
                                activo: h.dias.includes(d),
                                inicio: h.inicio || '08:00',
                                fin: h.fin || '17:00',
                                max_sesiones: 8
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

        // Fetch services
        const fetchServices = async () => {
            setIsLoadingServices(true);
            try {
                const { data } = await supabase
                    .from('services')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('active', true)
                    .order('name');
                if (data) setServices(data);
            } catch (err) {
                console.error('Error fetching services:', err);
            } finally {
                setIsLoadingServices(false);
            }
        };
        fetchServices();
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
        location: '',
        isRecurring: false,
        recurrenceWeeks: 8,
        editSeries: false,
        patientAge: '' as string | number,
        reasonForConsultation: '',
        serviceId: '',
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
                location: editingAppointment.location || '',
                isRecurring: editingAppointment.isRecurring || false,
                recurrenceWeeks: 8,
                editSeries: false,
                patientAge: editingAppointment.patientAge || '',
                reasonForConsultation: editingAppointment.reasonForConsultation || '',
                serviceId: editingAppointment.serviceId || '',
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
            location: '',
            isRecurring: false,
            recurrenceWeeks: 8,
            editSeries: false,
            patientAge: '',
            reasonForConsultation: '',
            serviceId: '',
        });
    };

    const handleServiceChange = (serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        if (service) {
            setFormData(prev => ({
                ...prev,
                serviceId,
                type: service.name,
                fee: String(service.price),
                color: service.color || prev.color
            }));
        } else {
            setFormData(prev => ({ ...prev, serviceId: '' }));
        }
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
            // Fetch session user FIRST so it's available for all subsequent code
            const { data: { user: sessionUser } } = await supabase.auth.getUser();

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

            // 1.5 Validar límite diario de sesiones (max_sesiones)
            if (config.max_sesiones != null && config.max_sesiones > 0) {
                const { count, error: countErr } = await supabase
                    .from('appointments')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', sessionUser?.id)
                    .neq('status', 'cancelled')
                    .gte('start_time', startOfDay(date).toISOString())
                    .lte('start_time', endOfDay(date).toISOString());

                if (countErr) {
                    console.error('Error counting appointments:', countErr);
                } else if (count != null) {
                    // Si estamos editando y no cambiamos de día, restamos 1 (el actual)
                    let currentLimit = config.max_sesiones;
                    let existingCount = count;
                    
                    if (isEditing) {
                        const originalStart = format(parseISO(editingAppointment.startTime), 'yyyy-MM-dd');
                        if (originalStart === dateStr) {
                            // Estamos en el mismo día, la cita actual ya está contada
                            if (count > currentLimit) {
                                // Ya estaba excedido, permitir editar si no se aumenta el número
                                // Pero por simplicidad, si count > limit, solo bloqueamos si movemos A un día lleno
                            }
                        }
                    }

                    if (existingCount >= currentLimit) {
                        // Check if we are editing and moving to a DIFFERENT day or if it's new
                        let shouldBlock = false;
                        if (!isEditing) {
                            shouldBlock = true;
                        } else {
                            const originalStart = format(parseISO(editingAppointment.startTime), 'yyyy-MM-dd');
                            if (originalStart !== dateStr) {
                                shouldBlock = true;
                            }
                        }

                        if (shouldBlock) {
                            toast.error(`Has alcanzado el límite de ${currentLimit} sesiones para este día (${dateStr}).`);
                            setIsSubmitting(false);
                            return;
                        }
                    }
                }
            }

            // 2. Validar que no sea fecha/hora en el pasado (solo para citas nuevas o si se cambió la fecha)
            const now = new Date();
            if (!isEditing && isBefore(startDateTime, now)) {
                toast.error('No puedes agendar una cita en el pasado');
                setIsSubmitting(false);
                return;
            }

            // Dynamic duration based on service
            const duration = services.find(s => s.id === formData.serviceId)?.duration || 60;
            const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

            const selectedService = services.find(s => s.id === formData.serviceId);
            let finalCommission = porcentajeGlobal;
            if (selectedService && selectedService.commission_percentage !== undefined && selectedService.commission_percentage !== null) {
                finalCommission = selectedService.commission_percentage;
            }

            let finalReschedulePolicy = reschedulePolicyGlobal;
            if (selectedService && selectedService.reschedule_policy_hours !== undefined && selectedService.reschedule_policy_hours !== null) {
                finalReschedulePolicy = selectedService.reschedule_policy_hours;
            }

            // sessionUser is already fetched at the top of the try block

            const appointmentId = isEditing && editingAppointment ? editingAppointment.id : crypto.randomUUID();

            const payload = {
                id: appointmentId,
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
                location: formData.location || null,
                is_recurring: formData.isRecurring,
                recurrence_id: isEditing ? editingAppointment?.recurrenceId : (formData.isRecurring ? crypto.randomUUID() : null),
                patient_age: formData.patientAge ? parseInt(formData.patientAge.toString()) : null,
                reason_for_consultation: formData.reasonForConsultation || null,
                service_id: formData.serviceId || null,
                commission_percentage: finalCommission,
                reschedule_policy_hours: finalReschedulePolicy,
            };

            let finalMeetingLink = formData.meetingLink;

            if (formData.meetingPlatform === 'saudade' && !finalMeetingLink) {
                finalMeetingLink = `${window.location.origin}/join/${appointmentId}`;
            }

            // --- External Calendar / Meeting Sync (Google, Microsoft, or Zoom) ---
            const isMeetSelected = formData.meetingPlatform === 'meet';
            const isTeamsSelected = formData.meetingPlatform === 'teams';
            const isZoomSelected = formData.meetingPlatform === 'zoom';
            const wasMeetSelected = isEditing && editingAppointment?.meetingPlatform === 'meet';
            const wasTeamsSelected = isEditing && editingAppointment?.meetingPlatform === 'teams';
            const wasZoomSelected = isEditing && editingAppointment?.meetingPlatform === 'zoom';

            let shouldSyncGoogle = false;
            let shouldSyncMicrosoft = false;
            let shouldSyncZoom = false;

            if (isEditing && wasMeetSelected && !isMeetSelected) {
                finalMeetingLink = '';
            } else if (isEditing && wasTeamsSelected && !isTeamsSelected) {
                finalMeetingLink = '';
            } else if (isEditing && wasZoomSelected && !isZoomSelected) {
                finalMeetingLink = '';
            } else if (isMeetSelected && (!finalMeetingLink || !wasMeetSelected)) {
                shouldSyncGoogle = true;
            } else if (isTeamsSelected && (!finalMeetingLink || !wasTeamsSelected)) {
                shouldSyncMicrosoft = true;
            } else if (isZoomSelected && (!finalMeetingLink || !wasZoomSelected)) {
                shouldSyncZoom = true;
            }

            console.log('[SyncLog] Google:', shouldSyncGoogle, 'Microsoft:', shouldSyncMicrosoft, 'Zoom:', shouldSyncZoom, 'Platform:', formData.meetingPlatform);

            if (shouldSyncGoogle) {
                try {
                    const { data, error: syncErr } = await supabase.functions.invoke('google-calendar-sync', {
                        body: {
                            userId: sessionUser?.id,
                            createMeet: true,
                            event: {
                                summary: `Cita Saudade: ${formData.patientName}`,
                                description: `Tipo: ${formData.type}\nEdad: ${formData.patientAge}\nMotivo: ${formData.reasonForConsultation}\nNotas: ${formData.notes || 'Ninguna'}`,
                                start: { dateTime: startDateTime.toISOString() },
                                end: { dateTime: endDateTime.toISOString() },
                                location: formData.location || undefined,
                            }
                        }
                    });

                    if (syncErr) {
                        console.error('[MeetSync] Error:', syncErr);
                        toast.warning('No se pudo crear el enlace de Google Meet. Puedes agregarlo manualmente.');
                    } else if (data?.meetLink) {
                        finalMeetingLink = data.meetLink;
                        console.log('[MeetSync] Meet link created:', finalMeetingLink);
                    } else if (data?.message === 'Google Calendar not connected') {
                        toast.warning('Google Calendar no está conectado. Conéctalo en Ajustes para generar enlaces automáticamente.');
                    } else if (data?.eventId && !data?.meetLink) {
                        // Google sometimes needs a moment to provision the Meet conference.
                        // Wait briefly and try to fetch the event to get the link.
                        console.warn('[MeetSync] Event created but no Meet link returned. Attempting retry...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        try {
                            const { data: retryData } = await supabase.functions.invoke('google-calendar-sync', {
                                body: {
                                    userId: sessionUser?.id,
                                    createMeet: true,
                                    event: {
                                        summary: `Cita Saudade: ${formData.patientName}`,
                                        description: `Tipo: ${formData.type}\nEdad: ${formData.patientAge}\nMotivo: ${formData.reasonForConsultation}\nNotas: ${formData.notes || 'Ninguna'}`,
                                        start: { dateTime: startDateTime.toISOString() },
                                        end: { dateTime: endDateTime.toISOString() },
                                        location: formData.location || undefined,
                                    }
                                }
                            });
                            if (retryData?.meetLink) {
                                finalMeetingLink = retryData.meetLink;
                                console.log('[MeetSync] Meet link obtained on retry:', finalMeetingLink);
                            } else {
                                toast.warning('El evento se creó en Google Calendar pero el enlace de Meet no se generó. Puedes agregarlo manualmente.');
                            }
                        } catch (retryErr) {
                            console.warn('[MeetSync] Retry also failed:', retryErr);
                            toast.warning('El evento se creó pero el enlace de Meet no se generó. Puedes agregarlo manualmente.');
                        }
                    } else {
                        console.warn('[MeetSync] Unexpected response:', data);
                        toast.warning('No se pudo generar el enlace de Meet. Puedes agregarlo manualmente.');
                    }
                } catch (err) {
                    console.error('[MeetSync] Exception:', err);
                    toast.warning('Error al conectar con Google Calendar. Puedes agregar el enlace manualmente.');
                }
            } else if (shouldSyncMicrosoft) {
                try {
                    const { data, error: syncErr } = await supabase.functions.invoke('microsoft-calendar-sync', {
                        body: {
                            userId: sessionUser?.id,
                            createTeams: true,
                            event: {
                                summary: `Cita Saudade: ${formData.patientName}`,
                                description: `Tipo: ${formData.type}\nEdad: ${formData.patientAge}\nMotivo: ${formData.reasonForConsultation}\nNotas: ${formData.notes || 'Ninguna'}`,
                                start: { dateTime: startDateTime.toISOString() },
                                end: { dateTime: endDateTime.toISOString() },
                            }
                        }
                    });

                    if (syncErr) {
                        console.error('[TeamsSync] Error:', syncErr);
                        toast.warning('No se pudo sincronizar con Microsoft 365.');
                    } else if (data?.teamsLink) {
                        finalMeetingLink = data.teamsLink;
                    } else if (data?.message === 'Microsoft not connected') {
                        toast.warning('Microsoft 365 no está conectado.');
                    }
                } catch (err) {
                    console.error('[TeamsSync] Exception:', err);
                }
            } else if (shouldSyncZoom) {
                try {
                    const { data, error: syncErr } = await supabase.functions.invoke('zoom-meeting-create', {
                        body: {
                            userId: sessionUser?.id,
                            topic: `Cita Saudade: ${formData.patientName}`,
                            startTime: startDateTime.toISOString(),
                            duration: duration
                        }
                    });

                    if (syncErr) {
                        console.error('[ZoomSync] Error:', syncErr);
                        // Retry once after a brief delay
                        console.log('[ZoomSync] Retrying after error...');
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        try {
                            const { data: retryData, error: retryErr } = await supabase.functions.invoke('zoom-meeting-create', {
                                body: {
                                    userId: sessionUser?.id,
                                    topic: `Cita Saudade: ${formData.patientName}`,
                                    startTime: startDateTime.toISOString(),
                                    duration: duration
                                }
                            });
                            if (!retryErr && retryData?.joinUrl) {
                                finalMeetingLink = retryData.joinUrl;
                                console.log('[ZoomSync] Zoom link obtained on retry:', finalMeetingLink);
                            } else {
                                toast.warning('No se pudo generar la reunión en Zoom. Puedes agregar el enlace manualmente.');
                            }
                        } catch (retryExc) {
                            console.error('[ZoomSync] Retry exception:', retryExc);
                            toast.warning('No se pudo generar la reunión en Zoom. Puedes agregar el enlace manualmente.');
                        }
                    } else if (data?.joinUrl) {
                        finalMeetingLink = data.joinUrl;
                        console.log('[ZoomSync] Zoom link created:', finalMeetingLink);
                    } else if (data?.message === 'Zoom not connected') {
                        toast.warning('Zoom no está conectado. Por favor, conéctalo en Ajustes.');
                    } else if (data?.error) {
                        console.error('[ZoomSync] Error en API:', data.error);
                        toast.warning(`Error de Zoom: ${data.error}. Puedes agregar el enlace manualmente.`);
                    } else {
                        console.warn('[ZoomSync] Unexpected response:', data);
                        toast.warning('No se pudo generar la reunión en Zoom. Puedes agregar el enlace manualmente.');
                    }
                } catch (err) {
                    console.error('[ZoomSync] Exception:', err);
                    toast.warning('Error al conectar con Zoom. Puedes agregar el enlace manualmente.');
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
                            location: payload.location,
                            patient_age: payload.patient_age,
                            reason_for_consultation: payload.reason_for_consultation,
                            commission_percentage: payload.commission_percentage,
                            reschedule_policy_hours: payload.reschedule_policy_hours,
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
                        const sessionAptId = crypto.randomUUID();
                        let sessionMeetingLink = finalMeetingLink;
                        if (payload.meeting_platform === 'saudade') {
                            sessionMeetingLink = `${window.location.origin}/join/${sessionAptId}`;
                        }

                        sessions.push({
                            ...payload,
                            id: sessionAptId,
                            start_time: currentStart.toISOString(),
                            end_time: currentEnd.toISOString(),
                            recurrence_id: recurrenceId,
                            meeting_link: sessionMeetingLink,
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
                        notes: `Edad: ${formData.patientAge}\nMotivo: ${formData.reasonForConsultation}\nNotas: ${formData.notes || 'Ninguna'}`,
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
                        <DialogTitle>{isReadOnly ? 'Detalles de la Cita' : isEditing ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
                        <DialogDescription>
                            {isReadOnly
                                ? 'Esta cita ya pasó y no puede ser modificada'
                                : isEditing
                                    ? 'Modifica los datos de la cita o cancélala'
                                    : 'Agenda una nueva sesión con un paciente'}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {isReadOnly && (
                    <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/50">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4" />
                            <p className="text-xs font-medium">Cita en el pasado: Solo lectura</p>
                        </div>
                    </div>
                )}

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
                                {!isReadOnly && (
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
                                )}
                            </Popover>
                        </div>

                        {/* Paciente */}
                        <div className="space-y-2">
                            <Label htmlFor="patient">Paciente *</Label>
                            <PatientAutocomplete
                                value={formData.patientId}
                                onSelect={(patientId, patientName) => {
                                    if (!isReadOnly) setFormData({ ...formData, patientId, patientName });
                                }}
                                placeholder={isReadOnly ? formData.patientName : (formData.patientName || 'Buscar paciente por nombre o email...')}
                                disabled={isReadOnly}
                            />
                        </div>

                        {/* Estado de la cita */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Estado de la cita</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => !isReadOnly && setFormData({ ...formData, status: value })}
                                disabled={isReadOnly}
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
                                        onClick={() => !isReadOnly && setFormData({ ...formData, color: c.value })}
                                        disabled={isReadOnly}
                                        className={cn(
                                            'h-7 w-7 rounded-full transition-all',
                                            c.bg,
                                            formData.color === c.value
                                                ? `ring-2 ring-offset-2 ${c.ring} scale-110`
                                                : isReadOnly ? 'opacity-50' : 'opacity-70 hover:opacity-100 hover:scale-105'
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Servicio de Agenda */}
                        {services.length > 0 && !isReadOnly && (
                            <div className="space-y-2">
                                <Label htmlFor="serviceId">Servicio de Agenda (Opcional)</Label>
                                <Select
                                    value={formData.serviceId}
                                    onValueChange={handleServiceChange}
                                >
                                    <SelectTrigger className="border-primary/20 bg-primary/5 font-medium">
                                        <SelectValue placeholder="Selecciona un servicio para autocompletar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Personalizado</SelectItem>
                                        {services.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("h-2 w-2 rounded-full", {
                                                        'bg-violet-500': s.color === 'violet',
                                                        'bg-blue-500': s.color === 'blue',
                                                        'bg-emerald-500': s.color === 'green',
                                                        'bg-amber-500': s.color === 'amber',
                                                        'bg-rose-500': s.color === 'rose',
                                                        'bg-indigo-500': s.color === 'indigo',
                                                    })} />
                                                    {s.name} ({s.duration}m — ${s.price})
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Tipo de sesión */}
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de Sesión</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => !isReadOnly && setFormData({ ...formData, type: value })}
                                disabled={isReadOnly}
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
                                            onChange={(v) => !isReadOnly && setFormData({ ...formData, startTime: v })}
                                            disabled={isSubmitting || isReadOnly}
                                            minTime={effectiveMin}
                                            maxTime={config.fin}
                                        />
                                    );
                                })()}
                                <span className="text-sm text-muted-foreground">— Duración: {services.find(s => s.id === formData.serviceId)?.duration || 60} min</span>
                            </div>
                        </div>

                        {/* Modalidad */}
                        <div className="space-y-2">
                            <Label htmlFor="modality">Modalidad</Label>
                            <Select
                                value={formData.modality}
                                onValueChange={(value: any) => {
                                    if (isReadOnly) return;
                                    const updates: any = { modality: value };
                                    if (value === 'online' && !formData.meetingPlatform) {
                                        updates.meetingPlatform = 'saudade';
                                    }
                                    setFormData({ ...formData, ...updates });
                                }}
                                disabled={isReadOnly}
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
                                        onCheckedChange={(checked) => !isReadOnly && setFormData({ ...formData, isRecurring: checked })}
                                        disabled={isReadOnly}
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
                                                onChange={(e) => !isReadOnly && setFormData({ ...formData, recurrenceWeeks: parseInt(e.target.value) || 2 })}
                                                className="h-8"
                                                disabled={isReadOnly}
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
                                    onCheckedChange={(checked) => !isReadOnly && setFormData({ ...formData, editSeries: checked })}
                                    disabled={isReadOnly}
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
                                onChange={(e) => !isReadOnly && setFormData({ ...formData, fee: e.target.value })}
                                disabled={isSubmitting || isReadOnly}
                            />
                        </div>

                        {formData.modality === 'online' ? (
                            <>
                                {/* Plataforma de videollamada */}
                                <div className="space-y-2">
                                    <Label htmlFor="platform">Plataforma de Videollamada (Opcional)</Label>
                                    <Select
                                        value={formData.meetingPlatform}
                                        onValueChange={(value) => !isReadOnly && setFormData({ ...formData, meetingPlatform: value })}
                                        disabled={isReadOnly}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona la plataforma" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="saudade">Videollamada Saudade (Consultorio Virtual)</SelectItem>
                                            <SelectItem value="meet">Google Meet</SelectItem>
                                            <SelectItem value="zoom">Zoom</SelectItem>
                                            <SelectItem value="teams">Microsoft Teams</SelectItem>
                                            <SelectItem value="other">Otra plataforma / Presencial</SelectItem>
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
                                            placeholder="https://zoom.us/j/... o https://meet.google.com/..."
                                            className="pl-9"
                                            value={formData.meetingLink}
                                            onChange={(e) => !isReadOnly && setFormData({ ...formData, meetingLink: e.target.value })}
                                            disabled={isSubmitting || isReadOnly}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Puedes agregar el link después de crear la reunión en Zoom o Meet
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Label htmlFor="location">Ubicación / Consultorio (Opcional)</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="location"
                                        placeholder="Ej. Consultorio 302, Piso 3"
                                        className="pl-9"
                                        value={formData.location}
                                        onChange={(e) => !isReadOnly && setFormData({ ...formData, location: e.target.value })}
                                        disabled={isSubmitting || isReadOnly}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Especifica la dirección física o el consultorio para esta cita
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="patientAge">Edad</Label>
                                <Input
                                    id="patientAge"
                                    type="number"
                                    placeholder="Ej. 25"
                                    value={formData.patientAge}
                                    onChange={(e) => !isReadOnly && setFormData({ ...formData, patientAge: e.target.value })}
                                    disabled={isSubmitting || isReadOnly}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reasonForConsultation">Motivo de Consulta</Label>
                                <Input
                                    id="reasonForConsultation"
                                    placeholder="Ej. Ansiedad, Depresión..."
                                    value={formData.reasonForConsultation}
                                    onChange={(e) => !isReadOnly && setFormData({ ...formData, reasonForConsultation: e.target.value })}
                                    disabled={isSubmitting || isReadOnly}
                                />
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (Opcional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Notas adicionales sobre la cita..."
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => !isReadOnly && setFormData({ ...formData, notes: e.target.value })}
                                disabled={isSubmitting || isReadOnly}
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t bg-background">
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            {/* Cancelar cita (solo en modo edición y no solo lectura) */}
                            {isEditing && editingAppointment?.status !== 'cancelled' && !isReadOnly && (
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
                            
                            {/* Entrar al Consultorio Virtual */}
                            {isEditing && (
                                <Button
                                    type="button"
                                    onClick={() => navigate(`/session/${editingAppointment.id}`)}
                                    className="mr-auto sm:ml-auto gap-2 bg-slate-900 text-white hover:bg-slate-800"
                                >
                                    <Video className="w-4 h-4 text-emerald-400" />
                                    Entrar al Consultorio Virtual
                                </Button>
                            )}

                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className={isReadOnly ? "w-full" : ""}>
                                {isReadOnly ? 'Cerrar' : isEditing ? 'Cerrar' : 'Cancelar'}
                            </Button>
                            {!isReadOnly && (
                                <Button type="submit" variant="zen" disabled={isSubmitting}>
                                    {isSubmitting
                                        ? (isEditing ? 'Guardando...' : 'Creando...')
                                        : (isEditing ? 'Guardar cambios' : 'Crear Cita')}
                                </Button>
                            )}
                        </DialogFooter>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewAppointmentDialog;
