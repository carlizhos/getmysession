import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import SignaturePad from '@/components/consent/SignaturePad';
import PatientAutocomplete from '@/components/patients/PatientAutocomplete';
import { FileSignature, Download, ShieldCheck, Loader2, CheckCircle2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import jsPDF from 'jspdf';
import { DEFAULT_CONSENT_TEXTS } from '@/components/consent/ConsentTemplateEditor';
import { cn } from '@/lib/utils';

// ── Tipos ─────────────────────────────────────────────────────────────────
interface ConsentFormViewProps {
    onSaved?: () => void;
    onCancel?: () => void;
}

// ── Componente ─────────────────────────────────────────────────────────────
const ConsentFormView = ({ onSaved, onCancel }: ConsentFormViewProps) => {
    const { user } = useAuth();
    const { organization } = useOrganization();
    const [patientId, setPatientId] = useState('');
    const [patientName, setPatientName] = useState('');
    const [formType, setFormType] = useState<'general' | 'tratamiento' | 'datos_personales'>('general');
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [patientError, setPatientError] = useState(false);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

    // Custom template text (editable per session)
    const [consentTitle, setConsentTitle] = useState('');
    const [consentBody, setConsentBody] = useState('');
    const [isEditingText, setIsEditingText] = useState(false);

    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    // ── Load template from profile (falls back to defaults) ─────────────────
    useEffect(() => {
        const loadTemplate = async () => {
            setIsLoadingTemplates(true);
            try {
                if (user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('consent_templates')
                        .eq('id', user.id)
                        .single();

                    const saved = data?.consent_templates?.[formType];
                    const fallback = DEFAULT_CONSENT_TEXTS[formType];

                    setConsentTitle(saved?.title || fallback.title);
                    setConsentBody(saved?.body || fallback.body);
                } else {
                    const fallback = DEFAULT_CONSENT_TEXTS[formType];
                    setConsentTitle(fallback.title);
                    setConsentBody(fallback.body);
                }
            } finally {
                setIsLoadingTemplates(false);
            }
        };
        loadTemplate();
    }, [user, formType]);

    // ── Generate PDF ─────────────────────────────────────────────────────────
    const generatePDF = (sigDataUrl: string, consentId: string) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const margin = 20;
        const pageW = doc.internal.pageSize.getWidth();
        const contentW = pageW - margin * 2;

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text('NOM-024-SSA3-2012 | Expediente Clínico Electrónico', margin, 15);
        doc.text(`Folio: ${consentId.substring(0, 8).toUpperCase()}`, pageW - margin, 15, { align: 'right' });

        doc.setDrawColor(200, 200, 220);
        doc.line(margin, 18, pageW - margin, 18);

        doc.setFontSize(16);
        doc.setTextColor(30, 30, 60);
        doc.setFont('helvetica', 'bold');
        doc.text(consentTitle, pageW / 2, 30, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(`Paciente: ${patientName || '—'}`, margin, 42);
        doc.text(`Fecha: ${today}`, margin, 48);

        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        const lines = doc.splitTextToSize(consentBody, contentW);
        let y = 58;
        lines.forEach((line: string) => {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.text(line, margin, y);
            y += 5;
        });

        y += 40;
        if (y > 220) { doc.addPage(); y = 20; }

        const sigW = 80;
        const sigX = (pageW - sigW) / 2;
        doc.setDrawColor(180, 180, 200);
        doc.line(sigX, y, sigX + sigW, y);
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 120);
        doc.text('Firma del paciente / tutor', pageW / 2, y + 5, { align: 'center' });
        doc.text(`Fecha de firma: ${today}`, pageW / 2, y + 10, { align: 'center' });

        if (sigDataUrl) {
            try { doc.addImage(sigDataUrl, 'PNG', sigX, y - 35, sigW, 33); } catch (_) { }
        }

        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Documento generado electrónicamente. Saudade © ${new Date().getFullYear()} | Página ${i} de ${totalPages}`,
                pageW / 2,
                doc.internal.pageSize.getHeight() - 8,
                { align: 'center' }
            );
        }

        doc.save(`consentimiento_${formType}_${patientName.replace(/\s+/g, '_')}_${consentId.substring(0, 8)}.pdf`);
    };

    // ── Save to Supabase ─────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!user) return;
        if (!patientId) {
            setPatientError(true);
            toast.error('Selecciona un paciente del catálogo antes de continuar');
            return;
        }
        setPatientError(false);
        if (!signatureDataUrl) { toast.error('Por favor, firma el documento antes de guardar'); return; }

        setIsSaving(true);
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(signatureDataUrl);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const { data: saved, error } = await supabase
                .from('consent_forms')
                .insert({
                    user_id: user.id,
                    patient_id: patientId || null,
                    patient_name: patientName,
                    form_type: formType,
                    consent_text: consentBody,
                    signed_at: new Date().toISOString(),
                    signature_data_url: signatureDataUrl,
                    signature_hash: hashHex,
                    is_valid: true,
                    organization_id: organization?.id,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Consentimiento firmado y guardado');
            setSavedId(saved.id);
            generatePDF(signatureDataUrl, saved.id);
            onSaved?.();
        } catch (err: any) {
            toast.error('Error al guardar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequestRemoteSignature = async () => {
        if (!user) return;
        if (!patientId) {
            setPatientError(true);
            toast.error('Selecciona un paciente del catálogo antes de continuar');
            return;
        }
        setPatientError(false);

        setIsSaving(true);
        try {
            const { data: saved, error } = await supabase
                .from('consent_forms')
                .insert({
                    user_id: user.id,
                    patient_id: patientId || null,
                    patient_name: patientName,
                    form_type: formType,
                    consent_text: consentBody,
                    signed_at: null, // Indicates remote signature pending
                    signature_data_url: null,
                    signature_hash: null,
                    is_valid: false, // Invalid until signed by the patient
                    organization_id: organization?.id,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Solicitud de firma remota creada con éxito en el portal del paciente.');
            setSavedId(saved.id);
            onSaved?.();
        } catch (err: any) {
            toast.error('Error al solicitar firma remota: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Saved confirmation screen ────────────────────────────────────────────
    if (savedId) {
        const isRemotePending = !signatureDataUrl;
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <div className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full",
                    isRemotePending ? "bg-amber-100" : "bg-green-100"
                )}>
                    {isRemotePending ? (
                        <FileSignature className="h-8 w-8 text-amber-600 animate-pulse" />
                    ) : (
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    )}
                </div>
                <h3 className="text-xl font-semibold">
                    {isRemotePending ? '¡Firma remota solicitada!' : '¡Consentimiento guardado!'}
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                    {isRemotePending
                        ? `El documento ha sido publicado en el portal de ${patientName}. El paciente ya puede ingresar y firmar de manera digital.`
                        : 'El PDF se descargó automáticamente. Puedes volver a descargarlo desde la lista de consentimientos.'}
                </p>
                <div className="flex gap-3 pt-2">
                    {!isRemotePending && (
                        <Button variant="outline" onClick={() => generatePDF(signatureDataUrl!, savedId)}>
                            <Download className="h-4 w-4 mr-2" /> Descargar PDF de nuevo
                        </Button>
                    )}
                    <Button variant="zen" onClick={onCancel}>
                        Ver lista de consentimientos
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Tipo + Paciente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Tipo de consentimiento</Label>
                    <Select value={formType} onValueChange={(v) => setFormType(v as typeof formType)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="general">Consentimiento General</SelectItem>
                            <SelectItem value="tratamiento">Tratamiento Psicológico</SelectItem>
                            <SelectItem value="datos_personales">Datos Personales (LFPDPPP)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Paciente *</Label>
                    <PatientAutocomplete
                        value={patientId}
                        onSelect={(id, name) => { setPatientId(id); setPatientName(name); setPatientError(false); }}
                    />
                    {patientError && (
                        <p className="text-xs text-destructive">Debes seleccionar un paciente del catálogo</p>
                    )}
                    {patientId && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Vinculado al expediente del paciente
                        </p>
                    )}
                </div>
            </div>

            {/* Texto del consentimiento */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Label className="text-base font-semibold">{consentTitle}</Label>
                        <Badge variant="outline" className="text-xs gap-1">
                            <ShieldCheck className="h-3 w-3 text-primary" /> NOM-024
                        </Badge>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-muted-foreground h-7"
                        onClick={() => setIsEditingText(e => !e)}
                    >
                        <Pencil className="h-3 w-3" />
                        {isEditingText ? 'Bloquear' : 'Editar texto'}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Fecha: <span className="font-medium">{today}</span>
                    {isEditingText && (
                        <span className="ml-2 text-warning">· Edición habilitada para esta firma</span>
                    )}
                </p>

                {isLoadingTemplates ? (
                    <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Textarea
                        value={consentBody}
                        onChange={isEditingText ? (e) => setConsentBody(e.target.value) : undefined}
                        readOnly={!isEditingText}
                        rows={12}
                        className={`text-sm font-mono leading-relaxed resize-none ${
                            isEditingText ? '' : 'bg-muted/30'
                        }`}
                    />
                )}
                {isEditingText && (
                    <p className="text-xs text-muted-foreground">
                        ℹ️ Los cambios aquí solo aplican a <strong>este consentimiento</strong>. Para editar la plantilla permanente ve a la pestaña <strong>Plantillas</strong>.
                    </p>
                )}
            </div>

            {/* Firma */}
            <div className="space-y-3">
                <Label className="text-base font-semibold flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-primary" />
                    Firma del paciente o tutor legal
                </Label>
                {signatureDataUrl ? (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-green-800">Firma capturada correctamente</p>
                                <p className="text-xs text-green-700">Haz click en "Limpiar" para volver a firmar</p>
                            </div>
                        </div>
                        <img src={signatureDataUrl} alt="Firma" className="max-h-24 rounded-lg border bg-white p-2" />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSignatureDataUrl(null)}
                        >
                            Limpiar y volver a firmar
                        </Button>
                    </div>
                ) : (
                    <SignaturePad onSign={(dataUrl) => setSignatureDataUrl(dataUrl)} />
                )}
            </div>

            {/* Acciones */}
            <div className="flex gap-3 justify-end border-t pt-4">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} type="button">
                        Cancelar
                    </Button>
                )}
                <Button
                    type="button"
                    onClick={handleRequestRemoteSignature}
                    disabled={isSaving || !patientId}
                    variant="outline"
                    className="gap-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 text-amber-700"
                >
                    {isSaving ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                    ) : (
                        <><FileSignature className="h-4 w-4" /> Solicitar Firma Remota</>
                    )}
                </Button>
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || !signatureDataUrl}
                    variant="zen"
                    className="gap-2"
                >
                    {isSaving ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                    ) : (
                        <><FileSignature className="h-4 w-4" /> Firmar en Oficina</>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default ConsentFormView;
