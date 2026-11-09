import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface CertificadoAsistenciaData {
  patient: {
    name: string;
    document_type?: string | null;
    document_number?: string | null;
    municipality_code?: string | null;
  };
  profile: {
    full_name?: string | null;
    nit?: string | null;
    reps_code?: string | null;
    rethus_number?: string | null;
    telefono_profesional?: string | null;
    signature_data?: string | null;
    institucion_formadora?: string | null;
  };
  purpose: 'laboral' | 'academico' | 'personal' | 'general';
  customPurposeText?: string;
  sessions: Array<{
    date: string;
    modality?: string;
  }>;
  city?: string;
  includeDiagnostic?: boolean;
  diagnosticText?: string;
  observations?: string;
}

export async function generateCertificadoAsistenciaPDF(data: CertificadoAsistenciaData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const therapistName = data.profile.full_name || 'Profesional en Psicología';
  const rethus = data.profile.rethus_number || 'En trámite';
  const nit = data.profile.nit || 'No especificado';
  const reps = data.profile.reps_code || '110010000001';
  const city = data.city || 'Bogotá D.C.';
  const today = new Date();
  const todayFormatted = format(today, "d 'de' MMMM 'de' yyyy", { locale: es });

  const patientName = data.patient.name;
  const docType = data.patient.document_type || 'CC';
  const docNum = data.patient.document_number || 'Identificación no registrada';

  let y = margin;

  // ── Header Membrete ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(therapistName, margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('PROFESIONAL EN PSICOLOGÍA CLÍNICA', margin + 6, y + 14);
  doc.text(`Registro Nacional ReTHUS / Colpsic: ${rethus} · NIT/C.C.: ${nit}`, margin + 6, y + 19);
  doc.text(`Prestador Habilitado MinSalud REPS: ${reps}`, margin + 6, y + 24);
  if (data.profile.telefono_profesional) {
    doc.text(`Contacto Profesional: ${data.profile.telefono_profesional} · ${city}, Colombia`, margin + 6, y + 29);
  }

  y += 42;

  // ── Document Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text('CONSTANCIA DE ASISTENCIA A ATENCIÓN PSICOLÓGICA', pageWidth / 2, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Ley 1090 de 2006 (Código Deontológico del Psicólogo en Colombia)', pageWidth / 2, y + 5, { align: 'center' });

  y += 18;

  // ── Certification Body ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('EL (LA) SUSCRITO(A) PROFESIONAL EN PSICOLOGÍA', margin, y);
  y += 6;
  doc.text('CERTIFICA QUE:', margin, y);

  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  const introText = `El (La) ciudadano(a) ${patientName.toUpperCase()}, identificado(a) con ${docType} No. ${docNum}, se encuentra asistiendo a este consultorio profesional a proceso de valoración y atención en psicoterapia individual especializada en salud mental.`;
  const splitIntro = doc.splitTextToSize(introText, contentWidth);
  doc.text(splitIntro, margin, y);
  y += splitIntro.length * 5 + 4;

  // ── Dates and Sessions Breakdown ──
  if (data.sessions && data.sessions.length > 0) {
    const sessionCount = data.sessions.length;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Relación de sesiones atendidas (${sessionCount} sesión${sessionCount !== 1 ? 'es' : ''}):`, margin, y);
    y += 6;

    // Table of dates
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('FECHA Y HORA', margin + 4, y + 5);
    doc.text('MODALIDAD (RES. 2654/2019)', margin + 70, y + 5);
    doc.text('ESTADO', margin + 130, y + 5);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    data.sessions.slice(0, 8).forEach((s, idx) => {
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setTextColor(30, 41, 59);
      doc.text(s.date, margin + 4, y + 4.5);
      doc.text(s.modality || 'Consulta Externa (Presencial)', margin + 70, y + 4.5);
      doc.text('Asistida / Cumplida', margin + 130, y + 4.5);
      y += 6;
    });

    if (data.sessions.length > 8) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`... y ${data.sessions.length - 8} sesiones adicionales registradas en su historia clínica.`, margin + 4, y + 4);
      y += 7;
    }

    y += 5;
  }

  // ── Optional Diagnostic (If requested under confidentiality) ──
  if (data.includeDiagnostic && data.diagnosticText) {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text('VALORACIÓN CLÍNICA DIAGNÓSTICA (AUTORIZADA POR EL PACIENTE)', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61);
    doc.text(data.diagnosticText, margin + 4, y + 11);

    y += 20;
  }

  // ── Purpose statement ──
  let purposeDesc = 'Se expide la presente a solicitud verbal del interesado(a) para los fines pertinentes que estime convenientes.';
  if (data.purpose === 'laboral') {
    purposeDesc = 'Se expide la presente constancia a solicitud del interesado(a) para fines estrictamente laborales y justificación de asistencia a cita en salud.';
  } else if (data.purpose === 'academico') {
    purposeDesc = 'Se expide la presente a solicitud del interesado(a) para fines académicos y constancia ante la institución educativa correspondiente.';
  } else if (data.customPurposeText) {
    purposeDesc = `Se expide la presente a solicitud del interesado(a) con destino a: ${data.customPurposeText}.`;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const splitPurpose = doc.splitTextToSize(purposeDesc, contentWidth);
  doc.text(splitPurpose, margin, y);
  y += splitPurpose.length * 5 + 4;

  if (data.observations) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const splitObs = doc.splitTextToSize(`Observaciones: ${data.observations}`, contentWidth);
    doc.text(splitObs, margin, y);
    y += splitObs.length * 4.5 + 4;
  }

  // Date and location line
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Dada en la ciudad de ${city}, a los ${todayFormatted}.`, margin, y);

  y += 25;

  // ── Signature Block ──
  const sigX = margin + 15;
  if (data.profile.signature_data) {
    try {
      doc.addImage(data.profile.signature_data, 'PNG', sigX, y - 18, 48, 16);
    } catch {
      // Signature fallback
    }
  }

  doc.setDrawColor(100, 116, 139);
  doc.line(sigX, y, sigX + 75, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(therapistName, sigX, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Psicólogo(a) Clínico(a)`, sigX, y + 8.5);
  doc.text(`Registro ReTHUS / Colpsic: ${rethus}`, sigX, y + 12.5);
  doc.text(`C.C. / NIT: ${nit}`, sigX, y + 16.5);

  // ── Legal Footer ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const footerLegal = 'Documento emitido conforme a la Ley 1090 de 2006 (Código Deontológico y Bioético del Psicólogo) y la Ley 2015 de 2020 de la República de Colombia. Válido sin tachaduras ni enmendaduras.';
  doc.text(footerLegal, pageWidth / 2, pageHeight - 12, { align: 'center' });

  return doc;
}

export async function downloadCertificadoAsistenciaPDF(data: CertificadoAsistenciaData, filename?: string): Promise<void> {
  const doc = await generateCertificadoAsistenciaPDF(data);
  const safeName = filename || `Constancia_Asistencia_${data.patient.document_number || data.patient.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(safeName);
}
