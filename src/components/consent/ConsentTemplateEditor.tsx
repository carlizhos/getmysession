import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    FileText, Upload, Save, Loader2, CheckCircle2,
    AlertCircle, RotateCcw, FileUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Default texts (fallback when no custom template saved) ──────────────────
export const DEFAULT_CONSENT_TEXTS: Record<string, { title: string; body: string }> = {
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
Tengo derecho a Acceder, Rectificar, Cancelar u Oponerne al tratamiento de mis datos personales, mediante solicitud escrita al responsable del tratamiento.

CONSERVACIÓN: Mis datos serán conservados por un mínimo de 5 años conforme a la normativa aplicable.

Declaro que la información proporcionada es verídica y que he leído el Aviso de Privacidad disponible en consulta.`,
    },
};

type TemplateKey = 'general' | 'tratamiento' | 'datos_personales';

const TYPE_LABELS: Record<TemplateKey, string> = {
    general: 'Consentimiento General',
    tratamiento: 'Tratamiento Psicológico',
    datos_personales: 'Datos Personales (LFPDPPP)',
};

interface ConsentTemplateEditorProps {
    onTemplatesLoaded?: (templates: Record<string, { title: string; body: string }>) => void;
}

const ConsentTemplateEditor = ({ onTemplatesLoaded }: ConsentTemplateEditorProps) => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedType, setSelectedType] = useState<TemplateKey>('general');
    const [templates, setTemplates] = useState<Record<string, { title: string; body: string }>>(
        JSON.parse(JSON.stringify(DEFAULT_CONSENT_TEXTS))
    );
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // ── Load saved templates from profile ───────────────────────────────────
    const loadTemplates = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('consent_templates')
                .eq('id', user.id)
                .single();

            if (data?.consent_templates && Object.keys(data.consent_templates).length > 0) {
                // Merge saved templates over defaults (preserves any default key not yet customized)
                const merged = { ...DEFAULT_CONSENT_TEXTS, ...data.consent_templates };
                setTemplates(merged);
                onTemplatesLoaded?.(merged);
            } else {
                onTemplatesLoaded?.(DEFAULT_CONSENT_TEXTS);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, onTemplatesLoaded]);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);

    const currentTemplate = templates[selectedType] ?? DEFAULT_CONSENT_TEXTS[selectedType];

    const updateCurrentTemplate = (field: 'title' | 'body', value: string) => {
        setTemplates(prev => ({
            ...prev,
            [selectedType]: { ...prev[selectedType], [field]: value },
        }));
        setIsDirty(true);
        setSaved(false);
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    consent_templates: templates,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });

            if (error) throw error;
            setSaved(true);
            setIsDirty(false);
            onTemplatesLoaded?.(templates);
            toast.success('Plantilla guardada correctamente');
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            toast.error('Error al guardar plantilla: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Reset to default ─────────────────────────────────────────────────────
    const handleReset = () => {
        setTemplates(prev => ({
            ...prev,
            [selectedType]: { ...DEFAULT_CONSENT_TEXTS[selectedType] },
        }));
        setIsDirty(true);
        setSaved(false);
        toast.info('Texto restaurado al predeterminado — guarda para aplicar el cambio');
    };

    // ── File upload & text extraction ────────────────────────────────────────
    const extractTextFromFile = async (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') {
            return await extractPDF(file);
        } else if (ext === 'docx') {
            return await extractDOCX(file);
        } else if (ext === 'doc') {
            toast.error('El formato .doc antiguo no es compatible. Por favor convierte el archivo a .docx o .pdf');
            return null;
        } else {
            toast.error('Formato no soportado. Usa .pdf o .docx');
            return null;
        }
    };

    const extractPDF = async (file: File): Promise<string | null> => {
        try {
            // Lazy-load pdfjs-dist to keep initial bundle small
            const pdfjsLib = await import('pdfjs-dist');
            // Set worker source — use CDN to avoid bundler issues
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += pageText + '\n';
            }
            return fullText.trim() || null;
        } catch (err) {
            console.error('PDF extraction error:', err);
            toast.error('No se pudo extraer el texto del PDF. Asegúrate de que el archivo no esté protegido.');
            return null;
        }
    };

    const extractDOCX = async (file: File): Promise<string | null> => {
        try {
            const mammoth = await import('mammoth');
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value.trim() || null;
        } catch (err) {
            console.error('DOCX extraction error:', err);
            toast.error('No se pudo extraer el texto del archivo DOCX.');
            return null;
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input so same file can be re-selected
        e.target.value = '';

        setIsExtracting(true);
        try {
            const text = await extractTextFromFile(file);
            if (text) {
                updateCurrentTemplate('body', text);
                toast.success(`Texto extraído de "${file.name}" — revisa y ajusta antes de guardar`);
            }
        } finally {
            setIsExtracting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Type selector */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="space-y-1.5 flex-1 min-w-0">
                    <Label>Tipo de plantilla</Label>
                    <Select value={selectedType} onValueChange={(v) => setSelectedType(v as TemplateKey)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(TYPE_LABELS) as TemplateKey[]).map(key => (
                                <SelectItem key={key} value={key}>
                                    {TYPE_LABELS[key]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Upload button */}
                <div className="flex gap-2 flex-shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isExtracting}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {isExtracting
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Extrayendo...</>
                            : <><FileUp className="h-4 w-4" /> Subir PDF / DOCX</>
                        }
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={handleReset}
                        title="Restaurar texto predeterminado"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restablecer
                    </Button>
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {/* Upload hint */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                <Upload className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                    Sube un <strong>.pdf</strong> o <strong>.docx</strong> con tu propio texto y se extraerá automáticamente para editarlo aquí.
                    El formato <strong>.doc</strong> (Word antiguo) no es compatible — conviértelo primero.
                </span>
            </div>

            {/* Title field */}
            <div className="space-y-1.5">
                <Label htmlFor="template-title" className="text-sm">Título del documento</Label>
                <Input
                    id="template-title"
                    value={currentTemplate.title}
                    onChange={(e) => updateCurrentTemplate('title', e.target.value)}
                    placeholder="Ej: Consentimiento Informado General"
                />
            </div>

            {/* Body textarea */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="template-body" className="text-sm">Texto del consentimiento</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {currentTemplate.body.length} caracteres
                    </span>
                </div>
                <Textarea
                    id="template-body"
                    value={currentTemplate.body}
                    onChange={(e) => updateCurrentTemplate('body', e.target.value)}
                    rows={16}
                    className="font-mono text-sm leading-relaxed resize-y"
                    placeholder="Escribe o pega el texto del consentimiento aquí..."
                />
            </div>

            {/* Dirty indicator + Save */}
            <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2 text-xs">
                    {isDirty && !saved && (
                        <span className="flex items-center gap-1 text-warning">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Cambios sin guardar
                        </span>
                    )}
                    {saved && (
                        <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Guardado
                        </span>
                    )}
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !isDirty}
                    variant="zen"
                    size="sm"
                    className="gap-2"
                >
                    {isSaving
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                        : saved
                            ? <><CheckCircle2 className="h-4 w-4" /> Guardado</>
                            : <><Save className="h-4 w-4" /> Guardar plantilla</>
                    }
                </Button>
            </div>
        </div>
    );
};

export default ConsentTemplateEditor;
