import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    X, Download, Pencil, Trash2, Loader2,
    Mail, Phone, Calendar, FileText, Brain,
    ShieldCheck, FileSignature, CheckCircle2, XCircle,
    AlertTriangle, Plus, History, ShoppingCart, TrendingUp,
    ExternalLink, ClipboardList
} from 'lucide-react';
import { tagColors } from '@/lib/mockData';
import { supabase } from '@/lib/supabase';
import { psychometricTests } from '@/lib/psychometricTests';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { toast } from 'sonner';

interface SessionNote {
    id: string;
    date: string;
    session_number: number;
    agenda: any[];
    mood: any;
    created_at: string;
}

interface ConsentRecord {
    id: string;
    form_type: 'general' | 'tratamiento' | 'datos_personales';
    signed_at: string | null;
    is_valid: boolean;
    created_at: string;
}

interface PatientTestRecord {
    id: string;
    test_type: string;
    status: string;
    score: number | null;
    interpretation: string | null;
    created_at: string;
    completed_at: string | null;
}

interface PaymentRecord {
    id: string;
    amount: number;
    method: string;
    status: string;
    paid_at: string | null;
    created_at: string;
    appointments: {
        start_time: string;
    } | null;
}

const FORM_TYPE_LABELS: Record<string, string> = {
    general: 'Consentimiento General',
    tratamiento: 'Tratamiento Psicológico',
    datos_personales: 'Datos Personales (LFPDPPP)',
};

const FORM_TYPE_BADGE_CLASS: Record<string, string> = {
    general: 'bg-secondary text-secondary-foreground',
    tratamiento: 'bg-purple-100 text-purple-700 border-purple-200',
    datos_personales: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

interface PatientSlideOverProps {
    patient: any | null;
    notes: SessionNote[];
    notesLoading: boolean;
    isExportingPDF: boolean;
    confirmDelete: boolean;
    isDeletingPatient: boolean;
    onClose: () => void;
    onEdit: () => void;
    onExportPDF: () => void;
    onDeleteConfirm: () => void;
    onDeleteCancel: () => void;
    onDeleteExecute: () => void;
}

const PatientSlideOver = ({
    patient,
    notes,
    notesLoading,
    isExportingPDF,
    confirmDelete,
    isDeletingPatient,
    onClose,
    onEdit,
    onExportPDF,
    onDeleteConfirm,
    onDeleteCancel,
    onDeleteExecute,
}: PatientSlideOverProps) => {
    const navigate = useNavigate();
    const panelRef = useRef<HTMLDivElement>(null);
    const isOpen = !!patient;

    // ── Consents state ────────────────────────────────────────────────────────
    const [consents, setConsents] = useState<ConsentRecord[]>([]);
    const [consentsLoading, setConsentsLoading] = useState(false);
    const [bookingGuardOpen, setBookingGuardOpen] = useState(false);

    // ── Tests & Payments state ───────────────────────────────────────────────
    const [tests, setTests] = useState<PatientTestRecord[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [viewingTest, setViewingTest] = useState<any | null>(null);

    const hasValidConsent = consents.some(c => c.is_valid);

    // ── Fetch consents when patient changes ───────────────────────────────────
    const fetchPatientData = useCallback(async (p: any) => {
        if (!p) return;
        setDataLoading(true);
        setConsentsLoading(true);
        try {
            // Fetch Consents
            const { data: consentData, error: consentErr } = await supabase
                .from('consent_forms')
                .select('id, form_type, signed_at, is_valid, created_at')
                .eq('patient_id', p.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (consentErr) throw consentErr;
            setConsents((consentData as ConsentRecord[]) || []);

            // Fetch Tests
            const { data: testData, error: testErr } = await supabase
                .from('patient_tests')
                .select('id, test_type, status, score, interpretation, created_at, completed_at, answers')
                .eq('patient_id', p.id)
                .order('created_at', { ascending: false });
            if (testErr) throw testErr;
            setTests((testData as PatientTestRecord[]) || []);

            // Fetch Payments (via appointments)
            const { data: paymentData, error: paymentErr } = await supabase
                .from('payments')
                .select(`
                    id, amount, method, status, paid_at, created_at,
                    appointments!inner (
                        patient_id,
                        start_time
                    )
                `)
                .eq('appointments.patient_id', p.id)
                .order('created_at', { ascending: false });
            
            if (paymentErr) throw paymentErr;
            setPayments((paymentData as any[]) || []);

        } catch (err: any) {
            console.error('Error fetching patient data:', err);
            toast.error('Error al cargar datos del expediente: ' + err.message);
        } finally {
            setConsentsLoading(false);
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (patient) {
            fetchPatientData(patient);
        } else {
            setConsents([]);
            setTests([]);
            setPayments([]);
        }
    }, [patient, fetchPatientData]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const initials = patient?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '??';

    // ── Timeline consolidation ────────────────────────────────────────────────
    const timelineItems = [
        ...notes.map(n => ({ type: 'note', date: n.date, data: n })),
        ...tests.filter(t => t.completed_at).map(t => ({ type: 'test', date: t.completed_at!, data: t })),
        ...payments.filter(p => p.paid_at).map(p => ({ type: 'payment', date: p.paid_at!, data: p }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ── Booking guard handler ─────────────────────────────────────────────────
    const handleBookingClick = () => {
        if (hasValidConsent) {
            navigate('/agenda');
        } else {
            setBookingGuardOpen(true);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className={cn(
                    'fixed inset-0 z-[70] bg-foreground/20 backdrop-blur-[2px] transition-all duration-300',
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                aria-hidden="true"
            />

            {/* Slide-over panel */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={patient?.name || 'Expediente'}
                className={cn(
                    'fixed top-14 right-0 bottom-0 z-[80] w-full max-w-[600px]',
                    'bg-background shadow-2xl border-l border-border',
                    'flex flex-col',
                    'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {patient && (
                    <>
                        {/* ── Header ─────────────────────────────────────────────────── */}
                        <div className="flex items-center gap-4 border-b border-border px-6 py-4 flex-shrink-0">
                            {/* Avatar */}
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-lg font-bold text-primary">{initials}</span>
                            </div>

                            {/* Name + age */}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base font-semibold truncate">{patient.name}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {patient.date_of_birth || patient.dateOfBirth
                                        ? `${differenceInYears(new Date(), parseISO(patient.date_of_birth || patient.dateOfBirth))} años`
                                        : 'Edad desconocida'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon-sm" title="Exportar PDF" onClick={onExportPDF} disabled={isExportingPDF}>
                                    {isExportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon-sm" title="Editar" onClick={onEdit}>
                                    <Pencil className="h-4 w-4" />
                                </Button>

                                {confirmDelete ? (
                                    <>
                                        <Button
                                            variant="destructive" size="sm"
                                            className="text-xs h-7 px-2"
                                            onClick={onDeleteExecute}
                                            disabled={isDeletingPatient}
                                        >
                                            {isDeletingPatient ? <Loader2 className="h-3 w-3 animate-spin" /> : '¿Archivar?'}
                                        </Button>
                                        <Button variant="ghost" size="icon-sm" onClick={onDeleteCancel}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="ghost" size="icon-sm" title="Archivar" className="text-destructive hover:text-destructive" onClick={onDeleteConfirm}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}

                                {/* Close */}
                                <div className="ml-1 h-5 w-px bg-border" />
                                <Button variant="ghost" size="icon-sm" onClick={onClose} title="Cerrar">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* ── Body ───────────────────────────────────────────────────── */}
                        <div className="flex-1 overflow-y-auto">
                            <Tabs defaultValue="info" className="w-full">
                                <div className="px-6 pt-4 pb-0 sticky top-0 bg-background z-10 border-b border-border">
                                    <TabsList className="w-full justify-start gap-1 bg-transparent h-12 overflow-x-auto no-scrollbar scroll-smooth p-1">
                                        <TabsTrigger value="info" className="flex-shrink-0">Info</TabsTrigger>
                                        <TabsTrigger value="history" className="flex-shrink-0">Notas</TabsTrigger>
                                        <TabsTrigger value="timeline" className="flex-shrink-0">360°</TabsTrigger>
                                        <TabsTrigger value="evolution" className="flex-shrink-0">Evolución</TabsTrigger>
                                        <TabsTrigger value="tests" className="flex-shrink-0">Tests</TabsTrigger>
                                        <TabsTrigger value="economy" className="flex-shrink-0">Economía</TabsTrigger>
                                        <TabsTrigger value="consents" className="flex-shrink-0 text-xs text-muted-foreground/60">Legal</TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Tab: Información */}
                                <TabsContent value="info" className="p-6 space-y-5">
                                    {/* ── Consent readiness banner ─────────────────────────── */}
                                    {!consentsLoading && (
                                        hasValidConsent ? (
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200 text-sm">
                                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-green-800">Expediente completo</p>
                                                    <p className="text-xs text-green-700">{consents.filter(c => c.is_valid).length} consentimiento{consents.filter(c => c.is_valid).length !== 1 ? 's' : ''} firmado{consents.filter(c => c.is_valid).length !== 1 ? 's' : ''}</p>
                                                </div>
                                                <Button variant="zen" size="sm" className="flex-shrink-0 gap-1.5" onClick={handleBookingClick}>
                                                    <Calendar className="h-3.5 w-3.5" /> Agendar cita
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/5 border border-warning/30 text-sm">
                                                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-warning">Consentimientos pendientes</p>
                                                    <p className="text-xs text-muted-foreground">El paciente debe firmar antes de la primera cita</p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-shrink-0 gap-1.5 border-warning/40 text-warning hover:bg-warning/10"
                                                    onClick={() => navigate('/consents')}
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Crear
                                                </Button>
                                            </div>
                                        )
                                    )}
                                    {consentsLoading && (
                                        <div className="h-14 rounded-xl bg-muted/40 animate-pulse" />
                                    )}

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-muted/40">
                                            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <span className="truncate">{patient.email || 'Sin email'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm p-3 rounded-xl bg-muted/40">
                                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <span>{patient.phone || 'Sin teléfono'}</span>
                                        </div>

                                        {/* Datos NOM-024 */}
                                        {(patient.curp || patient.sex || patient.occupation) && (
                                            <div className="space-y-2 pt-1">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Datos oficiales (NOM-024)
                                                </p>
                                                {patient.curp && (
                                                    <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-muted/40">
                                                        <span className="text-muted-foreground">CURP</span>
                                                        <span className="font-mono text-xs font-medium tracking-wide">{patient.curp}</span>
                                                    </div>
                                                )}
                                                {patient.sex && (
                                                    <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-muted/40">
                                                        <span className="text-muted-foreground">Sexo</span>
                                                        <span>{patient.sex === 'F' ? 'Femenino' : patient.sex === 'M' ? 'Masculino' : 'No especificado'}</span>
                                                    </div>
                                                )}
                                                {patient.occupation && (
                                                    <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-muted/40">
                                                        <span className="text-muted-foreground">Ocupación</span>
                                                        <span>{patient.occupation}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Contacto emergencia */}
                                        {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
                                            <div className="space-y-2 pt-1">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto de emergencia</p>
                                                {patient.emergency_contact_name && (
                                                    <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-muted/40">
                                                        <span className="text-muted-foreground">Nombre</span>
                                                        <span>{patient.emergency_contact_name}</span>
                                                    </div>
                                                )}
                                                {patient.emergency_contact_phone && (
                                                    <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-muted/40">
                                                        <span className="text-muted-foreground">Teléfono</span>
                                                        <span>{patient.emergency_contact_phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <h4 className="text-sm font-medium mb-3">Etiquetas</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {patient.tags?.length > 0 ? patient.tags.map((tag: string) => (
                                                <Badge key={tag} variant={(tagColors[tag] || 'secondary') as any}>{tag}</Badge>
                                            )) : (
                                                <p className="text-sm text-muted-foreground italic">Sin etiquetas</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Admin notes */}
                                    <div>
                                        <h4 className="text-sm font-medium mb-2">Notas Administrativas</h4>
                                        <div className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3 min-h-[72px]">
                                            {patient.notes || 'Sin notas administrativas.'}
                                        </div>
                                    </div>

                                    {/* Booking action — secondary, below banner */}
                                    <Button variant="outline" className="w-full gap-2" onClick={handleBookingClick}>
                                        <Calendar className="h-4 w-4" /> Agendar Nueva Cita
                                    </Button>
                                </TabsContent>

                                {/* Tab: Historial */}
                                <TabsContent value="history" className="p-6 space-y-4">
                                    {notesLoading ? (
                                        <div className="flex justify-center py-10">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : notes.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                            <div className="bg-muted h-12 w-12 rounded-full flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <p className="text-muted-foreground text-sm">No hay notas clínicas registradas</p>
                                            <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/notes')}>
                                                Ir a Notas Clínicas
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {notes.map(note => (
                                                <div key={note.id} className="border rounded-xl p-4 space-y-3 hover:border-primary/30 transition-colors bg-card">
                                                    <div className="flex items-center justify-between">
                                                        <Badge variant="outline" className="bg-background">Sesión #{note.session_number}</Badge>
                                                        <span className="text-xs text-muted-foreground font-medium">
                                                            {format(parseISO(note.date), 'd MMM yyyy', { locale: es })}
                                                        </span>
                                                    </div>
                                                    {note.agenda && note.agenda.length > 0 && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                                                <Brain className="h-3 w-3" /> Temas
                                                            </div>
                                                            <p className="text-sm pl-2 border-l-2 border-primary/20">
                                                                {note.agenda.map((a: any) => a.topic).filter(Boolean).join(' · ')}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {note.mood?.rating && (
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                                                            <span>Ánimo:</span>
                                                            <div className="h-1.5 w-20 bg-muted-foreground/20 rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary rounded-full" style={{ width: `${note.mood.rating}%` }} />
                                                            </div>
                                                            <span className="font-medium">{note.mood.rating}/100</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Tab: Timeline (360 View) */}
                                <TabsContent value="timeline" className="p-6 space-y-6">
                                    <div className="relative">
                                        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-border" />
                                        <div className="space-y-8">
                                            {timelineItems.length === 0 ? (
                                                <div className="py-12 text-center text-muted-foreground italic text-sm">
                                                    No hay actividad registrada para este paciente aún.
                                                </div>
                                            ) : (
                                                timelineItems.map((item, idx) => {
                                                    const iconMap: any = {
                                                        note: <FileText className="h-4 w-4 text-blue-600" />,
                                                        test: <Brain className="h-4 w-4 text-purple-600" />,
                                                        payment: <ShoppingCart className="h-4 w-4 text-emerald-600" />
                                                    };
                                                    const bgMap: any = {
                                                        note: 'bg-blue-100',
                                                        test: 'bg-purple-100',
                                                        payment: 'bg-emerald-100'
                                                    };
                                                    
                                                    return (
                                                        <div key={idx} className="relative pl-10">
                                                            <div className={cn(
                                                                "absolute left-0 top-0 h-9 w-9 rounded-full flex items-center justify-center border-4 border-background z-10",
                                                                bgMap[item.type]
                                                            )}>
                                                                {iconMap[item.type]}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                                        {item.type === 'note' ? 'Sesión Clínica' : 
                                                                         item.type === 'test' ? 'Test Completado' : 'Pago Recibido'}
                                                                    </p>
                                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                                        {format(parseISO(item.date), 'd MMM, yyyy', { locale: es })}
                                                                    </span>
                                                                </div>
                                                                <div className="p-3 rounded-xl border bg-card/50 shadow-sm">
                                                                    {item.type === 'note' && (
                                                                        <div className="space-y-1">
                                                                            <p className="text-sm font-semibold">Sesión #{(item.data as any).session_number}</p>
                                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                                {(item.data as any).agenda?.map((a: any) => a.topic).join(' · ')}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    {item.type === 'test' && (
                                                                        <div className="space-y-1">
                                                                            <p className="text-sm font-semibold">{psychometricTests[(item.data as any).test_type]?.name || (item.data as any).test_type}</p>
                                                                            <div className="flex items-center gap-2">
                                                                                <Badge variant="secondary" className="text-[10px]">{(item.data as any).interpretation}</Badge>
                                                                                <span className="text-xs font-bold text-primary">{(item.data as any).score} pts</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {item.type === 'payment' && (
                                                                        <div className="space-y-1">
                                                                            <p className="text-sm font-semibold">${(item.data as any).amount} MXN</p>
                                                                            <p className="text-[10px] text-muted-foreground">Vía {(item.data as any).method} • {(item.data as any).status}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Tab: Evolución (Gráficas) */}
                                <TabsContent value="evolution" className="p-6 space-y-8">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-primary" /> Evolución de Síntomas
                                        </h3>
                                        <p className="text-xs text-muted-foreground">Progreso basado en puntajes de pruebas psicométricas</p>
                                    </div>

                                    {tests.filter(t => t.status === 'completed').length < 2 ? (
                                        <div className="py-12 text-center border rounded-2xl border-dashed bg-muted/20">
                                            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-sm text-muted-foreground font-medium">Se requieren al menos 2 pruebas completadas</p>
                                            <p className="text-[10px] text-muted-foreground">Para trazar una línea de progreso temporal.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {/* GAD-7 Chart if exists */}
                                            {tests.some(t => t.test_type === 'gad-7' && t.status === 'completed') && (
                                                <div className="space-y-3">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase pl-1">GAD-7 (Ansiedad)</p>
                                                    <div className="h-[200px] w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={
                                                                tests.filter(t => t.test_type === 'gad-7' && t.status === 'completed')
                                                                    .sort((a,b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime())
                                                                    .map(t => ({
                                                                        date: format(parseISO(t.completed_at!), 'd MMM', { locale: es }),
                                                                        score: t.score
                                                                    }))
                                                            }>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                                                                <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 21]} />
                                                                <RechartsTooltip 
                                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                                />
                                                                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            )}

                                            {/* PHQ-9 Chart if exists */}
                                            {tests.some(t => t.test_type === 'phq-9' && t.status === 'completed') && (
                                                <div className="space-y-3">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase pl-1">PHQ-9 (Depresión)</p>
                                                    <div className="h-[200px] w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={
                                                                tests.filter(t => t.test_type === 'phq-9' && t.status === 'completed')
                                                                    .sort((a,b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime())
                                                                    .map(t => ({
                                                                        date: format(parseISO(t.completed_at!), 'd MMM', { locale: es }),
                                                                        score: t.score
                                                                    }))
                                                            }>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                                                                <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 27]} />
                                                                <RechartsTooltip 
                                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                                />
                                                                <Line type="monotone" dataKey="score" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899' }} activeDot={{ r: 6 }} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Tab: Tests Detallados */}
                                <TabsContent value="tests" className="p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <Brain className="h-4 w-4 text-primary" /> Historial de Pruebas
                                        </h3>
                                        <Button variant="outline" size="sm" onClick={() => navigate('/tests')}>Asignar Nueva</Button>
                                    </div>

                                    <div className="space-y-3">
                                        {tests.length === 0 ? (
                                            <div className="text-center py-10 border rounded-xl border-dashed">
                                                <p className="text-sm text-muted-foreground">No se han asignado pruebas.</p>
                                            </div>
                                        ) : (
                                            tests.map(t => (
                                                <div key={t.id} className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-colors space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="text-sm font-bold">{psychometricTests[t.test_type]?.name || t.test_type}</p>
                                                            <p className="text-[10px] text-muted-foreground">Asignada el {format(parseISO(t.created_at), 'd MMM yyyy', { locale: es })}</p>
                                                        </div>
                                                        <Badge className={cn(
                                                            "text-[10px]",
                                                            t.status === 'completed' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {t.status === 'completed' ? 'Completada' : 'Pendiente'}
                                                        </Badge>
                                                    </div>
                                                    
                                                    {t.status === 'completed' && (
                                                        <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-center">
                                                                    <p className="text-[9px] text-muted-foreground uppercase">Score</p>
                                                                    <p className="text-sm font-bold text-primary">{t.score}</p>
                                                                </div>
                                                                <div className="h-6 w-px bg-border" />
                                                                <div>
                                                                    <p className="text-[9px] text-muted-foreground uppercase">Resultado</p>
                                                                    <p className="text-xs font-semibold">{t.interpretation}</p>
                                                                </div>
                                                            </div>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 text-[11px] gap-1"
                                                                onClick={() => setViewingTest(t)}
                                                            >
                                                                <ExternalLink className="h-3 w-3" /> Detalle
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Tab: Economía */}
                                <TabsContent value="economy" className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Pagado</p>
                                            <p className="text-2xl font-bold text-emerald-700">
                                                ${payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + Number(p.amount), 0)}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                            <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Pendiente</p>
                                            <p className="text-2xl font-bold text-amber-700">
                                                ${payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + Number(p.amount), 0)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historial de Pagos</h4>
                                        {payments.length === 0 ? (
                                            <p className="text-sm text-center py-8 text-muted-foreground italic">No hay registros financieros.</p>
                                        ) : (
                                            payments.map(p => (
                                                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-9 w-9 rounded-lg flex items-center justify-center",
                                                            p.status === 'paid' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                                        )}>
                                                            <ShoppingCart className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold">${p.amount} MXN</p>
                                                            <p className="text-[10px] text-muted-foreground capitalize">{p.method} • {p.status}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-medium text-muted-foreground">
                                                        {format(parseISO(p.created_at), 'd MMM, yyyy', { locale: es })}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </TabsContent>

                                {/* Tab: Consentimientos */}
                                <TabsContent value="consents" className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold">Documentos firmados</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={() => navigate('/consents')}
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Nuevo
                                        </Button>
                                    </div>

                                    {consentsLoading ? (
                                        <div className="flex justify-center py-10">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : consents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                            <div className="bg-warning/10 h-12 w-12 rounded-full flex items-center justify-center">
                                                <FileSignature className="h-6 w-6 text-warning" />
                                            </div>
                                            <p className="font-medium text-sm">Sin consentimientos</p>
                                            <p className="text-muted-foreground text-xs max-w-xs">
                                                Este paciente aún no ha firmado ningún documento. Se recomienda obtener el consentimiento antes de iniciar el tratamiento.
                                            </p>
                                            <Button variant="zen" size="sm" className="gap-1.5 mt-1" onClick={() => navigate('/consents')}>
                                                <FileSignature className="h-3.5 w-3.5" /> Crear consentimiento
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {consents.map(consent => (
                                                <div
                                                    key={consent.id}
                                                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                                                            <FileSignature className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">
                                                                {FORM_TYPE_LABELS[consent.form_type] || consent.form_type}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {consent.signed_at
                                                                    ? format(parseISO(consent.signed_at), "d MMM yyyy", { locale: es })
                                                                    : 'Sin fecha de firma'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs hidden sm:flex ${FORM_TYPE_BADGE_CLASS[consent.form_type] || ''}`}
                                                        >
                                                            {consent.form_type === 'general' ? 'General' : consent.form_type === 'tratamiento' ? 'Tratamiento' : 'Datos'}
                                                        </Badge>
                                                        {consent.is_valid ? (
                                                            <span className="flex items-center gap-1 text-xs text-green-600">
                                                                <CheckCircle2 className="h-3.5 w-3.5" /> Válido
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-xs text-destructive">
                                                                <XCircle className="h-3.5 w-3.5" /> Revocado
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    </>
                )}
            </div>

            {/* ── Booking guard dialog ─────────────────────────────────────────── */}
            <AlertDialog open={bookingGuardOpen} onOpenChange={setBookingGuardOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-warning" />
                            Sin consentimientos firmados
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>{patient?.name}</strong> no tiene consentimientos informados firmados.
                            Se recomienda obtener al menos el consentimiento general antes de iniciar las sesiones.
                            <br /><br />
                            ¿Deseas ir a crear un consentimiento primero, o agendar la cita de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setBookingGuardOpen(false); navigate('/consents'); }}>
                            Ir a Consentimientos
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => { setBookingGuardOpen(false); navigate('/agenda'); }}>
                            Agendar de todas formas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Detailed Test View Dialog */}
            <Dialog open={!!viewingTest} onOpenChange={(open) => !open && setViewingTest(null)}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden z-[100]">
                    <DialogHeader className="px-6 py-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle>{viewingTest ? psychometricTests[viewingTest.test_type]?.name : ''}</DialogTitle>
                                <DialogDescription>
                                    Resultados detallados • Completada el {viewingTest?.completed_at ? format(new Date(viewingTest.completed_at), "d 'de' MMMM, yyyy", { locale: es }) : ''}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {viewingTest && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted/50 p-3 rounded-lg border">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Puntaje Total</p>
                                        <p className="text-2xl font-bold text-primary">{viewingTest.score}</p>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-lg border">
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Interpretación</p>
                                        <p className="font-semibold text-foreground leading-tight">{viewingTest.interpretation}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-bold text-sm border-b pb-2">Respuestas del Paciente</h4>
                                    {psychometricTests[viewingTest.test_type]?.questions.map((q: any, idx: number) => {
                                        const patientAnswerValue = viewingTest.answers?.[q.id];
                                        const testOptions = psychometricTests[viewingTest.test_type]?.options || [];
                                        
                                        return (
                                            <div key={q.id} className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                <p className="text-sm font-medium leading-normal">
                                                    <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                                                    {q.text}
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {testOptions.map((opt) => (
                                                        <div 
                                                            key={opt.value}
                                                            className={cn(
                                                                "text-[10px] px-2 py-1.5 rounded border text-center transition-colors",
                                                                patientAnswerValue === opt.value 
                                                                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                                                                    : "bg-white text-muted-foreground border-slate-200 opacity-60"
                                                            )}
                                                        >
                                                            {opt.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 border-t bg-slate-50 flex justify-end">
                        <Button onClick={() => setViewingTest(null)}>Cerrar</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PatientSlideOver;
