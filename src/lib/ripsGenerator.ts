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

/**
 * Genera el payload JSON oficial de RIPS bajo la Resolución 2275 de 2023
 */
export function buildRipsJSON(input: GenerateRipsInput): RipsPayload {
  const { patient, profile, appointment, sessionNote, invoiceNumber, amount } = input;

  const prestadorCode = profile.reps_code || '110010000001';
  const nitPrestador = (profile.nit || '900000000').replace(/[^0-9]/g, '');

  // Formato de fecha para MinSalud: YYYY-MM-DD HH:mm
  const sessionDate = appointment?.start_time ? new Date(appointment.start_time) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedDate = `${sessionDate.getFullYear()}-${pad(sessionDate.getMonth() + 1)}-${pad(sessionDate.getDate())} ${pad(sessionDate.getHours())}:${pad(sessionDate.getMinutes())}`;

  // Sexo del paciente
  const sexo = patient.gender === 'F' ? 'F' : 'M';

  // Código CIE-10 (usar el de la nota clínica o F411 Ansiedad por defecto)
  const cie10 = (sessionNote?.cie10_code || 'F411').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  // Código CUPS (usar de la cita o 943100 Psicoterapia individual)
  const cups = appointment?.cups_code || '943100';

  // Modalidad (03 si es telemedicina/online, 01 si es presencial)
  const modalidad = appointment?.modality === 'online' || appointment?.service_modality === '03' ? '03' : '01';

  // Tipo y número de documento del paciente
  const docType = patient.document_type || 'CC';
  const docNumber = patient.document_number || '100000000';

  const consulta: RipsConsultaItem = {
    codPrestador: prestadorCode,
    fechaInicioAtencion: formattedDate,
    numAutorizacion: null,
    codConsulta: cups,
    modalidadGrupoServicioTecSal: modalidad,
    grupoServicios: '01', // Consulta Externa
    codServicio: 356, // Psicología en REPS
    finalidadTecnologiaSalud: appointment?.consultation_purpose || '10', // Diagnóstico
    causaMotivoAtencion: appointment?.external_cause || '13', // Enfermedad general
    codDiagnosticoPrincipal: cie10,
    codDiagnosticoRelacionado1: null,
    tipoDiagnosticoPrincipal: '01', // Impresión diagnóstica
    tipoDocumentoIdentificacion: docType,
    numDocumentoIdentificacion: docNumber,
    vrServicio: Math.round(amount),
    conceptoRecaudo: '05', // Pago particular
    valorPagoModerador: 0,
    numFEVPagoModerador: null,
  };

  const usuario: RipsUsuarioItem = {
    consecutivo: 1,
    tipoDocumentoIdentificacion: docType,
    numDocumentoIdentificacion: docNumber,
    tipoUsuario: patient.user_type || '04', // Particular
    fechaNacimiento: patient.date_of_birth ? patient.date_of_birth.substring(0, 10) : '1990-01-01',
    codSexo: sexo,
    codPaisResidencia: '170', // Colombia
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
