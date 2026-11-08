/**
 * Generador de Archivo Clínico Digital y Copia de Seguridad Masiva (ZIP)
 * Cumplimiento de la Resolución 839 de 2017 y Resolución 1995 de 1999 del MinSalud de Colombia
 * (Retención legal obligatoria de 15 años de la historia clínica).
 */

import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProgressCallback {
  (current: number, total: number, patientName: string): void;
}

export interface BackupResult {
  totalPatients: number;
  totalNotes: number;
  fileName: string;
}

/**
 * Genera el documento PDF de historia clínica para un paciente y devuelve el ArrayBuffer
 */
function buildPatientPdfBuffer(
  patient: any,
  notes: any[],
  consents: any[],
  professional?: any
): ArrayBuffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  const folio = patient.id.substring(0, 8).toUpperCase();
  const generatedAt = format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });

  const renderHeader = () => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.setFont('helvetica', 'normal');
    doc.text('Historia Clínica Digital · Ley 2015 de 2020 & Res. 1995/1999 (Colombia)', margin, 10);
    doc.text(`${patient.name} | Folio: ${folio}`, pageW - margin, 10, { align: 'right' });
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
  doc.text('EXPEDIENTE CLÍNICO DE CUSTODIA (RES. 839 DE 2017)', pageW / 2, 29, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${generatedAt} · Retención legal: 15 años`, pageW / 2, 35, { align: 'center' });

  let y = 48;

  // Datos del Paciente
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE IDENTIFICACIÓN DEL USUARIO', margin, y);
  doc.setDrawColor(95, 70, 155);
  doc.line(margin, y + 1.5, margin + 70, y + 1.5);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  const patientRows: [string, string][] = [
    ['Nombre Completo', patient.name || '—'],
    ['Documento de Identidad', `${patient.document_type || 'CC'} ${patient.document_number || '—'}`],
    ['Fecha de Nacimiento', patient.date_of_birth ? format(new Date(patient.date_of_birth), "d 'de' MMMM yyyy", { locale: es }) : '—'],
    ['Género', patient.gender === 'F' ? 'Femenino' : patient.gender === 'M' ? 'Masculino' : 'No especificado'],
    ['Teléfono', patient.phone || '—'],
    ['Correo Electrónico', patient.email || '—'],
    ['Municipio de Residencia', patient.municipality_code || '11001 (Bogotá D.C.)'],
    ['Contacto de Urgencia', `${patient.emergency_contact_name || '—'} (Tel: ${patient.emergency_contact_phone || '—'})`],
  ];

  if (patient.guardian_name) {
    patientRows.push([
      'Representante Legal (Menor)',
      `${patient.guardian_name} (${patient.guardian_relationship || 'Tutor'}) · ${patient.guardian_document_type || 'CC'} ${patient.guardian_document_number || ''} · Tel: ${patient.guardian_phone || '—'}`
    ]);
  }

  for (const [k, v] of patientRows) {
    if (y > pageH - margin) y = addPage();
    doc.setFont('helvetica', 'bold');
    doc.text(`${k}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, margin + 50, y);
    y += 5.5;
  }

  y += 4;

  // Historial de Sesiones
  if (y > pageH - 30) y = addPage();
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 60);
  doc.setFont('helvetica', 'bold');
  doc.text(`EVOLUCIONES CLÍNICAS (${notes.length} sesiones)`, margin, y);
  doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
  y += 8;

  for (const note of notes) {
    if (y > pageH - 35) y = addPage();

    doc.setFillColor(245, 243, 255);
    doc.roundedRect(margin, y - 4, contentW, 7, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 40, 130);
    const dateFormatted = note.date ? format(new Date(note.date), "d 'de' MMMM yyyy", { locale: es }) : 'Sin fecha';
    doc.text(`Sesión #${note.session_number} · ${dateFormatted}`, margin + 3, y + 1);
    y += 9;

    // Diagnósticos
    if (note.dsm5_code || note.cie10_code) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 100);
      doc.text('Diagnóstico:', margin + 3, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const diagStr = [
        note.dsm5_code ? `DSM-5: ${note.dsm5_code}` : null,
        note.cie10_code ? `CIE-10 (RIPS): ${note.cie10_code}` : null,
        note.dsm5_description || note.cie10_description || null
      ].filter(Boolean).join(' · ');
      doc.text(diagStr, margin + 28, y);
      y += 5;
    }

    // Reporte clínico o tema
    const reportText = note.transcript_summary || note.agenda?.[0]?.thoughts || note.agenda?.[0]?.topic || note.diagnostico_principal || 'Evolución registrada.';
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const splitLines = doc.splitTextToSize(reportText, contentW - 6);
    for (const line of splitLines) {
      if (y > pageH - margin) y = addPage();
      doc.text(line, margin + 3, y);
      y += 4.5;
    }

    y += 4;
  }

  // Consentimientos
  if (consents.length > 0) {
    if (y > pageH - 30) y = addPage();
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(`CONSENTIMIENTOS INFORMADOS FIRMADOS (${consents.length})`, margin, y);
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 8;

    for (const c of consents) {
      if (y > pageH - margin) y = addPage();
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      const signedDate = c.signed_at ? format(new Date(c.signed_at), 'dd/MM/yyyy') : 'Sin fecha';
      doc.text(`• ${c.form_type?.toUpperCase()} — Firmado el ${signedDate} · Folio: ${c.id.substring(0, 8).toUpperCase()}`, margin + 3, y);
      y += 5;
    }
  }

  // Pie de página de todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 170);
    doc.text(
      `Copia de Custodia Legal · Resolución 839 de 2017 (MinSalud Colombia) · Página ${i} de ${totalPages}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }

  return doc.output('arraybuffer');
}

/**
 * Función principal: Descarga Masiva del Archivo Clínico en ZIP
 */
export async function exportClinicalArchiveZip(
  organizationId: string,
  profile: any,
  onProgress?: ProgressCallback
): Promise<BackupResult> {
  const zip = new JSZip();

  // 1. Obtener todos los pacientes de la organización
  const { data: patients, error: pErr } = await supabase
    .from('patients')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (pErr) throw pErr;
  if (!patients || patients.length === 0) {
    throw new Error('No hay pacientes registrados en esta organización para exportar.');
  }

  const folder = zip.folder('Expedientes_Clinicos');
  let totalNotesCount = 0;
  const indexRows: string[] = [];

  // 2. Iterar sobre cada paciente y compilar su expediente en PDF
  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    if (onProgress) onProgress(i + 1, patients.length, p.name);

    // Obtener notas clínicas del paciente
    const { data: notes } = await supabase
      .from('session_notes')
      .select('*')
      .eq('patient_id', p.id)
      .is('deleted_at', null)
      .order('session_number', { ascending: true });

    const patientNotes = notes || [];
    totalNotesCount += patientNotes.length;

    // Obtener consentimientos informados
    const { data: consents } = await supabase
      .from('consent_forms')
      .select('*')
      .eq('patient_id', p.id)
      .is('deleted_at', null);

    const patientConsents = consents || [];

    // Generar PDF y agregar al ZIP
    const pdfBuffer = buildPatientPdfBuffer(p, patientNotes, patientConsents, profile);
    const cleanDocNum = p.document_number ? p.document_number.replace(/[^0-9A-Za-z]/g, '') : p.id.substring(0, 8);
    const cleanName = (p.name || 'Paciente').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const pdfFileName = `Expediente_${cleanName}_${cleanDocNum}.pdf`;

    folder?.file(pdfFileName, pdfBuffer);

    indexRows.push(
      `• ${p.name} | Doc: ${p.document_type || 'CC'} ${cleanDocNum} | Sesiones: ${patientNotes.length} | Consentimientos: ${patientConsents.length} | Archivo: ${pdfFileName}`
    );
  }

  // 3. Crear acta e índice de custodia oficial (Res. 839/2017)
  const generatedDate = format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es });
  const indexContent = `================================================================================
ACTA DE CUSTODIA Y ARCHIVO CLÍNICO DIGITAL
Ministerio de Salud y Protección Social de Colombia
Cumplimiento de la Resolución 839 de 2017 y Resolución 1995 de 1999
================================================================================

DATOS DEL PRESTADOR DE SALUD / RESPONSABLE DEL ARCHIVO:
• Profesional / Organización: ${profile?.full_name || 'Psicólogo Prestador'}
• NIT / Cédula: ${profile?.nit || 'No especificado'}
• Código REPS de Habilitación: ${profile?.reps_code || 'Prestador Independiente'}
• Registro ReTHUS / Tarjeta Profesional Colpsic: ${profile?.rethus_number || 'En trámite'}
• Fecha de Generación de la Copia: ${generatedDate}

NORMATIVA DE CUSTODIA (RESOLUCIÓN 839 DE 2017):
1. Las historias clínicas contenidas en este archivo comprimido deben ser conservadas
   por un periodo mínimo legal de QUINCE (15) AÑOS a partir de la fecha de la última
   atención (5 años en archivo de gestión y 10 años en archivo central).
2. En caso de cierre definitivo del ejercicio profesional o consultorio, el prestador
   debe publicar el aviso correspondiente y entregar copia al usuario o transferir la
   custodia a la entidad competente según el Artículo 6 de la Res. 839 de 2017.
3. Este archivo digital goza de plena validez jurídica y probatoria según la Ley 527
   de 1999 (Comercio Electrónico y Mensajes de Datos) y Ley 2015 de 2020.

RESUMEN DEL ARCHIVO EXPORTADO:
• Total de Pacientes / Expedientes: ${patients.length}
• Total de Notas de Evolución Clínica: ${totalNotesCount}

ÍNDICE DE EXPEDIENTES ADJUNTOS EN LA CARPETA 'Expedientes_Clinicos/':
${indexRows.join('\n')}

================================================================================
Documento generado automáticamente por GetMySession (https://getmysession.com)
================================================================================`;

  zip.file('INDICE_CUSTODIA_RES_839_2017.txt', indexContent);

  // 4. Generar el archivo ZIP final
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // 5. Descargar en el navegador
  const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
  const fileName = `Archivo_Clinico_Res839_${dateStr}.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // 6. Registrar en auditoría
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        organization_id: organizationId,
        profile_id: user.id,
        action: 'export_clinical_archive_zip',
        resource_type: 'patients',
        details: {
          patients_count: patients.length,
          notes_count: totalNotesCount,
          resolution: 'Res. 839/2017 MinSalud',
        },
      });
    }
  } catch (err) {
    console.error('Audit log error on clinical archive export:', err);
  }

  return {
    totalPatients: patients.length,
    totalNotes: totalNotesCount,
    fileName,
  };
}
