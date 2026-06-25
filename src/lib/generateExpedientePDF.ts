import jsPDF from 'jspdf';
import { format, differenceInYears, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface PatientData {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    curp?: string;
    gender?: string;
    occupation?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notes?: string;
    tags?: string[];
}

export interface SessionNoteData {
    id: string;
    date: string;
    session_number: number;
    mood?: { rating?: number; notes?: string };
    bridge?: { homework_review?: string; notes?: string };
    agenda?: { 
        topic?: string; 
        notes?: string; 
        resolved?: boolean; 
        situation?: string; 
        thoughts?: string; 
        emotions?: string; 
        interventions?: string; 
    }[];
    beliefs?: { 
        belief?: string; 
        evidence_for?: string; 
        evidence_against?: string; 
        alternative?: string; 
        core?: string; 
    };
    action_plan?: { task?: string; completed?: boolean }[];
    cie10_code?: string;
    cie10_description?: string;
    diagnostico_principal?: string;
    transcript_summary?: string;
}

export interface ConsentData {
    id: string;
    form_type: string;
    signed_at?: string;
    is_valid: boolean;
}

export interface ProfessionalData {
    full_name?: string;
    prefix?: string;
    cedulas?: { numero: string; tipo: string; institucion?: string }[];
    signature_data?: string | null;
    logo_data?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const FORM_TYPE_LABELS: Record<string, string> = {
    general: 'Consentimiento Informado General',
    tratamiento: 'Tratamiento Psicológico',
    datos_personales: 'Datos Personales (LFPDPPP)',
};

const GENDER_LABELS: Record<string, string> = {
    M: 'Masculino', F: 'Femenino', otro: 'No especificado',
};

function stripHtml(html: string): string {
    if (!html) return '';
    let text = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, ''); // strip all other tags
    
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    return text.trim();
}

function safeFormatDate(dateVal: any, formatStr: string, options?: any): string {
    if (!dateVal) return '—';
    try {
        const d = typeof dateVal === 'string' ? parseISO(dateVal) : new Date(dateVal);
        if (!isValid(d)) {
            const d2 = new Date(dateVal);
            if (!isValid(d2)) return '—';
            return format(d2, formatStr, options);
        }
        return format(d, formatStr, options);
    } catch (e) {
        console.error('Error formatting date:', dateVal, e);
        return '—';
    }
}

function safeDifferenceInYears(dateLeft: any, dateRight: any): string {
    if (!dateLeft || !dateRight) return '—';
    try {
        const dLeft = typeof dateLeft === 'string' ? parseISO(dateLeft) : new Date(dateLeft);
        const dRight = typeof dateRight === 'string' ? parseISO(dateRight) : new Date(dateRight);
        if (!isValid(dLeft) || !isValid(dRight)) {
            const dLeft2 = new Date(dateLeft);
            const dRight2 = new Date(dateRight);
            if (!isValid(dLeft2) || !isValid(dRight2)) return '—';
            return `${differenceInYears(dLeft2, dRight2)}`;
        }
        return `${differenceInYears(dLeft, dRight)}`;
    } catch (e) {
        console.error('Error calculating age difference:', e);
        return '—';
    }
}

function addWrappedText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    pageHeight: number,
    margin: number,
    onNewPage: () => number,
    fontName = 'helvetica',
    fontStyle = 'normal',
    fontSize = 9.5,
    r = 50,
    g = 50,
    b = 50
): number {
    const cleanedText = stripHtml(text);
    const lines = doc.splitTextToSize(cleanedText || '—', maxWidth);
    for (const line of lines) {
        if (y > pageHeight - margin) {
            y = onNewPage();
            doc.setFont(fontName, fontStyle);
            doc.setFontSize(fontSize);
            doc.setTextColor(r, g, b);
        }
        doc.text(line, x, y);
        y += lineHeight;
    }
    return y;
}

// ── Generador principal ────────────────────────────────────────────────────
export function generateExpedientePDF(
    patient: PatientData,
    notes: SessionNoteData[],
    consents: ConsentData[],
    professional?: ProfessionalData,
): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    const folio = patient.id.substring(0, 8).toUpperCase();
    const generatedAt = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });
    let pageNum = 1;

    // ── Función: añadir nueva página con cabecera ──
    const addPage = (): number => {
        doc.addPage();
        pageNum++;
        renderHeader();
        return margin + 18;
    };

    // ── Cabecera de cada página ──
    const renderHeader = () => {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 160);
        doc.setFont('helvetica', 'normal');
        
        if (professional?.logo_data) {
            try {
                doc.addImage(professional.logo_data, 'PNG', pageW - margin - 22, 3.5, 22, 8);
                doc.text('NOM-024-SSA3-2012 | Expediente Clínico Electrónico', margin, 10);
                doc.text(`${patient.name} | Folio: ${folio}`, pageW - margin - 24, 10, { align: 'right' });
            } catch (e) {
                console.error("Error al renderizar logotipo en cabecera de PDF:", e);
                doc.text('NOM-024-SSA3-2012 | Expediente Clínico Electrónico', margin, 10);
                doc.text(`${patient.name} | Folio: ${folio}`, pageW - margin, 10, { align: 'right' });
            }
        } else {
            doc.text('NOM-024-SSA3-2012 | Expediente Clínico Electrónico', margin, 10);
            doc.text(`${patient.name} | Folio: ${folio}`, pageW - margin, 10, { align: 'right' });
        }

        doc.setDrawColor(220, 220, 230);
        doc.line(margin, 13, pageW - margin, 13);
    };

    // ── Pie de cada página ──
    const renderFooters = (total: number) => {
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setTextColor(160, 160, 170);
            doc.text(
                `Documento generado electrónicamente. Saudade © ${new Date().getFullYear()} | Página ${i} de ${total}`,
                pageW / 2,
                pageH - 8,
                { align: 'center' },
            );
        }
    };

    // ═══════════════════════════════════════════════════════
    // PÁGINA 1 — PORTADA / DATOS DEL PACIENTE
    // ═══════════════════════════════════════════════════════
    renderHeader();

    // Banda de título
    doc.setFillColor(95, 70, 155);
    doc.roundedRect(margin, 18, contentW, 22, 3, 3, 'F');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('EXPEDIENTE CLÍNICO COMPLETO', pageW / 2, 31, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${generatedAt}`, pageW / 2, 37, { align: 'center' });

    let y = 50;

    // ── Sección: Datos del paciente ──
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 60);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL PACIENTE', margin, y);
    doc.setDrawColor(95, 70, 155);
    doc.line(margin, y + 1.5, margin + 55, y + 1.5);
    y += 7;

    const age = patient.date_of_birth
        ? `${safeDifferenceInYears(new Date(), patient.date_of_birth)} años`
        : '—';

    const infoRows = [
        ['Nombre completo', patient.name || '—'],
        ['Edad', age],
        ['Fecha de nacimiento', safeFormatDate(patient.date_of_birth, 'd MMM yyyy', { locale: es })],
        ['CURP', patient.curp || '—'],
        ['Género', patient.gender ? (GENDER_LABELS[patient.gender] || patient.gender) : '—'],
        ['Ocupación', patient.occupation || '—'],
        ['Correo electrónico', patient.email || '—'],
        ['Teléfono', patient.phone || '—'],
        ['Contacto de emergencia', patient.emergency_contact_name || '—'],
        ['Tel. emergencia', patient.emergency_contact_phone || '—'],
    ];

    doc.setFontSize(9.5);
    for (const [label, value] of infoRows) {
        if (y > pageH - margin) y = addPage();
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 100);
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(value, margin + 55, y);
        y += 6;
    }

    // Etiquetas
    if (patient.tags && patient.tags.length > 0) {
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 100);
        doc.text('Etiquetas:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(patient.tags.join(', '), margin + 55, y);
        y += 6;
    }

    // Notas administrativas
    if (patient.notes) {
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 100);
        doc.text('Notas administrativas:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        y = addWrappedText(doc, patient.notes, margin + 4, y, contentW - 4, 5, pageH, margin, addPage);
    }

    // ── Sección: Resumen diagnóstico (último CIE-10) ──
    const lastNote = notes.find(n => n.cie10_code);
    if (lastNote) {
        y += 6;
        if (y > pageH - margin) y = addPage();

        doc.setFontSize(10);
        doc.setTextColor(30, 30, 60);
        doc.setFont('helvetica', 'bold');
        doc.text('DIAGNÓSTICO PRINCIPAL (CIE-10)', margin, y);
        doc.setDrawColor(95, 70, 155);
        doc.line(margin, y + 1.5, margin + 75, y + 1.5);
        y += 7;

        doc.setFontSize(9.5);
        doc.setTextColor(80, 80, 100);
        doc.setFont('helvetica', 'bold');
        doc.text('Código:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(lastNote.cie10_code || '—', margin + 25, y);
        y += 6;

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 100);
        doc.text('Descripción:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        y = addWrappedText(doc, lastNote.cie10_description || '—', margin + 35, y, contentW - 35, 5, pageH, margin, addPage);

        if (lastNote.diagnostico_principal) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Notas clínicas:', margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            y = addWrappedText(doc, lastNote.diagnostico_principal, margin + 4, y, contentW - 4, 5, pageH, margin, addPage);
        }
    }

    // ═══════════════════════════════════════════════════════
    // HISTORIAL DE SESIONES
    // ═══════════════════════════════════════════════════════
    y += 8;
    if (y > pageH - 40) { y = addPage(); } else {
        if (y > pageH - margin) y = addPage();
    }

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(`HISTORIAL DE SESIONES (${notes.length} sesión${notes.length !== 1 ? 'es' : ''})`, margin, y);
    doc.setDrawColor(95, 70, 155);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 8;

    const sortedNotes = [...notes].sort((a, b) => a.session_number - b.session_number);

    for (const note of sortedNotes) {
        if (y > pageH - 40) y = addPage();

        // Recuadro sesión
        doc.setFillColor(245, 243, 255);
        doc.setDrawColor(200, 190, 230);
        doc.roundedRect(margin, y - 4, contentW, 8, 2, 2, 'FD');
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 40, 120);
        doc.text(
            `Sesión #${note.session_number}  ·  ${safeFormatDate(note.date, "d 'de' MMMM yyyy", { locale: es })}`,
            margin + 3, y + 1,
        );
        y += 10;

        // Ánimo
        if (note.mood?.rating != null) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Estado de ánimo:', margin + 3, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            const moodBar = `${'█'.repeat(Math.round(note.mood.rating / 10))}${'░'.repeat(10 - Math.round(note.mood.rating / 10))} ${note.mood.rating}/100`;
            doc.text(moodBar, margin + 42, y);
            y += 5.5;
            if (note.mood.notes) {
                y = addWrappedText(doc, note.mood.notes, margin + 6, y, contentW - 6, 5, pageH, margin, addPage);
            }
        }

        // Revisión de tarea (bridge)
        if (note.bridge?.homework_review || note.bridge?.notes) {
            if (y > pageH - margin) y = addPage();
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Revisión de tarea anterior:', margin + 3, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            y = addWrappedText(doc, note.bridge.homework_review || note.bridge.notes || '', margin + 6, y, contentW - 6, 5, pageH, margin, addPage);
        }

        // Agenda / Temas
        if (note.agenda && note.agenda.length > 0) {
            if (y > pageH - margin) y = addPage();
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Temas trabajados:', margin + 3, y);
            y += 5;
            for (const item of note.agenda) {
                if (!item.topic && !item.notes && !item.thoughts) continue;
                if (y > pageH - margin) y = addPage();
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(40, 40, 40);
                const topicTitle = item.topic ? `• ${item.topic}` : '• Desarrollo';
                y = addWrappedText(doc, topicTitle, margin + 6, y, contentW - 6, 5, pageH, margin, addPage);

                const details = [];
                if (item.situation) details.push(`Situación: ${item.situation}`);
                if (item.thoughts) details.push(`Pensamientos: ${item.thoughts}`);
                if (item.emotions) details.push(`Emociones: ${item.emotions}`);
                if (item.interventions) details.push(`Intervenciones: ${item.interventions}`);
                if (item.notes) details.push(`Notas: ${item.notes}`);

                if (details.length > 0) {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(70, 70, 70);
                    for (const detail of details) {
                        if (y > pageH - margin) y = addPage();
                        y = addWrappedText(doc, `  ${detail}`, margin + 9, y, contentW - 9, 5, pageH, margin, addPage);
                    }
                }
            }
        }

        // Reporte de sesión / Resumen IA
        if (note.transcript_summary) {
            if (y > pageH - margin) y = addPage();
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Reporte de sesión / Resumen:', margin + 3, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            y = addWrappedText(doc, note.transcript_summary, margin + 6, y, contentW - 6, 5, pageH, margin, addPage);
        }

        // Creencias / Ideas nucleares
        if (note.beliefs?.core || note.beliefs?.belief) {
            if (y > pageH - margin) y = addPage();
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Creencias / Flexibilidad Cognitiva:', margin + 3, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            const coreVal = note.beliefs.core || note.beliefs.belief || '';
            const altVal = note.beliefs.alternative || '';
            y = addWrappedText(doc, `Creencia nuclear: ${coreVal}${altVal ? `\nAlternativa: ${altVal}` : ''}`, margin + 6, y, contentW - 6, 5, pageH, margin, addPage);
        }

        // CIE-10 de esta sesión
        if (note.cie10_code) {
            if (y > pageH - margin) y = addPage();
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text(`Diagnóstico CIE-10: `, margin + 3, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            doc.text(`${note.cie10_code} — ${note.cie10_description || ''}`, margin + 42, y);
            y += 5.5;
        }

        // Impresión diagnóstica / Plan de tratamiento de esta sesión
        if (note.diagnostico_principal) {
            if (y > pageH - margin) y = addPage();
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Impresión Diagnóstica / Plan:', margin + 3, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            y = addWrappedText(doc, note.diagnostico_principal, margin + 6, y, contentW - 6, 5, pageH, margin, addPage);
        }

        // Plan de acción
        if (note.action_plan && note.action_plan.length > 0) {
            if (y > pageH - margin) y = addPage();
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Tareas y Seguimiento:', margin + 3, y);
            y += 5;
            for (const task of note.action_plan) {
                if (!task.task) continue;
                if (y > pageH - margin) y = addPage();
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(40, 40, 40);
                const checkbox = task.completed ? '[✓]' : '[ ]';
                y = addWrappedText(doc, `${checkbox} ${task.task}`, margin + 6, y, contentW - 6, 5, pageH, margin, addPage);
            }
        }

        y += 6;
    }

    if (notes.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(130, 130, 140);
        doc.text('Sin sesiones registradas.', margin + 4, y);
        y += 8;
    }

    // ═══════════════════════════════════════════════════════
    // CONSENTIMIENTOS
    // ═══════════════════════════════════════════════════════
    y += 4;
    if (y > pageH - 30) y = addPage();

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(`CONSENTIMIENTOS INFORMADOS (${consents.length})`, margin, y);
    doc.setDrawColor(95, 70, 155);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 8;

    if (consents.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(130, 130, 140);
        doc.text('Sin consentimientos registrados.', margin + 4, y);
    } else {
        for (const c of consents) {
            if (y > pageH - margin) y = addPage();
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);
            const label = FORM_TYPE_LABELS[c.form_type] || c.form_type;
            const dateStr = c.signed_at ? format(new Date(c.signed_at), "d MMM yyyy", { locale: es }) : 'Sin fecha';
            const valid = c.is_valid ? '✓ Válido' : '✗ Revocado';
            const folioCons = c.id.substring(0, 8).toUpperCase();
            doc.text(`• ${label}  |  ${dateStr}  |  ${valid}  |  Folio: ${folioCons}`, margin + 3, y);
            y += 6;
        }
    }

    // ═══════════════════════════════════════════════════════
    // FIRMA PROFESIONAL
    // ═══════════════════════════════════════════════════════
    if (professional) {
        y += 10;
        if (y > pageH - 80) y = addPage();

        // Línea decorativa superior
        doc.setDrawColor(95, 70, 155);
        doc.setLineWidth(0.5);
        doc.line(margin + 30, y, pageW - margin - 30, y);
        y += 8;

        // Firma imagen
        if (professional.signature_data) {
            try {
                const sigW = 50;
                const sigH = 20;
                const sigX = (pageW - sigW) / 2;
                doc.addImage(professional.signature_data, 'PNG', sigX, y, sigW, sigH);
                y += sigH + 4;
            } catch (e) {
                console.error('Error adding signature to PDF:', e);
                y += 4;
            }
        }

        // Línea de firma
        doc.setDrawColor(60, 40, 120);
        doc.setLineWidth(0.3);
        doc.line(pageW / 2 - 35, y, pageW / 2 + 35, y);
        y += 5;

        // Nombre con prefijo
        const displayName = [professional.prefix, professional.full_name].filter(Boolean).join(' ');
        if (displayName) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 60);
            doc.text(displayName, pageW / 2, y, { align: 'center' });
            y += 5;
        }

        // Cédulas
        if (professional.cedulas && professional.cedulas.length > 0) {
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 100);
            for (const ced of professional.cedulas) {
                const cedText = `Céd. Prof. ${ced.numero} · ${ced.tipo?.charAt(0).toUpperCase()}${ced.tipo?.slice(1) || ''}`;
                doc.text(cedText, pageW / 2, y, { align: 'center' });
                y += 4.5;
            }
        }
    }

    // ── Pie de todas las páginas ──
    renderFooters(doc.getNumberOfPages());

    // ── Guardar ──
    doc.save(`expediente_${patient.name.replace(/\s+/g, '_')}_${folio}.pdf`);
}

/**
 * Genera un PDF profesional para una nota de sesión individual.
 */
export function generateSessionNotePDF(
    patient: { name: string; id: string; date_of_birth?: string },
    note: SessionNoteData,
    professional?: ProfessionalData
): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    const folio = patient.id.substring(0, 8).toUpperCase();
    const generatedAt = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });

    // Cabecera
    const renderHeader = () => {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 160);
        doc.setFont('helvetica', 'normal');
        
        if (professional?.logo_data) {
            try {
                doc.addImage(professional.logo_data, 'PNG', pageW - margin - 22, 3.5, 22, 8);
                doc.text('NOM-024-SSA3-2012 | Nota de Evolución Clínica', margin, 10);
                doc.text(`${patient.name} | Folio: ${folio}`, pageW - margin - 24, 10, { align: 'right' });
            } catch (e) {
                console.error("Error al renderizar logotipo en cabecera de PDF:", e);
                doc.text('NOM-024-SSA3-2012 | Nota de Evolución Clínica', margin, 10);
                doc.text(`${patient.name} | Folio: ${folio}`, pageW - margin, 10, { align: 'right' });
            }
        } else {
            doc.text('NOM-024-SSA3-2012 | Nota de Evolución Clínica', margin, 10);
            doc.text(`${patient.name} | Folio: ${folio}`, pageW - margin, 10, { align: 'right' });
        }

        doc.setDrawColor(220, 220, 230);
        doc.line(margin, 13, pageW - margin, 13);
    };

    const addPage = (): number => {
        doc.addPage();
        renderHeader();
        return margin + 18;
    };

    renderHeader();

    // Título
    doc.setFillColor(95, 70, 155);
    doc.roundedRect(margin, 18, contentW, 20, 3, 3, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(`NOTA DE SESIÓN #${note.session_number}`, pageW / 2, 28, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de sesión: ${safeFormatDate(note.date, "d 'de' MMMM yyyy", { locale: es })}`, pageW / 2, 34, { align: 'center' });

    let y = 50;

    // Datos generales
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 60);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN GENERAL', margin, y);
    doc.line(margin, y + 1.5, margin + 45, y + 1.5);
    y += 8;

    const dob = patient.date_of_birth;
    const age = dob
        ? `${safeDifferenceInYears(new Date(), dob)} años`
        : '—';
    const dobFormatted = safeFormatDate(dob, 'd MMM yyyy', { locale: es });

    doc.setFontSize(9);

    // Fila 1: Paciente y Edad
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 100);
    doc.text('Paciente:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(patient.name, margin + 35, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 100);
    doc.text('Edad:', margin + 105, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(age, margin + 140, y);
    y += 6;

    // Fila 2: Fecha Nac. y Fecha Sesión
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 100);
    doc.text('F. de Nacimiento:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(dobFormatted, margin + 35, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 100);
    doc.text('Fecha Sesión:', margin + 105, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(safeFormatDate(note.date, "d 'de' MMMM yyyy", { locale: es }), margin + 140, y);
    y += 6;

    // Fila 3: Número de Sesión y Diagnóstico
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 100);
    doc.text('Número Sesión:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`Sesión #${note.session_number}`, margin + 35, y);

    if (note.cie10_code) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 100);
        doc.text('Diagnóstico:', margin + 105, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(`${note.cie10_code} — ${note.cie10_description || ''}`, margin + 140, y);
    }
    y += 10;

    // Contenido de la nota
    const sections = [
        { label: 'Estado de ánimo / Afecto', content: note.mood?.notes, rating: note.mood?.rating },
        { label: 'Revisión de temas / Tarea', content: note.bridge?.homework_review || note.bridge?.notes },
        { label: 'Agenda / Desarrollo de la sesión', isAgenda: true },
        { label: 'Reporte Clínico de Sesión', content: note.transcript_summary },
        { label: 'Creencias / Flexibilidad Cognitiva', content: note.beliefs?.core || note.beliefs?.belief ? `Creencia nuclear: ${note.beliefs.core || note.beliefs.belief}${note.beliefs.alternative ? `\nAlternativa: ${note.beliefs.alternative}` : ''}` : undefined },
        { label: 'Notas de diagnóstico / Plan de tratamiento', content: note.diagnostico_principal },
    ];

    for (const section of sections) {
        if (y > pageH - 30) y = addPage();

        if (section.isAgenda) {
            if (note.agenda && note.agenda.length > 0) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 30, 60);
                doc.text(section.label, margin, y);
                y += 5;
                for (const item of note.agenda) {
                    if (y > pageH - 20) y = addPage();
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(50, 50, 50);
                    const topicTitle = item.topic ? `• ${item.topic}` : '• Desarrollo';
                    y = addWrappedText(doc, topicTitle, margin + 4, y, contentW - 4, 5, pageH, margin, addPage, 'helvetica', 'bold', 9, 50, 50, 50);
                    
                    const details = [];
                    if (item.situation) details.push(`Situación: ${item.situation}`);
                    if (item.thoughts) details.push(`Pensamientos: ${item.thoughts}`);
                    if (item.emotions) details.push(`Emociones: ${item.emotions}`);
                    if (item.interventions) details.push(`Intervenciones: ${item.interventions}`);
                    if (item.notes) details.push(`Notas: ${item.notes}`);

                    if (details.length > 0) {
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(70, 70, 70);
                        for (const detail of details) {
                            if (y > pageH - 15) y = addPage();
                            y = addWrappedText(doc, `  ${detail}`, margin + 7, y, contentW - 7, 5, pageH, margin, addPage, 'helvetica', 'normal', 9, 70, 70, 70);
                        }
                    }
                }
                y += 4;
            }
            continue;
        }

        if (section.content || section.rating != null) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 60);
            doc.text(section.label, margin, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            if (section.rating != null) {
                doc.text(`Puntuación: ${section.rating}/100`, margin + 4, y);
                y += 5;
            }
            if (section.content) {
                y = addWrappedText(doc, section.content, margin + 4, y, contentW - 4, 5, pageH, margin, addPage, 'helvetica', 'normal', 9, 50, 50, 50);
            }
            y += 4;
        }
    }

    // Plan de acción
    if (note.action_plan && note.action_plan.length > 0) {
        if (y > pageH - 30) y = addPage();
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 60);
        doc.text('Tareas y Seguimiento', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        for (const task of note.action_plan) {
            if (y > pageH - 20) y = addPage();
            const checkbox = task.completed ? '[✓]' : '[ ]';
            y = addWrappedText(doc, `${checkbox} ${task.task}`, margin + 4, y, contentW - 4, 5, pageH, margin, addPage, 'helvetica', 'normal', 9, 50, 50, 50);
        }
    }

    // Firma Profesional
    if (professional) {
        y += 15;
        if (y > pageH - 60) y = addPage();

        if (professional.signature_data) {
            try {
                doc.addImage(professional.signature_data, 'PNG', (pageW - 40) / 2, y, 40, 15);
                y += 16;
            } catch (e) { y += 2; }
        }

        doc.setDrawColor(60, 40, 120);
        doc.line(pageW / 2 - 30, y, pageW / 2 + 30, y);
        y += 5;

        const displayName = [professional.prefix, professional.full_name].filter(Boolean).join(' ');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(displayName, pageW / 2, y, { align: 'center' });
        y += 4;

        if (professional.cedulas && professional.cedulas.length > 0) {
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 110);
            for (const ced of professional.cedulas) {
                doc.text(`Céd. Prof. ${ced.numero} (${ced.tipo})`, pageW / 2, y, { align: 'center' });
                y += 4;
            }
        }
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        doc.text(`Documento de validez clínica. Saudade © ${new Date().getFullYear()} | Página ${i} de ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
    }

    doc.save(`nota_sesion_${note.session_number}_${patient.name.replace(/\s+/g, '_')}.pdf`);
}

