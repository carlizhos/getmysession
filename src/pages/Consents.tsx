import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import FeatureGate from '@/components/subscription/FeatureGate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConsentFormView from '@/components/consent/ConsentFormView';
import ConsentTemplateEditor from '@/components/consent/ConsentTemplateEditor';
import {
    FileSignature,
    Plus,
    Download,
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowLeft,
    Search,
    FileText,
    LayoutTemplate,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';

// ── Tipos ─────────────────────────────────────────────────────────────────
interface ConsentRecord {
    id: string;
    patient_name: string;
    form_type: 'general' | 'tratamiento' | 'datos_personales';
    signed_at: string | null;
    is_valid: boolean;
    signature_data_url: string | null;
    consent_text: string | null;
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

type ActiveTab = 'firmados' | 'plantillas';

// ── Componente ─────────────────────────────────────────────────────────────
const Consents = () => {
    const { user } = useAuth();
    const { organization } = useOrganization();
    const [activeTab, setActiveTab] = useState<ActiveTab>('firmados');
    const [isCreating, setIsCreating] = useState(false);
    const [consents, setConsents] = useState<ConsentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('newest');

    const fetchConsents = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('consent_forms')
                .select('id, patient_name, form_type, signed_at, is_valid, signature_data_url, consent_text, created_at')
                .eq('organization_id', organization?.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setConsents((data as ConsentRecord[]) || []);
        } catch (err: unknown) {
            const error = err as Error;
            toast.error('Error al cargar consentimientos: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [user, organization?.id]);

    useEffect(() => { fetchConsents(); }, [fetchConsents]);

    // ── Regenerar PDF ────────────────────────────────────────────────────────
    const handleDownloadPDF = async (consent: ConsentRecord) => {
        // Fetch professional data for signature block
        let professional: { full_name?: string; prefix?: string; cedulas?: any[]; signature_data?: string | null; logo_data?: string | null } | null = null;
        if (user) {
            const { data: prof } = await supabase
                .from('profiles')
                .select('full_name, prefix, cedulas, signature_data, logo_data')
                .eq('id', user.id)
                .single();
            if (prof) professional = prof;
        }

        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const margin = 20;
        const pageW = doc.internal.pageSize.getWidth();
        const contentW = pageW - margin * 2;
        const title = FORM_TYPE_LABELS[consent.form_type] || 'Consentimiento Informado';

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text('NOM-024-SSA3-2012 | Expediente Cl\u00ednico Electr\u00f3nico', margin, 15);

        // Render logo in top-right header if available
        if (professional?.logo_data) {
            try {
                doc.addImage(professional.logo_data, 'PNG', pageW - margin - 22, 3.5, 22, 8);
                doc.text(`Folio: ${consent.id.substring(0, 8).toUpperCase()}`, pageW - margin - 24, 15, { align: 'right' });
            } catch (_) {
                doc.text(`Folio: ${consent.id.substring(0, 8).toUpperCase()}`, pageW - margin, 15, { align: 'right' });
            }
        } else {
            doc.text(`Folio: ${consent.id.substring(0, 8).toUpperCase()}`, pageW - margin, 15, { align: 'right' });
        }
        doc.setDrawColor(200, 200, 220);
        doc.line(margin, 18, pageW - margin, 18);

        doc.setFontSize(16);
        doc.setTextColor(30, 30, 60);
        doc.setFont('helvetica', 'bold');
        doc.text(title, pageW / 2, 30, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(`Paciente: ${consent.patient_name || '—'}`, margin, 42);
        doc.text(
            `Fecha de firma: ${consent.signed_at ? format(parseISO(consent.signed_at), "d 'de' MMMM yyyy", { locale: es }) : '—'}`,
            margin, 48,
        );

        const lines = doc.splitTextToSize(consent.consent_text || '', contentW);
        let y = 58;
        lines.forEach((line: string) => {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.text(line, margin, y);
            y += 5;
        });

        y += 10;
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setDrawColor(180, 180, 200);
        doc.line(margin, y, margin + 80, y);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 120);
        doc.text('Firma del paciente / tutor', margin, y + 5);

        if (consent.signature_data_url) {
            try { doc.addImage(consent.signature_data_url, 'PNG', margin, y - 38, 80, 35); } catch (e) {
                console.error('Error adding signature to PDF:', e);
            }
        }

        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Saudade © ${new Date().getFullYear()} | Página ${i} de ${totalPages}`,
                pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' },
            );
        }

        // ── Professional signature block ──
        if (professional) {
            y += 15;
            if (y > 220) { doc.addPage(); y = 20; }

            // Professional signature image
            if (professional.signature_data) {
                try {
                    doc.addImage(professional.signature_data, 'PNG', pageW / 2 - 25, y, 50, 20);
                    y += 22;
                } catch (e) { y += 2; }
            }

            doc.setDrawColor(60, 40, 120);
            doc.line(pageW / 2 - 40, y, pageW / 2 + 40, y);
            y += 5;

            const displayName = [professional.prefix, professional.full_name].filter(Boolean).join(' ');
            if (displayName) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 30, 60);
                doc.text(displayName, pageW / 2, y, { align: 'center' });
                y += 5;
            }

            if (professional.cedulas && professional.cedulas.length > 0) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80, 80, 100);
                for (const ced of professional.cedulas) {
                    doc.text(`Céd. Prof. ${ced.numero}`, pageW / 2, y, { align: 'center' });
                    y += 4.5;
                }
            }

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 120);
            doc.text('Psicólogo responsable', pageW / 2, y + 2, { align: 'center' });
        }

        doc.save(`consentimiento_${consent.patient_name.replace(/\s+/g, '_')}_${consent.id.substring(0, 8)}.pdf`);
    };

    const filtered = consents.filter(c => {
        const matchesSearch = c.patient_name.toLowerCase().includes(search.toLowerCase()) ||
            FORM_TYPE_LABELS[c.form_type]?.toLowerCase().includes(search.toLowerCase());

        const matchesType = typeFilter === 'all' || c.form_type === typeFilter;

        let matchesStatus = true;
        if (statusFilter === 'signed') {
            matchesStatus = !!c.signed_at && c.is_valid;
        } else if (statusFilter === 'pending') {
            matchesStatus = !c.signed_at;
        } else if (statusFilter === 'revoked') {
            matchesStatus = !!c.signed_at && !c.is_valid;
        }

        return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // ── Vista: Nuevo consentimiento ──────────────────────────────────────────
    if (isCreating) {
        return (
            <Layout>
                <FeatureGate feature="core_consents">
                <div className="space-y-6 animate-fade-in">
                    {/* Header Section (Island Style) */}
                    <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-6 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
                        <div className="flex items-center gap-4 w-full lg:w-auto">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setIsCreating(false)}
                                className="rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="space-y-0.5">
                                <h1 className="text-2xl font-black tracking-tight text-foreground">Nuevo Consentimiento</h1>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Firma digital NOM-024</p>
                            </div>
                        </div>
                    </div>
                    <ConsentFormView
                        onSaved={() => { fetchConsents(); setIsCreating(false); }}
                        onCancel={() => setIsCreating(false)}
                    />
                </div>
                </FeatureGate>
            </Layout>
        );
    }

    // ── Vista principal con tabs ─────────────────────────────────────────────
    return (
        <Layout>
            <FeatureGate feature="core_consents">
            <div className="space-y-6">
                {/* Header Section (Island Style) */}
                <div id="tour-consents-header" className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-5 rounded-2xl border border-border shadow-soft animate-in slide-in-from-top duration-700">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                            <FileSignature className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-black tracking-tight text-foreground">Consentimientos Informados</h1>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-60">Documentos firmados digitalmente · NOM-024-SSA3-2012</p>
                        </div>
                    </div>

                    <div id="tour-consents-new-btn" className="w-full lg:w-auto flex justify-end">
                        {activeTab === 'firmados' && (
                            <Button 
                                variant="zen" 
                                className="w-full sm:w-auto gap-2 shadow-soft hover:scale-[1.02] transition-all" 
                                onClick={() => setIsCreating(true)}
                            >
                                <Plus className="h-4 w-4" />
                                <span>Nuevo Consentimiento</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs & Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit border border-border shrink-0">
                        {([
                            { id: 'firmados', label: 'Firmados', icon: FileSignature },
                            { id: 'plantillas', label: 'Plantillas', icon: LayoutTemplate },
                        ] as { id: ActiveTab; label: string; icon: typeof FileSignature }[]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                                    activeTab === tab.id
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                                {tab.id === 'firmados' && consents.length > 0 && (
                                    <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 tabular-nums">
                                        {consents.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Filters & Sorting */}
                    {activeTab === 'firmados' && (
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            {/* Search Input */}
                            <div className="relative w-full sm:w-48 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Buscar paciente..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-9 bg-muted/30 border-transparent focus:bg-background transition-all text-sm rounded-xl"
                                />
                            </div>

                            {/* Dropdown: Type of Consent */}
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="h-9 bg-muted/30 border-transparent hover:bg-muted/50 rounded-xl text-sm px-3 min-w-[120px] w-full sm:w-auto text-left">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                    <SelectItem value="general">Consentimiento General</SelectItem>
                                    <SelectItem value="tratamiento">Tratamiento Psicológico</SelectItem>
                                    <SelectItem value="datos_personales">Datos Personales</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Dropdown: Status */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 bg-muted/30 border-transparent hover:bg-muted/50 rounded-xl text-sm px-3 min-w-[120px] w-full sm:w-auto text-left text-muted-foreground">
                                    <SelectValue placeholder="Estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    <SelectItem value="signed">Firmado (Válido)</SelectItem>
                                    <SelectItem value="pending">Pendiente de firma</SelectItem>
                                    <SelectItem value="revoked">Revocado</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Dropdown: Sort Order */}
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-9 bg-muted/30 border-transparent hover:bg-muted/50 rounded-xl text-sm px-3 min-w-[140px] w-full sm:w-auto text-left">
                                    <SelectValue placeholder="Ordenar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Más recientes primero</SelectItem>
                                    <SelectItem value="oldest">Más antiguos primero</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* ── Tab: Plantillas ──────────────────────────────────────── */}
                {activeTab === 'plantillas' && (
                    <Card variant="flat" className="border border-border">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <LayoutTemplate className="h-4 w-4 text-primary" />
                                Editor de Plantillas
                            </CardTitle>
                            <CardDescription>
                                Personaliza el texto de cada tipo de consentimiento. Sube un <strong>.pdf</strong> o <strong>.docx</strong> para extraer el texto automáticamente, edítalo y guárdalo como tu plantilla base.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConsentTemplateEditor />
                        </CardContent>
                    </Card>
                )}

                {/* ── Tab: Firmados ─────────────────────────────────────────── */}
                {activeTab === 'firmados' && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Total', value: consents.length, icon: FileText },
                                { label: 'Válidos', value: consents.filter(c => c.is_valid).length, icon: CheckCircle2 },
                                { label: 'General', value: consents.filter(c => c.form_type === 'general').length },
                                { label: 'Tratamiento', value: consents.filter(c => c.form_type === 'tratamiento').length },
                            ].map((stat) => (
                                <Card key={stat.label} variant="flat" className="border border-border">
                                    <CardContent className="p-4">
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>



                        {/* List */}
                        <Card variant="default">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Historial de Consentimientos</CardTitle>
                                <CardDescription>{filtered.length} documento{filtered.length !== 1 ? 's' : ''}</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                            <FileSignature className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            {search ? 'Sin resultados para tu búsqueda' : 'No hay consentimientos registrados aún'}
                                        </p>
                                        {!search && (
                                            <Button variant="outline" size="sm" onClick={() => setIsCreating(true)}>
                                                <Plus className="h-4 w-4 mr-2" /> Crear primer consentimiento
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {filtered.map((consent) => (
                                            <div
                                                key={consent.id}
                                                className="flex items-center justify-between px-6 py-4 hover:bg-accent/40 transition-colors"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                                                        <FileSignature className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{consent.patient_name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Badge variant="outline" className={`text-xs ${FORM_TYPE_BADGE_CLASS[consent.form_type] || ''}`}>
                                                                {FORM_TYPE_LABELS[consent.form_type]}
                                                            </Badge>
                                                            {!consent.signed_at ? (
                                                                <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/30">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                    Pendiente de Firma
                                                                </span>
                                                            ) : consent.is_valid ? (
                                                                <span className="flex items-center gap-1 text-xs text-green-600">
                                                                    <CheckCircle2 className="h-3 w-3" /> Válido
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-xs text-destructive">
                                                                    <XCircle className="h-3 w-3" /> Revocado
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="hidden sm:block text-right">
                                                        <p className="text-xs text-muted-foreground">
                                                            {consent.signed_at
                                                                ? format(parseISO(consent.signed_at), "d MMM yyyy", { locale: es })
                                                                : 'Pendiente'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            #{consent.id.substring(0, 8).toUpperCase()}
                                                        </p>
                                                    </div>
                                                    {consent.signed_at ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Descargar PDF"
                                                            onClick={() => handleDownloadPDF(consent)}
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Pendiente de Firma"
                                                            disabled
                                                            className="opacity-40 cursor-not-allowed text-muted-foreground"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
            </FeatureGate>
        </Layout>
    );
};

export default Consents;
