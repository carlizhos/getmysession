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
    AlertTriangle, Plus,
} from 'lucide-react';
import { tagColors } from '@/lib/mockData';
import { supabase } from '@/lib/supabase';
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

    const hasValidConsent = consents.some(c => c.is_valid);

    // ── Fetch consents when patient changes ───────────────────────────────────
    const fetchConsents = useCallback(async (p: any) => {
        if (!p) return;
        setConsentsLoading(true);
        try {
            const { data, error } = await supabase
                .from('consent_forms')
                .select('id, form_type, signed_at, is_valid, created_at')
                .eq('patient_id', p.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setConsents((data as ConsentRecord[]) || []);
        } catch (err: any) {
            toast.error('Error al cargar consentimientos: ' + err.message);
        } finally {
            setConsentsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (patient) {
            fetchConsents(patient);
        } else {
            setConsents([]);
        }
    }, [patient, fetchConsents]);

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

    // ── Booking guard handler ─────────────────────────────────────────────────
    const handleBookingClick = () => {
        if (hasValidConsent) {
            navigate('/calendar');
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
                                    <TabsList className="w-full grid grid-cols-3 mb-0">
                                        <TabsTrigger value="info">Información</TabsTrigger>
                                        <TabsTrigger value="history">
                                            Historial
                                            {notes.length > 0 && (
                                                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                                    {notes.length}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="consents">
                                            Consentimientos
                                            {consents.length > 0 && (
                                                <span className={cn(
                                                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                                    hasValidConsent
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-warning/20 text-warning'
                                                )}>
                                                    {consents.length}
                                                </span>
                                            )}
                                        </TabsTrigger>
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
                        <AlertDialogAction onClick={() => { setBookingGuardOpen(false); navigate('/calendar'); }}>
                            Agendar de todas formas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default PatientSlideOver;
