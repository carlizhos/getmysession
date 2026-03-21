import jsPDF from 'jspdf';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface PatientData {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    curp?: string;
    sex?: string;
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
    agenda?: { topic?: string; notes?: string; resolved?: boolean }[];
    beliefs?: { belief?: string; evidence_for?: string; evidence_against?: string; alternative?: string };
    action_plan?: { task?: string; completed?: boolean }[];
    cie10_code?: string;
    cie10_description?: string;
    diagnostico_principal?: string;
}

export interface ConsentData {
    id: string;
    form_type: string;
    signed_at?: string;
    is_valid: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const FORM_TYPE_LABELS: Record<string, string> = {
    general: 'Consentimiento Informado General',
    tratamiento: 'Tratamiento Psicológico',
    datos_personales: 'Datos Personales (LFPDPPP)',
};

const SEX_LABELS: Record<string, string> = {
    M: 'Masculino', F: 'Femenino', otro: 'No especificado',
};

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
): number {
    const lines = doc.splitTextToSize(text || '—', maxWidth);
    for (const line of lines) {
        if (y > pageHeight - margin) y = onNewPage();
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
        doc.text('NOM-024-SSA3-2012 | Expediente Clínico Electrónico', margin, 10);
        doc.text(`${patient.name} | Folio: ${folio}`, pageW - margin, 10, { align: 'right' });
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
        ? `${differenceInYears(new Date(), parseISO(patient.date_of_birth))} años`
        : '—';

    const infoRows = [
        ['Nombre completo', patient.name || '—'],
        ['Edad', age],
        ['Fecha de nacimiento', patient.date_of_birth ? format(parseISO(patient.date_of_birth), 'd MMM yyyy', { locale: es }) : '—'],
        ['CURP', patient.curp || '—'],
        ['Sexo', patient.sex ? (SEX_LABELS[patient.sex] || patient.sex) : '—'],
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
            `Sesión #${note.session_number}  ·  ${format(parseISO(note.date), "d 'de' MMMM yyyy", { locale: es })}`,
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
                if (!item.topic) continue;
                if (y > pageH - margin) y = addPage();
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(40, 40, 40);
                y = addWrappedText(doc, `• ${item.topic}`, margin + 6, y, contentW - 6, 5, pageH, margin, addPage);
                if (item.notes) {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(70, 70, 70);
                    y = addWrappedText(doc, `  ${item.notes}`, margin + 9, y, contentW - 9, 5, pageH, margin, addPage);
                }
            }
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

        // Plan de acción
        if (note.action_plan && note.action_plan.length > 0) {
            if (y > pageH - margin) y = addPage();
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80, 80, 100);
            doc.text('Plan de acción / Tareas:', margin + 3, y);
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
            const dateStr = c.signed_at ? format(parseISO(c.signed_at), "d MMM yyyy", { locale: es }) : 'Sin fecha';
            const valid = c.is_valid ? '✓ Válido' : '✗ Revocado';
            const folioCons = c.id.substring(0, 8).toUpperCase();
            doc.text(`• ${label}  |  ${dateStr}  |  ${valid}  |  Folio: ${folioCons}`, margin + 3, y);
            y += 6;
        }
    }

    // ── Pie de todas las páginas ──
    renderFooters(doc.getNumberOfPages());

    // ── Guardar ──
    doc.save(`expediente_${patient.name.replace(/\s+/g, '_')}_${folio}.pdf`);
}
