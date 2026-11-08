/**
 * Directorio Oficial de Líneas de Atención en Crisis y Salud Mental de Colombia
 * Fuente: Ministerio de Salud y Protección Social, ICBF y Consejería Presidencial
 */

export interface CrisisLineItem {
  id: string;
  name: string;
  number: string;
  displayPhone: string;
  available: string;
  coverage: string;
  description: string;
  badge: string;
  isUrgent?: boolean;
  category: 'general' | 'infancia' | 'mujeres' | 'vital';
}

export const COLOMBIA_CRISIS_LINES: CrisisLineItem[] = [
  {
    id: 'nuse-123',
    name: 'Línea de Emergencias Nacional (NUSE 123)',
    number: '123',
    displayPhone: '123',
    available: '24 horas / 7 días',
    coverage: 'Nacional (Toda Colombia)',
    description: 'Para urgencias psiquiátricas con riesgo vital inminente, intentos de suicidio en curso o requerimiento de ambulancia médica inmediata.',
    badge: 'Riesgo Vital Inmediato',
    isUrgent: true,
    category: 'vital',
  },
  {
    id: 'minsalud-192',
    name: 'Línea Nacional de Salud Mental (MinSalud)',
    number: '192',
    displayPhone: '192 (Opción 4)',
    available: '24 horas / 7 días',
    coverage: 'Nacional (Marcación gratuita desde celular o fijo)',
    description: 'Atención psicológica de primeros auxilios emocionales, orientación ante depresión, ansiedad y crisis psicosociales prestada por psicólogos del Ministerio de Salud.',
    badge: 'MinSalud Oficial',
    category: 'general',
  },
  {
    id: 'linea-106',
    name: 'Línea 106 "El Poder de Ser Escuchado"',
    number: '106',
    displayPhone: '106',
    available: '24 horas / 7 días',
    coverage: 'Distrital y Departamental',
    description: 'Espacio de escucha y ayuda psicológica confidencial ante angustia, crisis familiares, ideación autolítica y problemas emocionales.',
    badge: 'Escucha Psicológica',
    category: 'general',
  },
  {
    id: 'icbf-141',
    name: 'Línea 141 (ICBF - Protección a la Niñez)',
    number: '141',
    displayPhone: '141 / 018000 918080',
    available: '24 horas / 7 días',
    coverage: 'Nacional (Gratuita)',
    description: 'Atención prioritaria y reporte de vulneración de derechos, violencia física o sexual, maltrato o crisis en niños, niñas y adolescentes (Ley 1098 de 2006).',
    badge: 'Menores y Familias',
    category: 'infancia',
  },
  {
    id: 'linea-155',
    name: 'Línea 155 (Orientación a Mujeres Víctimas de Violencia)',
    number: '155',
    displayPhone: '155',
    available: '24 horas / 7 días',
    coverage: 'Nacional (Policía Nacional / Equidad de la Mujer)',
    description: 'Orientación psicológica, jurídica y activación de ruta de protección urgente para mujeres víctimas de violencia intrafamiliar, sexual o Código Fucsia.',
    badge: 'Código Fucsia / Género',
    category: 'mujeres',
  },
  {
    id: 'linea-purpura-bogota',
    name: 'Línea Púrpura Distrital (Bogotá)',
    number: '018000112137',
    displayPhone: '01 8000 112 137 / WhatsApp 300 755 1846',
    available: '24 horas / 7 días',
    coverage: 'Bogotá D.C.',
    description: 'Atención psicológica profesional y acompañamiento en crisis para mujeres mayores de 18 años.',
    badge: 'Distrital Bogotá',
    category: 'mujeres',
  },
  {
    id: 'linea-amiga-medellin',
    name: 'Línea Amiga Salud Mental (Medellín)',
    number: '6044444448',
    displayPhone: '(604) 444 44 48 / 106',
    available: '24 horas / 7 días',
    coverage: 'Medellín y Área Metropolitana',
    description: 'Primeros auxilios psicológicos y activación de código dorado para atención psiquiátrica domiciliaria y hospitalaria en Medellín.',
    badge: 'Medellín / Antioquia',
    category: 'general',
  },
  {
    id: 'linea-cali',
    name: 'Línea 106 Te Cuida (Cali y Valle del Cauca)',
    number: '6026206819',
    displayPhone: '(602) 620 68 19 / WhatsApp 316 430 7501',
    available: '24 horas / 7 días',
    coverage: 'Cali y Valle del Cauca',
    description: 'Acompañamiento en crisis de salud mental y prevención del suicidio por la Secretaría de Salud del Valle.',
    badge: 'Cali / Valle',
    category: 'general',
  },
  {
    id: 'linea-vida-barranquilla',
    name: 'Línea de la Vida (Barranquilla y Atlántico)',
    number: '6053399999',
    displayPhone: '(605) 339 99 99 / 315 300 5203',
    available: '24 horas / 7 días',
    coverage: 'Barranquilla y Atlántico',
    description: 'Orientación psicológica y apoyo en crisis emocional por profesionales de salud mental de Barranquilla.',
    badge: 'Barranquilla / Caribe',
    category: 'general',
  },
];
