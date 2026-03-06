import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Catálogo CIE-10 Capítulo V (Trastornos Mentales y del Comportamiento) ───
// NOM-024-SSA3-2012 INT-01: Usar codificación CIE-10 en expediente clínico
export const CIE10_MENTAL_HEALTH: { code: string; description: string; group: string }[] = [
    // Trastornos del humor (afectivos)
    { code: 'F31.0', description: 'Trastorno bipolar, episodio hipomaníaco', group: 'Trastornos del humor' },
    { code: 'F31.1', description: 'Trastorno bipolar, episodio maníaco sin síntomas psicóticos', group: 'Trastornos del humor' },
    { code: 'F31.2', description: 'Trastorno bipolar, episodio maníaco con síntomas psicóticos', group: 'Trastornos del humor' },
    { code: 'F31.3', description: 'Trastorno bipolar, episodio depresivo leve o moderado', group: 'Trastornos del humor' },
    { code: 'F31.4', description: 'Trastorno bipolar, episodio depresivo grave sin síntomas psicóticos', group: 'Trastornos del humor' },
    { code: 'F31.5', description: 'Trastorno bipolar, episodio depresivo grave con síntomas psicóticos', group: 'Trastornos del humor' },
    { code: 'F32.0', description: 'Episodio depresivo leve', group: 'Trastornos del humor' },
    { code: 'F32.1', description: 'Episodio depresivo moderado', group: 'Trastornos del humor' },
    { code: 'F32.2', description: 'Episodio depresivo grave sin síntomas psicóticos', group: 'Trastornos del humor' },
    { code: 'F32.3', description: 'Episodio depresivo grave con síntomas psicóticos', group: 'Trastornos del humor' },
    { code: 'F33.0', description: 'Trastorno depresivo recurrente, episodio actual leve', group: 'Trastornos del humor' },
    { code: 'F33.1', description: 'Trastorno depresivo recurrente, episodio actual moderado', group: 'Trastornos del humor' },
    { code: 'F33.2', description: 'Trastorno depresivo recurrente, episodio actual grave sin síntomas psicóticos', group: 'Trastornos del humor' },
    { code: 'F34.1', description: 'Distimia', group: 'Trastornos del humor' },

    // Trastornos de ansiedad
    { code: 'F40.0', description: 'Agorafobia sin trastorno de pánico', group: 'Trastornos de ansiedad' },
    { code: 'F40.1', description: 'Fobias sociales', group: 'Trastornos de ansiedad' },
    { code: 'F40.2', description: 'Fobias específicas (aisladas)', group: 'Trastornos de ansiedad' },
    { code: 'F41.0', description: 'Trastorno de pánico (ansiedad paroxística episódica)', group: 'Trastornos de ansiedad' },
    { code: 'F41.1', description: 'Trastorno de ansiedad generalizada', group: 'Trastornos de ansiedad' },
    { code: 'F41.2', description: 'Trastorno mixto ansioso-depresivo', group: 'Trastornos de ansiedad' },
    { code: 'F42', description: 'Trastorno obsesivo-compulsivo (TOC)', group: 'Trastornos de ansiedad' },
    { code: 'F43.0', description: 'Reacción al estrés agudo', group: 'Trastornos de ansiedad' },
    { code: 'F43.1', description: 'Trastorno de estrés postraumático (TEPT)', group: 'Trastornos de ansiedad' },
    { code: 'F43.2', description: 'Trastornos de adaptación', group: 'Trastornos de ansiedad' },

    // Trastornos de la conducta alimentaria
    { code: 'F50.0', description: 'Anorexia nerviosa', group: 'Conducta alimentaria' },
    { code: 'F50.2', description: 'Bulimia nerviosa', group: 'Conducta alimentaria' },
    { code: 'F50.8', description: 'Otros trastornos de la conducta alimentaria', group: 'Conducta alimentaria' },

    // Trastornos de personalidad
    { code: 'F60.0', description: 'Trastorno de personalidad paranoide', group: 'Trastornos de personalidad' },
    { code: 'F60.1', description: 'Trastorno de personalidad esquizoide', group: 'Trastornos de personalidad' },
    { code: 'F60.2', description: 'Trastorno de personalidad antisocial (disocial)', group: 'Trastornos de personalidad' },
    { code: 'F60.3', description: 'Trastorno de personalidad emocionalmente inestable — tipo límite (TLP)', group: 'Trastornos de personalidad' },
    { code: 'F60.4', description: 'Trastorno de personalidad histriónico', group: 'Trastornos de personalidad' },
    { code: 'F60.5', description: 'Trastorno de personalidad anancástico (obsesivo)', group: 'Trastornos de personalidad' },
    { code: 'F60.6', description: 'Trastorno de personalidad ansioso (evitativo)', group: 'Trastornos de personalidad' },
    { code: 'F60.7', description: 'Trastorno de personalidad dependiente', group: 'Trastornos de personalidad' },
    { code: 'F60.8', description: 'Trastorno de personalidad narcisista', group: 'Trastornos de personalidad' },

    // Psicóticos
    { code: 'F20.0', description: 'Esquizofrenia paranoide', group: 'Trastornos psicóticos' },
    { code: 'F20.1', description: 'Esquizofrenia hebefrénica', group: 'Trastornos psicóticos' },
    { code: 'F20.3', description: 'Esquizofrenia indiferenciada', group: 'Trastornos psicóticos' },
    { code: 'F22.0', description: 'Trastorno de ideas delirantes', group: 'Trastornos psicóticos' },
    { code: 'F25.0', description: 'Trastorno esquizoafectivo de tipo maníaco', group: 'Trastornos psicóticos' },
    { code: 'F25.1', description: 'Trastorno esquizoafectivo de tipo depresivo', group: 'Trastornos psicóticos' },

    // TDAH / Desarrollo
    { code: 'F90.0', description: 'Perturbación de la actividad y de la atención (TDAH predominantemente inatento)', group: 'Desarrollo / Infantil' },
    { code: 'F90.1', description: 'Trastorno hipercinético de la conducta (TDAH combinado)', group: 'Desarrollo / Infantil' },
    { code: 'F84.0', description: 'Autismo infantil (TEA)', group: 'Desarrollo / Infantil' },
    { code: 'F84.5', description: 'Síndrome de Asperger', group: 'Desarrollo / Infantil' },

    // Uso de sustancias
    { code: 'F10.1', description: 'Uso nocivo de alcohol', group: 'Sustancias psicoactivas' },
    { code: 'F10.2', description: 'Síndrome de dependencia al alcohol', group: 'Sustancias psicoactivas' },
    { code: 'F11.1', description: 'Uso nocivo de opioides', group: 'Sustancias psicoactivas' },
    { code: 'F12.1', description: 'Uso nocivo de cannabinoides', group: 'Sustancias psicoactivas' },
    { code: 'F14.1', description: 'Uso nocivo de cocaína', group: 'Sustancias psicoactivas' },

    // Sueño
    { code: 'F51.0', description: 'Insomnio no orgánico', group: 'Trastornos del sueño' },
    { code: 'F51.5', description: 'Pesadillas', group: 'Trastornos del sueño' },

    // Somatomorfos / Disociativos
    { code: 'F44.0', description: 'Amnesia disociativa', group: 'Disociativos / Somatomorfos' },
    { code: 'F44.1', description: 'Fuga disociativa', group: 'Disociativos / Somatomorfos' },
    { code: 'F44.8', description: 'Trastorno disociativo (conversión) NOS', group: 'Disociativos / Somatomorfos' },
    { code: 'F45.0', description: 'Trastorno de somatización', group: 'Disociativos / Somatomorfos' },
    { code: 'F45.2', description: 'Trastorno hipocondríaco', group: 'Disociativos / Somatomorfos' },
    { code: 'F48.0', description: 'Neurastenia (síndrome de fatiga)', group: 'Disociativos / Somatomorfos' },

    // Duelo / Situacional
    { code: 'Z63.4', description: 'Desaparición o muerte de un familiar', group: 'Factores psicosociales' },
    { code: 'Z73.0', description: 'Agotamiento (burnout)', group: 'Factores psicosociales' },
    { code: 'Z73.1', description: 'Acentuación de rasgos de personalidad', group: 'Factores psicosociales' },
];

interface CIE10SelectorProps {
    value?: { code: string; description: string } | null;
    onChange: (value: { code: string; description: string } | null) => void;
    disabled?: boolean;
}

const CIE10Selector = ({ value, onChange, disabled }: CIE10SelectorProps) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = query.length >= 2
        ? CIE10_MENTAL_HEALTH.filter(item =>
            item.code.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase()) ||
            item.group.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 12)
        : [];

    const handleSelect = (item: typeof CIE10_MENTAL_HEALTH[0]) => {
        onChange({ code: item.code, description: item.description });
        setQuery('');
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange(null);
        setQuery('');
    };

    return (
        <div className="space-y-2" ref={ref}>
            {/* Valor seleccionado */}
            {value ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-primary/5 border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="font-mono font-semibold text-primary text-sm">{value.code}</span>
                        <span className="text-sm text-muted-foreground ml-2 truncate">{value.description}</span>
                    </div>
                    {!disabled && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={handleClear}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar código o diagnóstico CIE-10 (ej: F41.1, ansiedad...)"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        className="pl-9"
                        disabled={disabled}
                    />
                </div>
            )}

            {/* Dropdown de resultados */}
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-50 w-full max-w-lg rounded-lg border bg-popover shadow-lg overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                        {filtered.map((item) => (
                            <button
                                key={item.code}
                                type="button"
                                className={cn(
                                    "w-full text-left px-3 py-2.5 text-sm",
                                    "hover:bg-accent transition-colors",
                                    "flex items-start gap-3 border-b border-border/40 last:border-0"
                                )}
                                onClick={() => handleSelect(item)}
                            >
                                <span className="font-mono font-semibold text-primary flex-shrink-0 mt-0.5 text-xs bg-primary/10 px-1.5 py-0.5 rounded">
                                    {item.code}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate">{item.description}</p>
                                    <p className="text-xs text-muted-foreground">{item.group}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    {query.length >= 2 && filtered.length === 0 && (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                            Sin resultados para "{query}"
                        </div>
                    )}
                </div>
            )}

            {!value && query.length < 2 && (
                <p className="text-xs text-muted-foreground">
                    Escribe al menos 2 caracteres para buscar. Catálogo Capítulo V CIE-10 (F00–F99).
                </p>
            )}
        </div>
    );
};

export default CIE10Selector;
