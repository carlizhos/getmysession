import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface RemisionInterconsultaData {
  patient: {
    name: string;
    document_type?: string | null;
    document_number?: string | null;
    date_of_birth?: string | null;
    phone?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    eps?: string | null;
  };
  profile: {
    full_name?: string | null;
    nit?: string | null;
    reps_code?: string | null;
    rethus_number?: string | null;
    telefono_profesional?: string | null;
    signature_data?: string | null;
  };
  specialty: 'psiquiatria' | 'neurologia' | 'medicina_general' | 'neuropsicologia' | 'toxicologia' | 'nutricion' | 'urgencias_salud_mental' | string;
  specialtyLabel?: string;
  targetInstitution?: string;
  priority: 'ordinaria' | 'prioritaria' | 'urgencia';
  reason: string;
  cie10Code?: string | null;
  dsm5Code?: string | null;
  diagnosticDescription?: string | null;
  mentalStateSummary?: string;
  riskEvaluation?: string;
  treatmentPlan?: string;
  city?: string;
}

const SPECIALTY_NAMES: Record<string, string> = {
  psiquiatria: 'Psiquiatría / Salud Mental',
  neurologia: 'Neurología Clínica',
  medicina_general: 'Medicina General / Familiar',
  neuropsicologia: 'Evaluación Neuropsicológica Integral',
  toxicologia: 'Toxicología Clínica / Adicciones',
  nutricion: 'Nutrición y Dietética Clínica',
  urgencias_salud_mental: 'Servicio de Urgencias en Salud Mental',
};

const PRIORITY_LABELS: Record<string, { label: string; color: [number, number, number] }> = {
  ordinaria: { label: 'ORDINARIA', color: [14, 116, 144] },
  prioritaria: { label: 'PRIORITARIA', color: [217, 119, 6] },
  urgencia: { label: 'URGENCIA MÉDICA / PSIQUIÁTRICA', color: [220, 38, 38] },
};

export async function generateRemisionPDF(data: RemisionInterconsultaData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const therapistName = data.profile.full_name || 'Profesional en Psicología';
  const rethus = data.profile.rethus_number || 'En trámite';
  const nit = data.profile.nit || 'No especificado';
  const reps = data.profile.reps_code || '110010000001';
  const city = data.city || 'Colombia';
  const today = new Date();
  const todayFormatted = format(today, "d 'de' MMMM 'de' yyyy · HH:mm", { locale: es });

  const patientName = data.patient.name;
  const docType = data.patient.document_type || 'CC';
  const docNum = data.patient.document_number || 'No especificado';
  const phone = data.patient.phone || 'No registrado';
  const emergencyContact = data.patient.emergency_contact_name 
    ? `${data.patient.emergency_contact_name} (${data.patient.emergency_contact_phone || 'Sin tel.'})`
    : 'No registrado';

  const specialtyText = data.specialtyLabel || SPECIALTY_NAMES[data.specialty] || data.specialty;
  const priorityInfo = PRIORITY_LABELS[data.priority] || PRIORITY_LABELS.ordinaria;

  let y = margin;

  // ── Header Prestador Remitente ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(therapistName, margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CONSULTORIO DE PSICOLOGÍA CLÍNICA Y SALUD MENTAL', margin + 5, y + 13);
  doc.text(`Registro Nacional ReTHUS: ${rethus} · NIT/C.C.: ${nit}`, margin + 5, y + 18);
  doc.text(`Prestador Habilitado MinSalud REPS: ${reps} · Tel: ${data.profile.telefono_profesional || 'No registrado'}`, margin + 5, y + 23);

  // Right Badge: Ley 1616 de 2013
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(pageWidth - margin - 52, y + 4, 48, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(67, 56, 202);
  doc.text('SISTEMA DE SALUD (COL)', pageWidth - margin - 28, y + 9, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(99, 102, 241);
  doc.text('Ley 1616 de 2013', pageWidth - margin - 28, y + 14, { align: 'center' });
  doc.text('Res. 1995 de 1999 MinSalud', pageWidth - margin - 28, y + 18, { align: 'center' });

  y += 36;

  // ── Title & Priority Banner ──
  doc.setFillColor(priorityInfo.color[0], priorityInfo.color[1], priorityInfo.color[2]);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('ORDEN DE REMISIÓN E INTERCONSULTA CLÍNICA', margin + 4, y + 5.5);
  doc.text(`PRIORIDAD: ${priorityInfo.label}`, pageWidth - margin - 4, y + 5.5, { align: 'right' });

  y += 12;

  // ── Datos del Paciente y Destino ──
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DEL PACIENTE', margin + 4, y + 5);
  doc.text('DATOS DE LA REMISIÓN / DESTINO', margin + contentWidth / 2 + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  // Left col: Paciente
  doc.text(`Nombre: ${patientName}`, margin + 4, y + 10);
  doc.text(`Identificación: ${docType} ${docNum}`, margin + 4, y + 15);
  doc.text(`Teléfono: ${phone} · Acudiente: ${emergencyContact}`, margin + 4, y + 20);

  // Right col: Destino
  doc.text(`Especialidad receptora: ${specialtyText}`, margin + contentWidth / 2 + 4, y + 10);
  if (data.targetInstitution) {
    doc.text(`Institución sugerida: ${data.targetInstitution}`, margin + contentWidth / 2 + 4, y + 15);
  } else {
    doc.text(`Institución: Red Prestadora EPS / Adscrita`, margin + contentWidth / 2 + 4, y + 15);
  }
  doc.text(`Fecha y hora de expedición: ${todayFormatted}`, margin + contentWidth / 2 + 4, y + 20);

  y += 30;

  // ── Impresión Diagnóstica (CIE-10 / DSM-5) ──
  const cie10 = data.cie10Code || 'F411';
  const dsm5 = data.dsm5Code ? ` · Criterio DSM-5: ${data.dsm5Code}` : '';
  const diagDesc = data.diagnosticDescription || 'Trastorno en evaluación clínica';

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('IMPRESIÓN DIAGNÓSTICA (CIE-10 & DSM-5):', margin + 4, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`CIE-10: ${cie10}${dsm5} — ${diagDesc}`, margin + 4, y + 10);

  y += 18;

  // ── Motivo y Justificación de la Remisión ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('1. MOTIVO Y JUSTIFICACIÓN CLÍNICA DE LA REMISIÓN:', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const splitReason = doc.splitTextToSize(data.reason, contentWidth);
  doc.text(splitReason, margin, y);
  y += splitReason.length * 4.5 + 4;

  // ── Resumen de Evolución y Estado Mental Actual ──
  if (data.mentalStateSummary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text('2. RESUMEN DEL ESTADO MENTAL Y EVOLUCIÓN TERAPÉUTICA:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const splitSummary = doc.splitTextToSize(data.mentalStateSummary, contentWidth);
    doc.text(splitSummary, margin, y);
    y += splitSummary.length * 4.5 + 4;
  }

  // ── Evaluación de Riesgos (si aplica) ──
  if (data.riskEvaluation) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text('3. EVALUACIÓN DE FACTORES DE RIESGO Y SEGURIDAD:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(127, 29, 29);
    const splitRisk = doc.splitTextToSize(data.riskEvaluation, contentWidth);
    doc.text(splitRisk, margin, y);
    y += splitRisk.length * 4.5 + 4;
  }

  // ── Solicitud de Contrarreferencia ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('SOLICITUD FORMAL DE CONTRARREFERENCIA MÉDICA (LEY 1616 DE 2013):', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const crText = 'Se solicita comedidamente al profesional especialista remitir concepto clínico y plan de manejo farmacológico establecido para continuar el abordaje psicoterapéutico coordinado en beneficio del paciente.';
  const splitCr = doc.splitTextToSize(crText, contentWidth - 8);
  doc.text(splitCr, margin + 4, y + 9.5);

  y += 24;

  // ── Signature Block ──
  const sigX = margin + 10;
  if (data.profile.signature_data) {
    try {
      doc.addImage(data.profile.signature_data, 'PNG', sigX, y - 14, 46, 14);
    } catch {
      // signature fallback
    }
  }

  doc.setDrawColor(100, 116, 139);
  doc.line(sigX, y, sigX + 70, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(therapistName, sigX, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Psicólogo(a) Clínico(a) Remitente`, sigX, y + 8.5);
  doc.text(`Registro ReTHUS / Colpsic: ${rethus}`, sigX, y + 12.5);
  doc.text(`C.C. / NIT: ${nit}`, sigX, y + 16.5);

  // ── Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const footerLegal = 'Documento confidencial emitido bajo la reserva legal de la Historia Clínica (Res. 1995/1999) y la Ley 1616 de 2013 de Salud Mental. Válido ante entidades del SGSSS en Colombia.';
  doc.text(footerLegal, pageWidth / 2, pageHeight - 10, { align: 'center' });

  return doc;
}

export async function downloadRemisionPDF(data: RemisionInterconsultaData, filename?: string): Promise<void> {
  const doc = await generateRemisionPDF(data);
  const safeName = filename || `Orden_Remision_${data.patient.document_number || data.patient.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(safeName);
}
