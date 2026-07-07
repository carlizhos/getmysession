export interface MSECategory {
  id: string;
  label: string;
  options: string[];
}

export const DEFAULT_MSE_CATEGORIES: MSECategory[] = [
  {
    id: 'apariencia',
    label: 'Apariencia',
    options: [
      'Adecuada',
      'Descuidada',
      'Edad aparente mayor a la cronológica',
      'Edad aparente menor a la cronológica'
    ]
  },
  {
    id: 'actitud',
    label: 'Actitud',
    options: ['Puntual', 'Colaborador', 'Hostil', 'Reservado']
  },
  {
    id: 'conciencia',
    label: 'Estado de conciencia',
    options: ['Alerta', 'Consciente']
  },
  {
    id: 'orientacion',
    label: 'Orientación',
    options: ['Tiempo', 'Lugar', 'Persona']
  },
  {
    id: 'lenguaje',
    label: 'Lenguaje',
    options: ['Claro', 'Coherente', 'Fluido', 'Congruente']
  },
  {
    id: 'pensamiento',
    label: 'Pensamiento',
    options: [
      'Juicio conservado',
      'Juicio alterado',
      'Ideas delirantes',
      'Alteraciones del curso del pensamiento'
    ]
  },
  {
    id: 'percepcion',
    label: 'Percepción',
    options: ['Sin alteraciones aparentes', 'Alucinaciones', 'Ilusiones']
  },
  {
    id: 'animo',
    label: 'Estado de ánimo y afecto',
    options: [
      'Eutímico',
      'Ansioso',
      'Deprimido',
      'Irritable',
      'Afecto congruente',
      'Afecto incongruente'
    ]
  },
  {
    id: 'riesgo',
    label: 'Riesgo',
    options: [
      'Sin ideación suicida',
      'Sin ideación homicida',
      'Ideación suicida presente',
      'Ideación homicida presente'
    ]
  }
];
