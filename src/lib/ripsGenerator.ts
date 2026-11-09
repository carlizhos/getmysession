/**
 * Generador y Validador de RIPS JSON para Colombia
 * Cumplimiento estricto de la Resolución 2275 de 2023 y Resolución 510/2024 de MinSalud
 */

import { Patient, Profile, Appointment, SessionNote } from '@/types';

export interface RipsConsultaItem {
  codPrestador: string;
  fechaInicioAtencion: string; // Formato: "YYYY-MM-DD HH:mm"
  numAutorizacion: string | null;
  codConsulta: string; // Código CUPS (ej: "943100" o "890208")
  modalidadGrupoServicioTecSal: string; // "01": Intramural, "03": Telemedicina
  grupoServicios: string; // "01": Consulta Externa
  codServicio: number; // 356: Código del servicio de psicología según REPS
  finalidadTecnologiaSalud: string; // "10": Diagnóstico, "14": Tratamiento
  causaMotivoAtencion: string; // "13": Enfermedad general
  codDiagnosticoPrincipal: string; // Código CIE-10 (ej: "F411")
  codDiagnosticoRelacionado1: string | null;
  tipoDiagnosticoPrincipal: string; // "01": Impresión diagnóstica, "02": Confirmado nuevo
  tipoDocumentoIdentificacion: string; // "CC", "TI", etc.
  numDocumentoIdentificacion: string;
  vrServicio: number; // Valor monetario en COP
  conceptoRecaudo: string; // "05": Pago particular / honorarios
  valorPagoModerador: number; // 0 para particulares
  numFEVPagoModerador: string | null;
}

export interface RipsUsuarioItem {
  consecutivo: number;
  tipoDocumentoIdentificacion: string;
  numDocumentoIdentificacion: string;
  tipoUsuario: string; // "04": Particular, "01": Contributivo
  fechaNacimiento: string; // "YYYY-MM-DD"
  codSexo: 'M' | 'F';
  codPaisResidencia: string; // "170" (Colombia)
  codMunicipioResidencia: string; // Código DANE 5 dígitos (ej: "11001")
  codZonaTerritorialResidencia: string; // "01": Urbana, "02": Rural
  incapacidad: 'NO' | 'SI';
  servicios: {
    consultas: RipsConsultaItem[];
    procedimientos?: any[];
  };
}

export interface RipsPayload {
  numDocumentoIdObligado: string; // NIT o Cédula del psicólogo
  codigoPrestador: string; // Código REPS de habilitación
  numFactura: string; // Número de factura DIAN
  tipoNota: string | null;
  numNota: string | null;
  usuarios: RipsUsuarioItem[];
}

export interface GenerateRipsInput {
  patient: Patient;
  profile: Profile;
  appointment?: Appointment | null;
  sessionNote?: SessionNote | null;
  invoiceNumber: string;
  amount: number;
  cufe?: string | null;
}

export interface MonthlyRipsConsultationItem {
  patient: Patient;
  appointment: Appointment;
  sessionNote?: SessionNote | null;
  amount: number;
  invoiceNumber?: string;
}

/**
 * Genera el payload JSON oficial de RIPS bajo la Resolución 2275 de 2023 (Individual)
 */
export function buildRipsJSON(input: GenerateRipsInput): RipsPayload {
  const { patient, profile, appointment, sessionNote, invoiceNumber, amount } = input;

  const prestadorCode = profile.reps_code || '110010000001';
  const nitPrestador = (profile.nit || '900000000').replace(/[^0-9]/g, '');

  const sessionDate = appointment?.start_time ? new Date(appointment.start_time) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedDate = `${sessionDate.getFullYear()}-${pad(sessionDate.getMonth() + 1)}-${pad(sessionDate.getDate())} ${pad(sessionDate.getHours())}:${pad(sessionDate.getMinutes())}`;

  const sexo = patient.gender === 'F' ? 'F' : 'M';
  const cie10 = (sessionNote?.cie10_code || 'F411').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const cups = appointment?.cups_code || '943100';
  const modalidad = appointment?.modality === 'online' || appointment?.service_modality === '03' ? '03' : '01';

  const docType = patient.document_type || 'CC';
  const docNumber = patient.document_number || '100000000';

  const consulta: RipsConsultaItem = {
    codPrestador: prestadorCode,
    fechaInicioAtencion: formattedDate,
    numAutorizacion: null,
    codConsulta: cups,
    modalidadGrupoServicioTecSal: modalidad,
    grupoServicios: '01',
    codServicio: 356,
    finalidadTecnologiaSalud: appointment?.consultation_purpose || '10',
    causaMotivoAtencion: appointment?.external_cause || '13',
    codDiagnosticoPrincipal: cie10,
    codDiagnosticoRelacionado1: null,
    tipoDiagnosticoPrincipal: '01',
    tipoDocumentoIdentificacion: docType,
    numDocumentoIdentificacion: docNumber,
    vrServicio: Math.round(amount),
    conceptoRecaudo: '05',
    valorPagoModerador: 0,
    numFEVPagoModerador: null,
  };

  const usuario: RipsUsuarioItem = {
    consecutivo: 1,
    tipoDocumentoIdentificacion: docType,
    numDocumentoIdentificacion: docNumber,
    tipoUsuario: patient.user_type || '04',
    fechaNacimiento: patient.date_of_birth ? patient.date_of_birth.substring(0, 10) : '1990-01-01',
    codSexo: sexo,
    codPaisResidencia: '170',
    codMunicipioResidencia: patient.municipality_code || '11001',
    codZonaTerritorialResidencia: patient.residence_area || '01',
    incapacidad: 'NO',
    servicios: {
      consultas: [consulta],
    },
  };

  return {
    numDocumentoIdObligado: nitPrestador,
    codigoPrestador: prestadorCode,
    numFactura: invoiceNumber,
    tipoNota: null,
    numNota: null,
    usuarios: [usuario],
  };
}

/**
 * Genera el paquete consolidado mensual de RIPS JSON para MinSalud (Resolución 2275 de 2023)
 * Agrupa todas las consultas del periodo por paciente (usuario único) con sus consultas asociadas.
 */
export function buildMonthlyConsolidatedRipsJSON(
  profile: Profile,
  monthPeriodStr: string, // Ej: "2026-11"
  items: MonthlyRipsConsultationItem[]
): { payload: RipsPayload; warnings: string[] } {
  const prestadorCode = profile.reps_code || '110010000001';
  const nitPrestador = (profile.nit || '900000000').replace(/[^0-9]/g, '');
  const prefix = profile.dian_prefix || 'SETP';
  const invoiceConsolidada = `${prefix}-CONSOLIDADO-${monthPeriodStr.replace(/[^0-9]/g, '')}`;

  const warnings: string[] = [];
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Agrupar items por identificación de paciente
  const patientGroups = new Map<string, { patient: Patient; items: MonthlyRipsConsultationItem[] }>();

  items.forEach((item) => {
    const docNum = item.patient.document_number || `DOC_${item.patient.id.slice(0, 8)}`;
    if (!item.patient.document_number) {
      warnings.push(`El paciente ${item.patient.name} no tiene número de documento registrado.`);
    }
    if (!item.patient.municipality_code) {
      warnings.push(`El paciente ${item.patient.name} no tiene código DANE de municipio.`);
    }

    if (!patientGroups.has(docNum)) {
      patientGroups.set(docNum, { patient: item.patient, items: [] });
    }
    patientGroups.get(docNum)!.items.push(item);
  });

  let consecutivoUsuario = 1;
  const usuarios: RipsUsuarioItem[] = [];

  patientGroups.forEach((group, docNum) => {
    const pat = group.patient;
    const docType = pat.document_type || 'CC';
    const sexo = pat.gender === 'F' ? 'F' : 'M';
    const munCode = pat.municipality_code || '11001';
    const resArea = pat.residence_area || '01';
    const userType = pat.user_type || '04';

    const consultas: RipsConsultaItem[] = group.items.map((it) => {
      const sessionDate = it.appointment?.start_time ? new Date(it.appointment.start_time) : new Date();
      const formattedDate = `${sessionDate.getFullYear()}-${pad(sessionDate.getMonth() + 1)}-${pad(sessionDate.getDate())} ${pad(sessionDate.getHours())}:${pad(sessionDate.getMinutes())}`;
      const cie10 = (it.sessionNote?.cie10_code || 'F411').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const cups = it.appointment?.cups_code || '943100';
      const modalidad = it.appointment?.modality === 'online' || it.appointment?.service_modality === '03' ? '03' : '01';

      return {
        codPrestador: prestadorCode,
        fechaInicioAtencion: formattedDate,
        numAutorizacion: null,
        codConsulta: cups,
        modalidadGrupoServicioTecSal: modalidad,
        grupoServicios: '01',
        codServicio: 356,
        finalidadTecnologiaSalud: it.appointment?.consultation_purpose || '10',
        causaMotivoAtencion: it.appointment?.external_cause || '13',
        codDiagnosticoPrincipal: cie10,
        codDiagnosticoRelacionado1: null,
        tipoDiagnosticoPrincipal: '01',
        tipoDocumentoIdentificacion: docType,
        numDocumentoIdentificacion: docNum,
        vrServicio: Math.round(it.amount),
        conceptoRecaudo: '05',
        valorPagoModerador: 0,
        numFEVPagoModerador: null,
      };
    });

    usuarios.push({
      consecutivo: consecutivoUsuario++,
      tipoDocumentoIdentificacion: docType,
      numDocumentoIdentificacion: docNum,
      tipoUsuario: userType,
      fechaNacimiento: pat.date_of_birth ? pat.date_of_birth.substring(0, 10) : '1990-01-01',
      codSexo: sexo,
      codPaisResidencia: '170',
      codMunicipioResidencia: munCode,
      codZonaTerritorialResidencia: resArea,
      incapacidad: 'NO',
      servicios: {
        consultas,
      },
    });
  });

  const payload: RipsPayload = {
    numDocumentoIdObligado: nitPrestador,
    codigoPrestador: prestadorCode,
    numFactura: invoiceConsolidada,
    tipoNota: null,
    numNota: null,
    usuarios,
  };

  return { payload, warnings };
}

/**
 * Valida las reglas básicas de MinSalud antes de enviar al validador (MUV)
 */
export function validateRipsPayload(payload: RipsPayload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.numDocumentoIdObligado) {
    errors.push('Falta el NIT o identificación del prestador de salud.');
  }
  if (!payload.codigoPrestador || payload.codigoPrestador.length < 10) {
    errors.push('El Código REPS del prestador debe tener al menos 10 dígitos.');
  }
  if (!payload.numFactura) {
    errors.push('El número de factura fiscal es obligatorio para el RIPS.');
  }
  if (!payload.usuarios || payload.usuarios.length === 0) {
    errors.push('El archivo RIPS debe incluir al menos un usuario.');
  }

  payload.usuarios.forEach((u, i) => {
    if (!u.numDocumentoIdentificacion) {
      errors.push(`Usuario ${i + 1}: Falta el número de documento de identificación.`);
    }
    if (!u.codMunicipioResidencia || u.codMunicipioResidencia.length !== 5) {
      errors.push(`Usuario ${i + 1}: El código de municipio DANE debe tener 5 dígitos.`);
    }
    const consultas = u.servicios?.consultas || [];
    consultas.forEach((c, j) => {
      if (!c.codConsulta || c.codConsulta.length !== 6) {
        errors.push(`Consulta ${j + 1}: El código CUPS debe tener 6 dígitos (ej: 943100).`);
      }
      if (!c.codDiagnosticoPrincipal) {
        errors.push(`Consulta ${j + 1}: El código diagnóstico CIE-10 es requerido.`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Descarga el archivo JSON en el navegador del usuario
 */
export function downloadRipsJSON(payload: RipsPayload, fileName?: string): void {
  const name = fileName || `RIPS_${payload.numFactura || 'CONSULTA'}_${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
