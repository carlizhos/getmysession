import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { FileSignature, Download, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// ── Textos de consentimiento por tipo ──────────────────────────────────────
const CONSENT_TEXTS: Record<string, { title: string; body: string }> = {
    general: {
        title: 'Consentimiento Informado General',
        body: `Por medio del presente documento, yo, el/la abajo firmante, en pleno uso de mis facultades mentales y de forma voluntaria, otorgo mi consentimiento para recibir servicios de salud mental por parte del profesional arriba indicado.

DECLARO que:
1. He sido informado/a de manera clara y comprensible sobre el proceso terapéutico, sus objetivos, técnicas y duración estimada.
2. Comprendo que puedo retirar mi consentimiento en cualquier momento, sin que ello afecte la atención recibida.
3. He sido informado/a sobre la confidencialidad de la información compartida en las sesiones, y de las excepciones legales y éticas que la limitan (riesgo para la vida, mandato judicial, etc.).
4. Acepto que mis datos personales y de salud sean registrados en un expediente clínico electrónico, de conformidad con la NOM-024-SSA3-2012 y la Ley General de Protección de Datos Personales.
5. Autorizo el uso de mis datos de forma anónima con fines estadísticos o de investigación, sin que sea posible mi identificación.

Este consentimiento cumple con lo establecido en la NOM-024-SSA3-2012 para Sistemas de Información de Registro Electrónico para la Salud.`,
    },
    tratamiento: {
        title: 'Consentimiento Informado para Tratamiento Psicológico',
        body: `Por medio del presente, autorizo al profesional de la salud mental a realizar el tratamiento psicológico acordado, que puede incluir: evaluación psicológica, psicoterapia individual, técnicas cognitivo-conductuales, intervención en crisis y/o derivación a otros especialistas cuando sea necesario.

RECONOZCO que:
1. El tratamiento psicológico implica trabajar sobre situaciones emocionales que pueden generar incomodidad temporal.
2. Los resultados del tratamiento no pueden garantizarse, ya que dependen de múltiples factores.
3. La duración del tratamiento es orientativa y puede variar según la evolución.
4. Tengo derecho a solicitar una segunda opinión en cualquier momento.
5. En caso de emergencia o crisis grave, seré referido/a al servicio de urgencias correspondiente.

Declaro haber leído y entendido el presente consentimiento, y lo firmo de manera voluntaria.`,
    },
    datos_personales: {
        title: 'Consentimiento para Tratamiento de Datos Personales',
        body: `De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento, así como con la NOM-024-SSA3-2012, por medio del presente documento OTORGO MI CONSENTIMIENTO EXPRESO para el tratamiento de mis datos personales, incluyendo datos sensibles relacionados con mi salud mental.

FINALIDADES DEL TRATAMIENTO:
• Prestación de servicios de salud mental y psicoterapia
• Elaboración y mantenimiento de expediente clínico electrónico
• Coordinación con otros profesionales de la salud cuando sea necesario
• Facturación y gestión administrativa

MIS DERECHOS ARCO:
Tengo derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de mis datos personales, mediante solicitud escrita al responsable del tratamiento.

CONSERVACIÓN: Mis datos serán conservados por un mínimo de 5 años conforme a la normativa aplicable.

Declaro que la información proporcionada es verídica y que he leído el Aviso de Privacidad disponible en consulta.`,
    },
};

// ── Tipos ─────────────────────────────────────────────────────────────────
interface ConsentFormViewProps {
    onSaved?: () => void;
    onCancel?: () => void;
}

// ── Componente ─────────────────────────────────────────────────────────────
const ConsentFormView = ({ onSaved, onCancel }: ConsentFormViewProps) => {
    const { user } = useAuth();
    const [patientId, setPatientId] = useState('');
    const [patientName, setPatientName] = useState('');
    const [formType, setFormType] = useState<'general' | 'tratamiento' | 'datos_personales'>('general');
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);

    const consentContent = CONSENT_TEXTS[formType];
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

    // ── Generar y descargar PDF ──────────────────────────────────────────────
    const generatePDF = (sigDataUrl: string, consentId: string) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const margin = 20;
        const pageW = doc.internal.pageSize.getWidth();
        const contentW = pageW - margin * 2;

        // Header
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text('NOM-024-SSA3-2012 | Expediente Clínico Electrónico', margin, 15);
        doc.text(`Folio: ${consentId.substring(0, 8).toUpperCase()}`, pageW - margin, 15, { align: 'right' });

        // Línea separadora
        doc.setDrawColor(200, 200, 220);
        doc.line(margin, 18, pageW - margin, 18);

        // Título
        doc.setFontSize(16);
        doc.setTextColor(30, 30, 60);
        doc.setFont('helvetica', 'bold');
        doc.text(consentContent.title, pageW / 2, 30, { align: 'center' });

        // Datos del paciente
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(`Paciente: ${patientName || '—'}`, margin, 42);
        doc.text(`Fecha: ${today}`, margin, 48);

        // Cuerpo del consentimiento
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        const lines = doc.splitTextToSize(consentContent.body, contentW);
        let y = 58;
        lines.forEach((line: string) => {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.text(line, margin, y);
            y += 5;
        });

        // Firma
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

        // Imagen de la firma
        if (sigDataUrl) {
            try {
                doc.addImage(sigDataUrl, 'PNG', sigX, y - 35, sigW, 33);
            } catch (_) { /* Si falla la imagen, continúa */ }
        }

        // Pie de página
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Documento generado electrónicamente. MindCare © ${new Date().getFullYear()} | Página ${i} de ${totalPages}`,
                pageW / 2,
                doc.internal.pageSize.getHeight() - 8,
                { align: 'center' }
            );
        }

        doc.save(`consentimiento_${formType}_${patientName.replace(/\s+/g, '_')}_${consentId.substring(0, 8)}.pdf`);
    };

    // ── Guardar en Supabase ──────────────────────────────────────────────────
    const handleSave = async () => {
        if (!user) return;
        if (!patientName.trim()) { toast.error('Selecciona o escribe el nombre del paciente'); return; }
        if (!signatureDataUrl) { toast.error('Por favor, firma el documento antes de guardar'); return; }

        setIsSaving(true);
        try {
            // Hash SHA-256 de la firma para auditoría
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
                    consent_text: consentContent.body,
                    signed_at: new Date().toISOString(),
                    signature_data_url: signatureDataUrl,
                    signature_hash: hashHex,
                    is_valid: true,
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

    if (savedId) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">¡Consentimiento guardado!</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                    El PDF se descargó automáticamente. Puedes volver a descargarlo desde la lista de consentimientos.
                </p>
                <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => generatePDF(signatureDataUrl!, savedId)}>
                        <Download className="h-4 w-4 mr-2" /> Descargar PDF de nuevo
                    </Button>
                    <Button variant="zen" onClick={onCancel}>
                        Ver lista de consentimientos
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Tipo de consentimiento */}
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
                    <Label>Paciente</Label>
                    <PatientAutocomplete
                        value={patientId}
                        onSelect={(id, name) => { setPatientId(id); setPatientName(name); }}
                    />
                    {!patientId && (
                        <Input
                            placeholder="O escribe el nombre manualmente..."
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            className="mt-1"
                        />
                    )}
                </div>
            </div>

            {/* Texto del consentimiento (solo lectura) */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label className="text-base font-semibold">{consentContent.title}</Label>
                    <Badge variant="outline" className="text-xs gap-1">
                        <ShieldCheck className="h-3 w-3 text-primary" /> NOM-024
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Fecha: <span className="font-medium">{today}</span>
                </p>
                <Textarea
                    value={consentContent.body}
                    readOnly
                    rows={12}
                    className="text-sm font-mono bg-muted/30 resize-none leading-relaxed"
                />
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
                    <SignaturePad
                        onSign={(dataUrl) => setSignatureDataUrl(dataUrl)}
                    />
                )}
            </div>

            {/* Acciones */}
            <div className="flex gap-3 justify-end border-t pt-4">
                {onCancel && (
                    <Button variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                )}
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !signatureDataUrl}
                    variant="zen"
                    className="gap-2"
                >
                    {isSaving ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                    ) : (
                        <><FileSignature className="h-4 w-4" /> Firmar y Guardar</>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default ConsentFormView;
