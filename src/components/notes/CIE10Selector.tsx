import { useState, useRef, useEffect } from 'react';
import { DiagnosticSelector, DiagnosticValue } from './DiagnosticSelector';
import { findDiagnosticByCie10 } from '@/lib/dsm5Catalog';

// ── Catálogo CIE-10 Capítulo V (Trastornos Mentales y del Comportamiento) ───
// MinSalud Colombia (Res. 2275/2023 RIPS y Res. 1995/1999): Usar codificación CIE-10 en historia clínica
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

export interface CIE10SelectorProps {
    value?: { code: string; description: string } | DiagnosticValue | null;
    onChange?: (value: any) => void;
    onSelect?: (value: any) => void;
    disabled?: boolean;
}

const CIE10Selector = ({ value, onChange, onSelect, disabled }: CIE10SelectorProps) => {
    // Adaptar valor entrante al formato DiagnosticValue
    const adaptedValue: DiagnosticValue | null = value ? {
        cie10Code: (value as any).cie10Code || (value as any).code || null,
        cie10Description: (value as any).cie10Description || (value as any).description || null,
        dsm5Code: (value as any).dsm5Code || (value as any).code ? findDiagnosticByCie10((value as any).code || (value as any).cie10Code)?.dsm5Code : null,
        dsm5Description: (value as any).dsm5Description || (value as any).code ? findDiagnosticByCie10((value as any).code || (value as any).cie10Code)?.dsm5Title : null,
    } : null;

    const handleChange = (diag: DiagnosticValue | null) => {
        const legacyVal = diag ? {
            code: diag.cie10Code || '',
            description: diag.cie10Description || '',
            dsm5Code: diag.dsm5Code,
            dsm5Description: diag.dsm5Description,
            cie10Code: diag.cie10Code,
            cie10Description: diag.cie10Description,
        } : null;

        if (onChange) onChange(legacyVal);
        if (onSelect) onSelect(legacyVal);
    };

    return (
        <DiagnosticSelector
            value={adaptedValue}
            onChange={handleChange}
            disabled={disabled}
        />
    );
};

export default CIE10Selector;
