/**
 * Catálogos Oficiales de Salud y Facturación para Colombia
 * Resoluciones 2275/2023, 510/2024 (MinSalud) y Normativa DIAN
 */

export interface CatalogItem {
  code: string;
  label: string;
  description?: string;
}

// 1. Tipos de Documento de Identificación en Salud (MinSalud)
export const COLOMBIA_DOCUMENT_TYPES: CatalogItem[] = [
  { code: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { code: 'TI', label: 'Tarjeta de Identidad (TI)' },
  { code: 'CE', label: 'Cédula de Extranjería (CE)' },
  { code: 'PPT', label: 'Permiso por Protección Temporal (PPT)' },
  { code: 'PA', label: 'Pasaporte (PA)' },
  { code: 'RC', label: 'Registro Civil (RC)' },
  { code: 'CD', label: 'Carné Diplomático (CD)' },
  { code: 'SC', label: 'Salvoconducto de Permanencia (SC)' },
];

// 2. Tipos de Usuario SGSSS (MinSalud)
export const COLOMBIA_USER_TYPES: CatalogItem[] = [
  { code: '04', label: 'Particular / No Asegurado', description: 'Atención privada / consulta particular' },
  { code: '01', label: 'Contributivo Cotizante', description: 'Afiliado cotizante al sistema de salud' },
  { code: '02', label: 'Contributivo Beneficiario', description: 'Beneficiario dependiente en régimen contributivo' },
  { code: '03', label: 'Subsidiado', description: 'Régimen subsidiado por el Estado' },
  { code: '05', label: 'Especial / Excepción', description: 'Magisterio, Fuerzas Militares, etc.' },
];

// 3. Zona Territorial de Residencia
export const COLOMBIA_RESIDENCE_ZONES: CatalogItem[] = [
  { code: '01', label: 'Urbana (Cabecera municipal)' },
  { code: '02', label: 'Rural (Centro poblado o rural disperso)' },
];

// 4. Modalidad de Prestación del Servicio (MinSalud)
export const COLOMBIA_SERVICE_MODALITIES: CatalogItem[] = [
  { code: '01', label: 'Intramural (Consultorio / Presencial)' },
  { code: '03', label: 'Telemedicina (Sesión Virtual / Online)' },
  { code: '02', label: 'Extramural (Domiciliaria)' },
];

// 5. Finalidad de la Consulta (MinSalud RIPS)
export const COLOMBIA_CONSULTATION_PURPOSES: CatalogItem[] = [
  { code: '10', label: 'Diagnóstico', description: 'Evaluación y diagnóstico psicológico' },
  { code: '14', label: 'Tratamiento', description: 'Intervención y proceso psicoterapéutico' },
  { code: '15', label: 'Promoción y Prevención', description: 'Cuidado de salud mental y psicoeducación' },
  { code: '16', label: 'Valoración Integral', description: 'Orientación y valoración clínica inicial' },
];

// 6. Causa Externa (MinSalud RIPS)
export const COLOMBIA_EXTERNAL_CAUSES: CatalogItem[] = [
  { code: '13', label: 'Enfermedad General (Predeterminada)' },
  { code: '15', label: 'Otra causa' },
  { code: '01', label: 'Accidente de trabajo' },
  { code: '14', label: 'Sospecha de violencia física / emocional' },
];

// 7. Códigos CUPS Principales para Psicología y Salud Mental
export const COLOMBIA_PSYCHOLOGY_CUPS: CatalogItem[] = [
  { 
    code: '943100', 
    label: 'Psicoterapia Individual (CUPS 943100)', 
    description: 'Sesión psicoterapéutica individual de evaluación o tratamiento.' 
  },
  { 
    code: '890208', 
    label: 'Consulta de Primera Vez por Psicología (CUPS 890208)', 
    description: 'Valoración inicial y apertura de historia clínica.' 
  },
  { 
    code: '890308', 
    label: 'Consulta de Control o Seguimiento por Psicología (CUPS 890308)', 
    description: 'Sesión periódica de evolución clínica.' 
  },
  { 
    code: '943801', 
    label: 'Psicoterapia de Familia (CUPS 943801)', 
    description: 'Intervención psicológica con el núcleo familiar.' 
  },
  { 
    code: '943802', 
    label: 'Psicoterapia de Pareja (CUPS 943802)', 
    description: 'Sesión de intervención vincular y de pareja.' 
  },
  { 
    code: '944001', 
    label: 'Evaluación y Test Psicométrico (CUPS 944001)', 
    description: 'Aplicación e interpretación de baterías psicológicas.' 
  },
];

// 8. Catálogo DANE (Divipola) - Principales Municipios de Colombia
export interface DaneCity {
  code: string;       // Código DANE 5 dígitos (ej: 11001)
  name: string;       // Nombre del Municipio
  department: string; // Departamento
  deptCode: string;   // Código Depto (ej: 11)
}

export const COLOMBIA_DANE_CITIES: DaneCity[] = [
  { code: '11001', name: 'Bogotá D.C.', department: 'Bogotá D.C.', deptCode: '11' },
  { code: '05001', name: 'Medellín', department: 'Antioquia', deptCode: '05' },
  { code: '76001', name: 'Cali', department: 'Valle del Cauca', deptCode: '76' },
  { code: '08001', name: 'Barranquilla', department: 'Atlántico', deptCode: '08' },
  { code: '13001', name: 'Cartagena de Indias', department: 'Bolívar', deptCode: '13' },
  { code: '68001', name: 'Bucaramanga', department: 'Santander', deptCode: '68' },
  { code: '66001', name: 'Pereira', department: 'Risaralda', deptCode: '66' },
  { code: '17001', name: 'Manizales', department: 'Caldas', deptCode: '17' },
  { code: '54001', name: 'Cúcuta', department: 'Norte de Santander', deptCode: '54' },
  { code: '73001', name: 'Ibagué', department: 'Tolima', deptCode: '73' },
  { code: '41001', name: 'Neiva', department: 'Huila', deptCode: '41' },
  { code: '50001', name: 'Villavicencio', department: 'Meta', deptCode: '50' },
  { code: '63001', name: 'Armenia', department: 'Quindío', deptCode: '63' },
  { code: '47001', name: 'Santa Marta', department: 'Magdalena', deptCode: '47' },
  { code: '23001', name: 'Montería', department: 'Córdoba', deptCode: '23' },
  { code: '19001', name: 'Popayán', department: 'Cauca', deptCode: '19' },
  { code: '52001', name: 'Pasto', department: 'Nariño', deptCode: '52' },
  { code: '20001', name: 'Valledupar', department: 'Cesar', deptCode: '20' },
  { code: '27001', name: 'Quibdó', department: 'Chocó', deptCode: '27' },
  { code: '70001', name: 'Sincelejo', department: 'Sucre', deptCode: '70' },
  { code: '15001', name: 'Tunja', department: 'Boyacá', deptCode: '15' },
  { code: '85001', name: 'Yopal', department: 'Casanare', deptCode: '85' },
  { code: '05088', name: 'Bello', department: 'Antioquia', deptCode: '05' },
  { code: '05360', name: 'Itagüí', department: 'Antioquia', deptCode: '05' },
  { code: '05266', name: 'Envigado', department: 'Antioquia', deptCode: '05' },
  { code: '05615', name: 'Rionegro', department: 'Antioquia', deptCode: '05' },
  { code: '05631', name: 'Sabaneta', department: 'Antioquia', deptCode: '05' },
  { code: '25175', name: 'Chía', department: 'Cundinamarca', deptCode: '25' },
  { code: '25899', name: 'Zipaquirá', department: 'Cundinamarca', deptCode: '25' },
  { code: '25754', name: 'Soacha', department: 'Cundinamarca', deptCode: '25' },
  { code: '25269', name: 'Facatativá', department: 'Cundinamarca', deptCode: '25' },
  { code: '68276', name: 'Floridablanca', department: 'Santander', deptCode: '68' },
  { code: '68307', name: 'Girón', department: 'Santander', deptCode: '68' },
  { code: '68547', name: 'Piedecuesta', department: 'Santander', deptCode: '68' },
  { code: '76520', name: 'Palmira', department: 'Valle del Cauca', deptCode: '76' },
  { code: '76111', name: 'Guadalajara de Buga', department: 'Valle del Cauca', deptCode: '76' },
  { code: '76834', name: 'Tuluá', department: 'Valle del Cauca', deptCode: '76' },
  { code: '66170', name: 'Dosquebradas', department: 'Risaralda', deptCode: '66' },
];

/**
 * Busca una ciudad por código DANE o coincidencia de nombre
 */
export function findDaneCity(queryOrCode: string): DaneCity | undefined {
  if (!queryOrCode) return undefined;
  const clean = queryOrCode.trim().toLowerCase();
  return COLOMBIA_DANE_CITIES.find(
    (c) => c.code === clean || c.name.toLowerCase() === clean
  );
}

/**
 * Formatea valores monetarios al estándar colombiano (COP sin centavos por defecto)
 * Ej: $ 150.000
 */
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}
