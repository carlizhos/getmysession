import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { formatCOP } from '@/lib/colombiaCatalogs';

export interface DianInvoiceData {
  payment: {
    id: string;
    amount: number;
    patient_name: string;
    method?: string | null;
    paid_at?: string | null;
    created_at: string;
    cufe?: string | null;
    cuv?: string | null;
    dian_invoice_number?: string | null;
    notes?: string | null;
  };
  profile?: {
    full_name?: string | null;
    nit?: string | null;
    reps_code?: string | null;
    rethus_number?: string | null;
    dian_prefix?: string | null;
    dian_resolution?: string | null;
    tax_regime?: string | null;
    telefono_profesional?: string | null;
  } | null;
  appointment?: {
    cups_code?: string | null;
    start_time?: string | null;
    modality?: string | null;
  } | null;
  patient?: {
    document_type?: string | null;
    document_number?: string | null;
    municipality_code?: string | null;
    residence_area?: string | null;
  } | null;
  cie10Code?: string | null;
  dsm5Code?: string | null;
  diagnosticDescription?: string | null;
}

export async function generateDianInvoicePDF(data: DianInvoiceData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const invoiceNum = data.payment.dian_invoice_number || `SETP-${Date.now().toString().slice(-6)}`;
  const nitEmisor = data.profile?.nit || 'No especificado';
  const prestadorNombre = data.profile?.full_name || 'Profesional en Psicología';
  const reps = data.profile?.reps_code || '110010000001';
  const rethus = data.profile?.rethus_number || 'Colpsic';
  const resolucion = data.profile?.dian_resolution || '18764000001 de 2026';
  const regimen = data.profile?.tax_regime === 'responsable_iva' ? 'Responsable de IVA' : 'No Responsable de IVA (Art. 437 E.T.)';
  
  const cufe = data.payment.cufe || 'Pendiente de emisión ante DIAN';
  const cuv = data.payment.cuv || 'Pendiente de validación MinSalud Res. 2275';
  const cups = data.appointment?.cups_code || '943100';
  const cie10 = data.cie10Code || 'F411';
  const dsm5 = data.dsm5Code ? ` / DSM-5: ${data.dsm5Code}` : '';
  const diagDesc = data.diagnosticDescription || 'Atención en Psicoterapia Individual';

  const docType = data.patient?.document_type || 'CC';
  const docNum = data.patient?.document_number || 'Consumidor Final';
  const patientName = data.payment.patient_name || 'Paciente';

  const fechaExp = data.payment.paid_at || data.payment.created_at;
  const fechaStr = new Date(fechaExp).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let y = margin;

  // ── Header Box ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'FD');

  // Prestador info (Left)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(prestadorNombre, margin + 5, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIT / C.C.: ${nitEmisor}`, margin + 5, y + 14);
  doc.text(`Cód. Prestador Habilitado REPS: ${reps}`, margin + 5, y + 19);
  doc.text(`Registro ReTHUS / Colpsic: ${rethus}`, margin + 5, y + 24);
  doc.text(`Régimen Fiscal: ${regimen}`, margin + 5, y + 29);
  if (data.profile?.telefono_profesional) {
    doc.text(`Tel: ${data.profile.telefono_profesional}`, margin + 5, y + 34);
  }

  // Invoice Box (Right)
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(pageWidth - margin - 65, y + 3, 60, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(67, 56, 202);
  doc.text('FACTURA ELECTRÓNICA DE VENTA', pageWidth - margin - 35, y + 9, { align: 'center' });
  doc.setFontSize(7);
  doc.text('EN SALUD (FEV SALUD)', pageWidth - margin - 35, y + 13, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(30, 27, 75);
  doc.text(invoiceNum, pageWidth - margin - 35, y + 21, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Aut. DIAN: ${resolucion}`, pageWidth - margin - 35, y + 27, { align: 'center' });
  doc.text('Prefijo SETP · Rango 1 - 10000', pageWidth - margin - 35, y + 31, { align: 'center' });

  y += 44;

  // ── Datos de Expedición y Paciente ──
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('DATOS DEL ADQUIRENTE / USUARIO DE SALUD', margin + 4, y + 6);
  doc.text('DATOS DE LA OPERACIÓN', margin + contentWidth / 2 + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  // Left col: Paciente
  doc.text(`Paciente: ${patientName}`, margin + 4, y + 12);
  doc.text(`Documento: ${docType} No. ${docNum}`, margin + 4, y + 17);
  doc.text(`Tipo de Usuario: Particular (Código 04 MinSalud)`, margin + 4, y + 22);

  // Right col: Operación
  doc.text(`Fecha y Hora de Emisión: ${fechaStr}`, margin + contentWidth / 2 + 4, y + 12);
  const methodLabel = data.payment.method ? data.payment.method.toUpperCase() : 'TRANSFERENCIA';
  doc.text(`Forma de Pago: Contado · Medio: ${methodLabel}`, margin + contentWidth / 2 + 4, y + 17);
  doc.text(`Moneda: COP (Pesos Colombianos)`, margin + contentWidth / 2 + 4, y + 22);

  y += 32;

  // ── Detalle de los Servicios de Salud ──
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  doc.text('CÓD. CUPS', margin + 3, y + 5);
  doc.text('DESCRIPCIÓN DEL SERVICIO CLÍNICO', margin + 28, y + 5);
  doc.text('DIAGNÓSTICO', margin + 105, y + 5);
  doc.text('CANT', margin + 138, y + 5);
  doc.text('VR. UNITARIO', margin + 150, y + 5);
  doc.text('TOTAL COP', pageWidth - margin - 3, y + 5, { align: 'right' });

  y += 7;

  // Row item
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y + 14, pageWidth - margin, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);

  doc.text(cups, margin + 3, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text('Consulta Psicoterapia Individual', margin + 28, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Atención profesional especializada', margin + 28, y + 9);

  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text(`CIE-10: ${cie10}${dsm5}`, margin + 105, y + 6);
  doc.text('1', margin + 141, y + 6);
  doc.text(formatCOP(data.payment.amount), margin + 150, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCOP(data.payment.amount), pageWidth - margin - 3, y + 6, { align: 'right' });

  y += 18;

  // ── Bloque de Totales y Desglose de Impuestos ──
  const totalsWidth = 75;
  const totalsX = pageWidth - margin - totalsWidth;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(totalsX, y, totalsWidth, 28, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal Servicios:', totalsX + 4, y + 6);
  doc.text(formatCOP(data.payment.amount), pageWidth - margin - 4, y + 6, { align: 'right' });

  doc.text('IVA (0% Salud Exento):', totalsX + 4, y + 12);
  doc.text('$ 0', pageWidth - margin - 4, y + 12, { align: 'right' });

  doc.text('Descuentos / Moderadores:', totalsX + 4, y + 18);
  doc.text('$ 0', pageWidth - margin - 4, y + 18, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX, y + 21, pageWidth - margin, y + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL A PAGAR:', totalsX + 4, y + 26);
  doc.text(formatCOP(data.payment.amount), pageWidth - margin - 4, y + 26, { align: 'right' });

  // Exención de IVA Note (Left of totals)
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentWidth - totalsWidth - 6, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('EXENCIÓN TRIBUTARIA EN SALUD', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(21, 128, 61);
  const exencionText = 'Servicio de consulta y psicoterapia en salud mental excluido y exento del Impuesto sobre las Ventas (IVA) conforme a lo establecido en el Artículo 476 Numeral 1 del Estatuto Tributario Nacional de Colombia.';
  const splitExencion = doc.splitTextToSize(exencionText, contentWidth - totalsWidth - 14);
  doc.text(splitExencion, margin + 4, y + 12);

  y += 34;

  // ── Bloque DIAN CUFE & MinSalud CUV con Código QR Oficial ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

  // QR Code generation
  const qrValidationUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(qrValidationUrl, { margin: 1, width: 120 });
    doc.addImage(qrDataUrl, 'PNG', margin + 4, y + 4, 34, 34);
  } catch (err) {
    console.warn('No se pudo generar QR para la factura:', err);
  }

  const certX = margin + 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('REPRESENTACIÓN GRÁFICA DE FACTURA ELECTRÓNICA DE VENTA EN SALUD', certX, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('CUFE (Código Único de Facturación Electrónica DIAN):', certX, y + 13);
  doc.setFont('courier', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(30, 41, 59);
  const cufeLines = doc.splitTextToSize(cufe, contentWidth - 46);
  doc.text(cufeLines, certX, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('CUV MinSalud (Resolución 2275 de 2023 - Soporte RIPS JSON):', certX, y + 26);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(16, 185, 129);
  doc.text(cuv, certX, y + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('Escanee el código QR o consulte el portal VPFE de la DIAN para verificar la firma digital UBL 2.1.', certX, y + 36);

  y += 48;

  // ── Footer Legal ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const footerText = 'GetMySession · Software de Gestión Clínica y Facturación Electrónica en Salud para Colombia · Ley 2015 de 2020 · Resolución 1995 de 1999 · Resolución 2275 de 2023 MinSalud';
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

  return doc;
}

export async function downloadDianInvoicePDF(data: DianInvoiceData, filename?: string): Promise<void> {
  const doc = await generateDianInvoicePDF(data);
  const safeFilename = filename || `Factura_DIAN_${data.payment.dian_invoice_number || data.payment.id}.pdf`;
  doc.save(safeFilename);
}
