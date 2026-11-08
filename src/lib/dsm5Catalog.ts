/**
 * Catálogo Clínico DSM-5 con Homologación Automática a CIE-10 (OMS / MinSalud Colombia)
 * 
 * Normativa:
 * - Criterio Clínico: Manual Diagnóstico y Estadístico de los Trastornos Mentales (DSM-5 / APA)
 * - Validez Legal MinSalud: Resolución 2275 de 2023 (RIPS en salud) y Resolución 1995 de 1999 (Historia Clínica)
 * - Interoperabilidad: Cada entidad diagnóstica mapea su código DSM-5 a su respectivo código CIE-10 oficial.
 */

export interface DiagnosticItem {
  id: string;
  dsm5Code: string;          // Ej: "300.02"
  dsm5Title: string;         // Ej: "Trastorno de ansiedad generalizada"
  cie10Code: string;         // Ej: "F41.1" (para visualización e historia clínica)
  cie10RipsCode: string;     // Ej: "F411" (sin puntos, para validador MUV RIPS MinSalud)
  cie10Description: string;  // Descripción estándar en CIE-10
  category: string;          // Grupo nosológico
  synonyms: string[];        // Acrónimos, términos de búsqueda y palabras clave
}

export const DIAGNOSTIC_CATALOG: DiagnosticItem[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. TRASTORNOS DEL NEURODESARROLLO
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'tdah-combinado',
    dsm5Code: '314.01',
    dsm5Title: 'Trastorno por déficit de atención/hiperactividad (Presentación combinada)',
    cie10Code: 'F90.2',
    cie10RipsCode: 'F902',
    cie10Description: 'Trastorno hipercinético mixto (TDAH combinado)',
    category: 'Neurodesarrollo',
    synonyms: ['tdah', 'adhd', 'deficit de atencion', 'hiperactividad', 'inatencion', 'atencion'],
  },
  {
    id: 'tdah-inatento',
    dsm5Code: '314.00',
    dsm5Title: 'Trastorno por déficit de atención/hiperactividad (Predominantemente inatento)',
    cie10Code: 'F90.0',
    cie10RipsCode: 'F900',
    cie10Description: 'Perturbación de la actividad y de la atención (TDAH inatento)',
    category: 'Neurodesarrollo',
    synonyms: ['tdah', 'deficit de atencion', 'inatento', 'distraccion', 'concentracion'],
  },
  {
    id: 'tdah-hiperactivo',
    dsm5Code: '314.01',
    dsm5Title: 'Trastorno por déficit de atención/hiperactividad (Predominantemente hiperactivo/impulsivo)',
    cie10Code: 'F90.1',
    cie10RipsCode: 'F901',
    cie10Description: 'Trastorno hipercinético de la conducta',
    category: 'Neurodesarrollo',
    synonyms: ['tdah', 'hiperactividad', 'impulsividad', 'inquietud'],
  },
  {
    id: 'tea-autista',
    dsm5Code: '299.00',
    dsm5Title: 'Trastorno del espectro autista (TEA)',
    cie10Code: 'F84.0',
    cie10RipsCode: 'F840',
    cie10Description: 'Autismo infantil / Trastorno del espectro autista',
    category: 'Neurodesarrollo',
    synonyms: ['tea', 'autismo', 'autista', 'asperger', 'comunicacion social', 'neurodivergente'],
  },
  {
    id: 'sindrome-asperger',
    dsm5Code: '299.00',
    dsm5Title: 'Síndrome de Asperger (TEA Nivel 1)',
    cie10Code: 'F84.5',
    cie10RipsCode: 'F845',
    cie10Description: 'Síndrome de Asperger',
    category: 'Neurodesarrollo',
    synonyms: ['asperger', 'tea', 'autismo leve', 'alta funcionalidad'],
  },
  {
    id: 'discapacidad-intelectual-leve',
    dsm5Code: '317',
    dsm5Title: 'Discapacidad intelectual (Trastorno del desarrollo intelectual, leve)',
    cie10Code: 'F70.9',
    cie10RipsCode: 'F709',
    cie10Description: 'Retraso mental leve, deterioro del comportamiento nulo o mínimo',
    category: 'Neurodesarrollo',
    synonyms: ['retraso mental', 'discapacidad cognitiva', 'ci bajo'],
  },
  {
    id: 'trastorno-lenguaje',
    dsm5Code: '315.32',
    dsm5Title: 'Trastorno del lenguaje',
    cie10Code: 'F80.2',
    cie10RipsCode: 'F802',
    cie10Description: 'Trastorno del desarrollo de la recepción del lenguaje',
    category: 'Neurodesarrollo',
    synonyms: ['lenguaje', 'afasia del desarrollo', 'habla'],
  },
  {
    id: 'trastorno-aprendizaje-lectura',
    dsm5Code: '315.00',
    dsm5Title: 'Trastorno específico del aprendizaje con dificultades en la lectura (Dislexia)',
    cie10Code: 'F81.0',
    cie10RipsCode: 'F810',
    cie10Description: 'Trastorno específico de la lectura (dislexia)',
    category: 'Neurodesarrollo',
    synonyms: ['dislexia', 'aprendizaje', 'lectura'],
  },
  {
    id: 'trastorno-tics-tourette',
    dsm5Code: '307.23',
    dsm5Title: 'Trastorno de la Tourette',
    cie10Code: 'F95.2',
    cie10RipsCode: 'F952',
    cie10Description: 'Trastorno de tics motores y vocales combinados (Gilles de la Tourette)',
    category: 'Neurodesarrollo',
    synonyms: ['tourette', 'tics', 'coprolalia'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ESPECTRO DE LA ESQUIZOFRENIA Y OTROS TRASTORNOS PSICÓTICOS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'esquizofrenia',
    dsm5Code: '295.90',
    dsm5Title: 'Esquizofrenia',
    cie10Code: 'F20.9',
    cie10RipsCode: 'F209',
    cie10Description: 'Esquizofrenia, no especificada',
    category: 'Trastornos Psicóticos',
    synonyms: ['psicosis', 'alucinaciones', 'delirios', 'esquizofrenia'],
  },
  {
    id: 'esquizofrenia-paranoide',
    dsm5Code: '295.90',
    dsm5Title: 'Esquizofrenia paranoide',
    cie10Code: 'F20.0',
    cie10RipsCode: 'F200',
    cie10Description: 'Esquizofrenia paranoide',
    category: 'Trastornos Psicóticos',
    synonyms: ['paranoia', 'delirios de persecucion', 'esquizofrenia'],
  },
  {
    id: 'trastorno-esquizoafectivo-depresivo',
    dsm5Code: '295.70',
    dsm5Title: 'Trastorno esquizoafectivo, tipo depresivo',
    cie10Code: 'F25.1',
    cie10RipsCode: 'F251',
    cie10Description: 'Trastorno esquizoafectivo de tipo depresivo',
    category: 'Trastornos Psicóticos',
    synonyms: ['esquizoafectivo', 'psicosis afectiva', 'depresion con psicosis'],
  },
  {
    id: 'trastorno-esquizoafectivo-bipolar',
    dsm5Code: '295.70',
    dsm5Title: 'Trastorno esquizoafectivo, tipo bipolar',
    cie10Code: 'F25.0',
    cie10RipsCode: 'F250',
    cie10Description: 'Trastorno esquizoafectivo de tipo maníaco',
    category: 'Trastornos Psicóticos',
    synonyms: ['esquizoafectivo', 'bipolar psicotico', 'mania psicotica'],
  },
  {
    id: 'trastorno-delirante',
    dsm5Code: '297.1',
    dsm5Title: 'Trastorno delirante',
    cie10Code: 'F22.0',
    cie10RipsCode: 'F220',
    cie10Description: 'Trastorno de ideas delirantes',
    category: 'Trastornos Psicóticos',
    synonyms: ['ideas delirantes', 'paranoia', 'celotipia', 'erotomania', 'megalomania'],
  },
  {
    id: 'trastorno-psicotico-breve',
    dsm5Code: '298.8',
    dsm5Title: 'Trastorno psicótico breve',
    cie10Code: 'F23',
    cie10RipsCode: 'F23',
    cie10Description: 'Trastornos psicóticos agudos y transitorios',
    category: 'Trastornos Psicóticos',
    synonyms: ['brote psicotico', 'psicosis reactiva', 'crisis psicotica'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. TRASTORNO BIPOLAR Y TRASTORNOS RELACIONADOS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'bipolar-1-maniaco',
    dsm5Code: '296.42',
    dsm5Title: 'Trastorno bipolar I, episodio actual maníaco, moderado',
    cie10Code: 'F31.1',
    cie10RipsCode: 'F311',
    cie10Description: 'Trastorno bipolar, episodio maníaco sin síntomas psicóticos',
    category: 'Trastorno Bipolar',
    synonyms: ['tab', 'bipolar 1', 'mania', 'episodio maniaco'],
  },
  {
    id: 'bipolar-1-depresivo',
    dsm5Code: '296.52',
    dsm5Title: 'Trastorno bipolar I, episodio actual depresivo, moderado',
    cie10Code: 'F31.3',
    cie10RipsCode: 'F313',
    cie10Description: 'Trastorno bipolar, episodio depresivo leve o moderado',
    category: 'Trastorno Bipolar',
    synonyms: ['tab', 'bipolar 1', 'depresion bipolar', 'episodio depresivo bipolar'],
  },
  {
    id: 'bipolar-1-hipomaniaco',
    dsm5Code: '296.40',
    dsm5Title: 'Trastorno bipolar I, episodio actual hipomaníaco',
    cie10Code: 'F31.0',
    cie10RipsCode: 'F310',
    cie10Description: 'Trastorno bipolar, episodio hipomaníaco',
    category: 'Trastorno Bipolar',
    synonyms: ['hipomania', 'bipolar', 'tab'],
  },
  {
    id: 'bipolar-2',
    dsm5Code: '296.89',
    dsm5Title: 'Trastorno bipolar II (Episodios hipomaníacos y depresivos mayores)',
    cie10Code: 'F31.81',
    cie10RipsCode: 'F318',
    cie10Description: 'Otros trastornos bipolares (Trastorno bipolar II)',
    category: 'Trastorno Bipolar',
    synonyms: ['tab 2', 'bipolar ii', 'bipolar 2', 'hipomania y depresion'],
  },
  {
    id: 'ciclotimia',
    dsm5Code: '301.13',
    dsm5Title: 'Trastorno ciclotímico',
    cie10Code: 'F34.0',
    cie10RipsCode: 'F340',
    cie10Description: 'Ciclotimia',
    category: 'Trastorno Bipolar',
    synonyms: ['ciclotimia', 'inestabilidad afectiva', 'cambios de humor'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. TRASTORNOS DEPRESIVOS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'depresion-mayor-unico-moderado',
    dsm5Code: '296.22',
    dsm5Title: 'Trastorno de depresión mayor, episodio único, moderado',
    cie10Code: 'F32.1',
    cie10RipsCode: 'F321',
    cie10Description: 'Episodio depresivo moderado',
    category: 'Trastornos Depresivos',
    synonyms: ['tdm', 'depresion mayor', 'tristeza profunda', 'anhedonia', 'depresion moderada'],
  },
  {
    id: 'depresion-mayor-unico-leve',
    dsm5Code: '296.21',
    dsm5Title: 'Trastorno de depresión mayor, episodio único, leve',
    cie10Code: 'F32.0',
    cie10RipsCode: 'F320',
    cie10Description: 'Episodio depresivo leve',
    category: 'Trastornos Depresivos',
    synonyms: ['tdm', 'depresion leve', 'desanimo', 'tristeza'],
  },
  {
    id: 'depresion-mayor-unico-grave',
    dsm5Code: '296.23',
    dsm5Title: 'Trastorno de depresión mayor, episodio único, grave sin síntomas psicóticos',
    cie10Code: 'F32.2',
    cie10RipsCode: 'F322',
    cie10Description: 'Episodio depresivo grave sin síntomas psicóticos',
    category: 'Trastornos Depresivos',
    synonyms: ['tdm', 'depresion grave', 'ideacion suicida', 'depresion severa'],
  },
  {
    id: 'depresion-mayor-unico-psicotico',
    dsm5Code: '296.24',
    dsm5Title: 'Trastorno de depresión mayor, episodio único, grave con síntomas psicóticos',
    cie10Code: 'F32.3',
    cie10RipsCode: 'F323',
    cie10Description: 'Episodio depresivo grave con síntomas psicóticos',
    category: 'Trastornos Depresivos',
    synonyms: ['depresion psicotica', 'delirios de ruina', 'depresion severa'],
  },
  {
    id: 'depresion-mayor-recurrente-moderado',
    dsm5Code: '296.32',
    dsm5Title: 'Trastorno de depresión mayor, recurrente, moderado',
    cie10Code: 'F33.1',
    cie10RipsCode: 'F331',
    cie10Description: 'Trastorno depresivo recurrente, episodio actual moderado',
    category: 'Trastornos Depresivos',
    synonyms: ['tdm recurrente', 'depresion recurrente', 'recaida depresiva'],
  },
  {
    id: 'depresion-mayor-recurrente-grave',
    dsm5Code: '296.33',
    dsm5Title: 'Trastorno de depresión mayor, recurrente, grave sin síntomas psicóticos',
    cie10Code: 'F33.2',
    cie10RipsCode: 'F332',
    cie10Description: 'Trastorno depresivo recurrente, episodio actual grave',
    category: 'Trastornos Depresivos',
    synonyms: ['tdm severo', 'depresion cronica recurrente'],
  },
  {
    id: 'distimia',
    dsm5Code: '300.4',
    dsm5Title: 'Trastorno depresivo persistente (Distimia)',
    cie10Code: 'F34.1',
    cie10RipsCode: 'F341',
    cie10Description: 'Distimia',
    category: 'Trastornos Depresivos',
    synonyms: ['distimia', 'depresion persistente', 'desanimo cronico'],
  },
  {
    id: 'disforico-premenstrual',
    dsm5Code: '625.4',
    dsm5Title: 'Trastorno disfórico premenstrual (TDPM)',
    cie10Code: 'N94.3',
    cie10RipsCode: 'N943',
    cie10Description: 'Síndrome de tensión premenstrual / Trastorno disfórico',
    category: 'Trastornos Depresivos',
    synonyms: ['tdpm', 'sindrome premenstrual', 'disforia premenstrual', 'irritabilidad menstrual'],
  },
  {
    id: 'desregulacion-estado-animo',
    dsm5Code: '296.99',
    dsm5Title: 'Trastorno de desregulación disruptiva del estado de ánimo',
    cie10Code: 'F34.8',
    cie10RipsCode: 'F348',
    cie10Description: 'Otros trastornos del humor (afectivos) persistentes',
    category: 'Trastornos Depresivos',
    synonyms: ['rabietas infantiles', 'irritabilidad cronica', 'desregulacion emocional'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. TRASTORNOS DE ANSIEDAD
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'ansiedad-generalizada',
    dsm5Code: '300.02',
    dsm5Title: 'Trastorno de ansiedad generalizada (TAG)',
    cie10Code: 'F41.1',
    cie10RipsCode: 'F411',
    cie10Description: 'Trastorno de ansiedad generalizada',
    category: 'Trastornos de Ansiedad',
    synonyms: ['tag', 'ansiedad', 'preocupacion excesiva', 'angustia', 'tension', 'nerviosismo'],
  },
  {
    id: 'trastorno-panico',
    dsm5Code: '300.01',
    dsm5Title: 'Trastorno de pánico',
    cie10Code: 'F41.0',
    cie10RipsCode: 'F410',
    cie10Description: 'Trastorno de pánico (ansiedad paroxística episódica)',
    category: 'Trastornos de Ansiedad',
    synonyms: ['panico', 'ataque de panico', 'crisis de angustia', 'crisis de panico', 'palpitaciones'],
  },
  {
    id: 'agorafobia',
    dsm5Code: '300.22',
    dsm5Title: 'Agorafobia',
    cie10Code: 'F40.0',
    cie10RipsCode: 'F400',
    cie10Description: 'Agorafobia sin trastorno de pánico',
    category: 'Trastornos de Ansiedad',
    synonyms: ['agorafobia', 'miedo a espacios abiertos', 'miedo al transporte', 'miedo a multitudes'],
  },
  {
    id: 'fobia-social',
    dsm5Code: '300.23',
    dsm5Title: 'Trastorno de ansiedad social (Fobia social)',
    cie10Code: 'F40.1',
    cie10RipsCode: 'F401',
    cie10Description: 'Fobias sociales',
    category: 'Trastornos de Ansiedad',
    synonyms: ['fobia social', 'ansiedad social', 'timidez extrema', 'miedo escenico', 'miedo a ser evaluado'],
  },
  {
    id: 'fobia-especifica',
    dsm5Code: '300.29',
    dsm5Title: 'Fobia específica (Animal, ambiental, sangre-inyecciones, situacional)',
    cie10Code: 'F40.2',
    cie10RipsCode: 'F402',
    cie10Description: 'Fobias específicas (aisladas)',
    category: 'Trastornos de Ansiedad',
    synonyms: ['fobia', 'claustrofobia', 'aerofobia', 'miedo a volar', 'aracnofobia', 'zoofobia'],
  },
  {
    id: 'ansiedad-por-separacion',
    dsm5Code: '309.21',
    dsm5Title: 'Trastorno de ansiedad por separación',
    cie10Code: 'F93.0',
    cie10RipsCode: 'F930',
    cie10Description: 'Trastorno de ansiedad de separación en la niñez',
    category: 'Trastornos de Ansiedad',
    synonyms: ['ansiedad de separacion', 'apego angustioso', 'miedo a quedarse solo'],
  },
  {
    id: 'mutismo-selectivo',
    dsm5Code: '312.23',
    dsm5Title: 'Mutismo selectivo',
    cie10Code: 'F94.0',
    cie10RipsCode: 'F940',
    cie10Description: 'Mutismo selectivo',
    category: 'Trastornos de Ansiedad',
    synonyms: ['mutismo', 'no habla en publico', 'silencio selectivo'],
  },
  {
    id: 'ansiedad-mixta-depresiva',
    dsm5Code: '300.00',
    dsm5Title: 'Trastorno mixto ansioso-depresivo',
    cie10Code: 'F41.2',
    cie10RipsCode: 'F412',
    cie10Description: 'Trastorno mixto ansioso-depresivo',
    category: 'Trastornos de Ansiedad',
    synonyms: ['ansioso depresivo', 'ansiedad con tristeza', 'mixto'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 6. TRASTORNO OBSESIVO-COMPULSIVO Y TRASTORNOS RELACIONADOS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'toc',
    dsm5Code: '300.3',
    dsm5Title: 'Trastorno obsesivo-compulsivo (TOC)',
    cie10Code: 'F42',
    cie10RipsCode: 'F42',
    cie10Description: 'Trastorno obsesivo-compulsivo (TOC)',
    category: 'Obsesivo-Compulsivo',
    synonyms: ['toc', 'obsesiones', 'compulsiones', 'rituales', 'rumiacion', 'limpieza compulsiva', 'verificacion'],
  },
  {
    id: 'dismorfico-corporal',
    dsm5Code: '300.7',
    dsm5Title: 'Trastorno dismórfico corporal',
    cie10Code: 'F45.22',
    cie10RipsCode: 'F452',
    cie10Description: 'Trastorno dismórfico corporal / Hipocondría',
    category: 'Obsesivo-Compulsivo',
    synonyms: ['dismorfofobia', 'defecto fisico imaginado', 'obsesion con apariencia', 'complejo estetico'],
  },
  {
    id: 'trastorno-acumulacion',
    dsm5Code: '300.3',
    dsm5Title: 'Trastorno de acumulación (Síndrome de acaparamiento)',
    cie10Code: 'F42.3',
    cie10RipsCode: 'F423',
    cie10Description: 'Trastorno de acumulación',
    category: 'Obsesivo-Compulsivo',
    synonyms: ['acumulacion compulsiva', 'sindrome de diogenes', 'acaparador'],
  },
  {
    id: 'tricotilomania',
    dsm5Code: '312.39',
    dsm5Title: 'Tricotilomanía (Trastorno de arrancarse el pelo)',
    cie10Code: 'F63.3',
    cie10RipsCode: 'F633',
    cie10Description: 'Tricotilomanía',
    category: 'Obsesivo-Compulsivo',
    synonyms: ['arrancarse el cabello', 'pelo', 'tricotilomania'],
  },
  {
    id: 'excoriacion',
    dsm5Code: '698.4',
    dsm5Title: 'Trastorno de excoriación (Rascarse la piel)',
    cie10Code: 'L98.1',
    cie10RipsCode: 'L981',
    cie10Description: 'Dermatitis facticia / Excoriación neurótica',
    category: 'Obsesivo-Compulsivo',
    synonyms: ['rascarse la piel', 'pellizcarse', 'dermatilomania'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 7. TRASTORNOS RELACIONADOS CON TRAUMAS Y FACTORES DE ESTRÉS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'tept',
    dsm5Code: '309.81',
    dsm5Title: 'Trastorno de estrés postraumático (TEPT)',
    cie10Code: 'F43.1',
    cie10RipsCode: 'F431',
    cie10Description: 'Trastorno de estrés postraumático (TEPT)',
    category: 'Trauma y Estrés',
    synonyms: ['tept', 'ptsd', 'trauma', 'flashbacks', 'abuso', 'violencia', 'accidente', 'pesadillas'],
  },
  {
    id: 'estres-agudo',
    dsm5Code: '308.3',
    dsm5Title: 'Trastorno de estrés agudo',
    cie10Code: 'F43.0',
    cie10RipsCode: 'F430',
    cie10Description: 'Reacción al estrés agudo',
    category: 'Trauma y Estrés',
    synonyms: ['estres agudo', 'crisis emocional', 'impacto emocional agudo', 'shock'],
  },
  {
    id: 'trastorno-adaptacion-depresivo',
    dsm5Code: '309.0',
    dsm5Title: 'Trastorno de adaptación con estado de ánimo depresivo',
    cie10Code: 'F43.20',
    cie10RipsCode: 'F432',
    cie10Description: 'Reacción depresiva breve / Trastornos de adaptación',
    category: 'Trauma y Estrés',
    synonyms: ['adaptacion', 'duelo', 'ruptura', 'divorcio', 'cambio de pais', 'migracion'],
  },
  {
    id: 'trastorno-adaptacion-ansioso',
    dsm5Code: '309.24',
    dsm5Title: 'Trastorno de adaptación con ansiedad',
    cie10Code: 'F43.28',
    cie10RipsCode: 'F432',
    cie10Description: 'Trastorno de adaptación con otros síntomas especificados',
    category: 'Trauma y Estrés',
    synonyms: ['adaptacion con ansiedad', 'estres por cambio', 'ansiedad situacional'],
  },
  {
    id: 'trastorno-adaptacion-mixto',
    dsm5Code: '309.28',
    dsm5Title: 'Trastorno de adaptación mixto, con ansiedad y estado de ánimo depresivo',
    cie10Code: 'F43.22',
    cie10RipsCode: 'F432',
    cie10Description: 'Reacción mixta de ansiedad y depresión (adaptativa)',
    category: 'Trauma y Estrés',
    synonyms: ['adaptacion mixta', 'ruptura amorosa', 'estres vital', 'desempleo'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 8. TRASTORNOS DISOCIATIVOS Y DE SÍNTOMAS SOMÁTICOS
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'amnesia-disociativa',
    dsm5Code: '300.12',
    dsm5Title: 'Amnesia disociativa',
    cie10Code: 'F44.0',
    cie10RipsCode: 'F440',
    cie10Description: 'Amnesia disociativa',
    category: 'Trastornos Disociativos',
    synonyms: ['amnesia', 'olvido postraumatico', 'bloqueo de memoria'],
  },
  {
    id: 'despersonalizacion-desrealizacion',
    dsm5Code: '300.6',
    dsm5Title: 'Trastorno de despersonalización / desrealización',
    cie10Code: 'F48.1',
    cie10RipsCode: 'F481',
    cie10Description: 'Síndrome de despersonalización-desrealización',
    category: 'Trastornos Disociativos',
    synonyms: ['despersonalizacion', 'desrealizacion', 'sentirse fuera del cuerpo', 'irrealidad'],
  },
  {
    id: 'sintomas-somaticos',
    dsm5Code: '300.82',
    dsm5Title: 'Trastorno de síntomas somáticos',
    cie10Code: 'F45.1',
    cie10RipsCode: 'F451',
    cie10Description: 'Trastorno somatomorfo indiferenciado',
    category: 'Síntomas Somáticos',
    synonyms: ['somatizacion', 'dolor psicogeno', 'sintomas fisicos sin causa medica'],
  },
  {
    id: 'ansiedad-por-enfermedad',
    dsm5Code: '300.7',
    dsm5Title: 'Trastorno de ansiedad por enfermedad (Hipocondría)',
    cie10Code: 'F45.2',
    cie10RipsCode: 'F452',
    cie10Description: 'Trastorno hipocondríaco',
    category: 'Síntomas Somáticos',
    synonyms: ['hipocondria', 'miedo a estar enfermo', 'obsesion con enfermedades', 'cancerofobia'],
  },
  {
    id: 'trastorno-conversion',
    dsm5Code: '300.11',
    dsm5Title: 'Trastorno de síntomas neurológicos funcionales (Conversión)',
    cie10Code: 'F44.4',
    cie10RipsCode: 'F444',
    cie10Description: 'Trastornos disociativos del movimiento',
    category: 'Síntomas Somáticos',
    synonyms: ['conversion', 'paralisis conversiva', 'crisis no epilepticas psicogenas'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 9. CONDUCTA ALIMENTARIA Y DEL SUEÑO
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'anorexia-restrictiva',
    dsm5Code: '307.1',
    dsm5Title: 'Anorexia nerviosa, tipo restrictivo',
    cie10Code: 'F50.0',
    cie10RipsCode: 'F500',
    cie10Description: 'Anorexia nerviosa',
    category: 'Conducta Alimentaria',
    synonyms: ['anorexia', 'tca', 'restriccion alimentaria', 'miedo a engordar', 'peso'],
  },
  {
    id: 'bulimia-nerviosa',
    dsm5Code: '307.51',
    dsm5Title: 'Bulimia nerviosa',
    cie10Code: 'F50.2',
    cie10RipsCode: 'F502',
    cie10Description: 'Bulimia nerviosa',
    category: 'Conducta Alimentaria',
    synonyms: ['bulimia', 'tca', 'atracones y purgas', 'vomito provocado', 'laxantes'],
  },
  {
    id: 'trastorno-atracones',
    dsm5Code: '307.51',
    dsm5Title: 'Trastorno por atracón',
    cie10Code: 'F50.8',
    cie10RipsCode: 'F508',
    cie10Description: 'Otros trastornos de la conducta alimentaria (Atracones)',
    category: 'Conducta Alimentaria',
    synonyms: ['atracon', 'comer compulsivo', 'ansiedad por comer', 'binge eating'],
  },
  {
    id: 'insomnio-cronico',
    dsm5Code: '780.52',
    dsm5Title: 'Trastorno de insomnio',
    cie10Code: 'F51.0',
    cie10RipsCode: 'F510',
    cie10Description: 'Insomnio no orgánico',
    category: 'Sueño-Vigilia',
    synonyms: ['insomnio', 'dificultad para dormir', 'despertares nocturnos', 'sueno ligero'],
  },
  {
    id: 'pesadillas',
    dsm5Code: '307.47',
    dsm5Title: 'Trastorno de pesadillas',
    cie10Code: 'F51.5',
    cie10RipsCode: 'F515',
    cie10Description: 'Pesadillas',
    category: 'Sueño-Vigilia',
    synonyms: ['pesadillas', 'terrores nocturnos', 'despertares angustiosos'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 10. TRASTORNOS DE LA PERSONALIDAD
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'tlp-limite',
    dsm5Code: '301.83',
    dsm5Title: 'Trastorno de la personalidad límite (TLP / Borderline)',
    cie10Code: 'F60.3',
    cie10RipsCode: 'F603',
    cie10Description: 'Trastorno de personalidad emocionalmente inestable — tipo límite (TLP)',
    category: 'Personalidad',
    synonyms: ['tlp', 'borderline', 'limite', 'inestabilidad emocional', 'autolesiones', 'miedo al abandono', 'impulsividad'],
  },
  {
    id: 'personalidad-narcisista',
    dsm5Code: '301.81',
    dsm5Title: 'Trastorno de la personalidad narcisista',
    cie10Code: 'F60.8',
    cie10RipsCode: 'F608',
    cie10Description: 'Trastorno de personalidad narcisista / Otros trastornos de personalidad',
    category: 'Personalidad',
    synonyms: ['narcisismo', 'narcisista', 'grandiosidad', 'falta de empatia'],
  },
  {
    id: 'personalidad-evitativa',
    dsm5Code: '301.82',
    dsm5Title: 'Trastorno de la personalidad evitativa',
    cie10Code: 'F60.6',
    cie10RipsCode: 'F606',
    cie10Description: 'Trastorno de personalidad ansioso (evitativo)',
    category: 'Personalidad',
    synonyms: ['evitativa', 'inhibicion social', 'miedo al rechazo', 'hipersensibilidad'],
  },
  {
    id: 'personalidad-dependiente',
    dsm5Code: '301.6',
    dsm5Title: 'Trastorno de la personalidad dependiente',
    cie10Code: 'F60.7',
    cie10RipsCode: 'F607',
    cie10Description: 'Trastorno de personalidad dependiente',
    category: 'Personalidad',
    synonyms: ['dependencia emocional', 'sumision', 'apego dependiente', 'miedo a la soledad'],
  },
  {
    id: 'personalidad-obsesivo-compulsiva',
    dsm5Code: '301.4',
    dsm5Title: 'Trastorno de la personalidad obsesivo-compulsiva (TPOC)',
    cie10Code: 'F60.5',
    cie10RipsCode: 'F605',
    cie10Description: 'Trastorno de personalidad anancástico (obsesivo)',
    category: 'Personalidad',
    synonyms: ['tpoc', 'anancastico', 'perfeccionismo rigido', 'control', 'inflexibilidad'],
  },
  {
    id: 'personalidad-histrionica',
    dsm5Code: '301.50',
    dsm5Title: 'Trastorno de la personalidad histriónica',
    cie10Code: 'F60.4',
    cie10RipsCode: 'F604',
    cie10Description: 'Trastorno de personalidad histriónico',
    category: 'Personalidad',
    synonyms: ['histrionico', 'busqueda de atencion', 'seduccion', 'teatralidad'],
  },
  {
    id: 'personalidad-antisocial',
    dsm5Code: '301.7',
    dsm5Title: 'Trastorno de la personalidad antisocial (Psicopatía / Sociopatía)',
    cie10Code: 'F60.2',
    cie10RipsCode: 'F602',
    cie10Description: 'Trastorno de personalidad antisocial (disocial)',
    category: 'Personalidad',
    synonyms: ['antisocial', 'sociopatia', 'psicopatia', 'violacion de normas', 'falta de remordimiento'],
  },
  {
    id: 'personalidad-paranoide',
    dsm5Code: '301.0',
    dsm5Title: 'Trastorno de la personalidad paranoide',
    cie10Code: 'F60.0',
    cie10RipsCode: 'F600',
    cie10Description: 'Trastorno de personalidad paranoide',
    category: 'Personalidad',
    synonyms: ['paranoide', 'desconfianza extrema', 'sospecha de traicion'],
  },
  {
    id: 'personalidad-esquizoide',
    dsm5Code: '301.20',
    dsm5Title: 'Trastorno de la personalidad esquizoide',
    cie10Code: 'F60.1',
    cie10RipsCode: 'F601',
    cie10Description: 'Trastorno de personalidad esquizoide',
    category: 'Personalidad',
    synonyms: ['esquizoide', 'desapego social', 'frialdad emocional', 'aislamiento'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 11. SUSTANCIAS PSICOACTIVAS Y ADICCIONES
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'dependencia-alcohol',
    dsm5Code: '303.90',
    dsm5Title: 'Trastorno por consumo de alcohol, moderado o grave',
    cie10Code: 'F10.2',
    cie10RipsCode: 'F102',
    cie10Description: 'Síndrome de dependencia al alcohol',
    category: 'Sustancias y Adicciones',
    synonyms: ['alcoholismo', 'dependencia al alcohol', 'bebedor', 'craving'],
  },
  {
    id: 'abuso-alcohol',
    dsm5Code: '305.00',
    dsm5Title: 'Trastorno por consumo de alcohol, leve',
    cie10Code: 'F10.1',
    cie10RipsCode: 'F101',
    cie10Description: 'Uso nocivo de alcohol',
    category: 'Sustancias y Adicciones',
    synonyms: ['consumo perjudicial de alcohol', 'borracheras', 'abuso de alcohol'],
  },
  {
    id: 'dependencia-cannabis',
    dsm5Code: '304.30',
    dsm5Title: 'Trastorno por consumo de cannabis',
    cie10Code: 'F12.2',
    cie10RipsCode: 'F122',
    cie10Description: 'Síndrome de dependencia a cannabinoides',
    category: 'Sustancias y Adicciones',
    synonyms: ['marihuana', 'cannabis', 'thc', 'adiccion a la hierba'],
  },
  {
    id: 'dependencia-cocaina',
    dsm5Code: '304.50',
    dsm5Title: 'Trastorno por consumo de estimulantes (Cocaína)',
    cie10Code: 'F14.2',
    cie10RipsCode: 'F142',
    cie10Description: 'Síndrome de dependencia a la cocaína',
    category: 'Sustancias y Adicciones',
    synonyms: ['cocaina', 'perico', 'estimulantes', 'adiccion'],
  },
  {
    id: 'ludopatia-juego',
    dsm5Code: '312.31',
    dsm5Title: 'Juego patológico (Ludopatía)',
    cie10Code: 'F63.0',
    cie10RipsCode: 'F630',
    cie10Description: 'Juego patológico',
    category: 'Sustancias y Adicciones',
    synonyms: ['ludopatia', 'adiccion al juego', 'apuestas', 'casino'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 12. OTROS PROBLEMAS CLÍNICOS / FACTORES PSICOSOCIALES (CÓDIGOS Z / V)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'duelo-no-complicado',
    dsm5Code: 'V62.82',
    dsm5Title: 'Duelo no complicado',
    cie10Code: 'Z63.4',
    cie10RipsCode: 'Z634',
    cie10Description: 'Desaparición o muerte de un familiar (Duelo)',
    category: 'Factores Psicosociales',
    synonyms: ['duelo', 'luto', 'perdida de familiar', 'fallecimiento', 'muerte'],
  },
  {
    id: 'problemas-pareja',
    dsm5Code: 'V61.10',
    dsm5Title: 'Problema de relación con el cónyuge o pareja',
    cie10Code: 'Z63.0',
    cie10RipsCode: 'Z630',
    cie10Description: 'Problemas en las relaciones entre cónyuges o parejas',
    category: 'Factores Psicosociales',
    synonyms: ['terapia de pareja', 'conflicto marital', 'separacion', 'infidelidad', 'comunicacion pareja'],
  },
  {
    id: 'problemas-padres-hijos',
    dsm5Code: 'V61.20',
    dsm5Title: 'Problema de relación entre padres e hijos',
    cie10Code: 'Z62.8',
    cie10RipsCode: 'Z628',
    cie10Description: 'Otros problemas especificados relacionados con la crianza del niño',
    category: 'Factores Psicosociales',
    synonyms: ['crianza', 'conflicto familiar', 'adolescencia', 'limites'],
  },
  {
    id: 'burnout-agotamiento',
    dsm5Code: 'Z73.0',
    dsm5Title: 'Agotamiento vital / Síndrome de desgaste laboral (Burnout)',
    cie10Code: 'Z73.0',
    cie10RipsCode: 'Z730',
    cie10Description: 'Agotamiento (burnout / síndrome de desgaste profesional)',
    category: 'Factores Psicosociales',
    synonyms: ['burnout', 'estres laboral', 'agotamiento', 'sobrecarga de trabajo', 'fatiga mental'],
  },
  {
    id: 'acentuacion-rasgos',
    dsm5Code: 'Z73.1',
    dsm5Title: 'Acentuación de rasgos de la personalidad',
    cie10Code: 'Z73.1',
    cie10RipsCode: 'Z731',
    cie10Description: 'Acentuación de rasgos de la personalidad',
    category: 'Factores Psicosociales',
    synonyms: ['rasgos de personalidad', 'caracter', 'rigidez'],
  },
  {
    id: 'problemas-laborales',
    dsm5Code: 'V62.29',
    dsm5Title: 'Otros problemas relacionados con el empleo',
    cie10Code: 'Z56.6',
    cie10RipsCode: 'Z566',
    cie10Description: 'Otras dificultades físicas y mentales relacionadas con el trabajo',
    category: 'Factores Psicosociales',
    synonyms: ['acoso laboral', 'mobbing', 'desempleo', 'cambio de empleo'],
  },
  {
    id: 'problema-academico',
    dsm5Code: 'V62.3',
    dsm5Title: 'Problema académico o educativo',
    cie10Code: 'Z55.9',
    cie10RipsCode: 'Z559',
    cie10Description: 'Problema no especificado relacionado con la educación y la alfabetización',
    category: 'Factores Psicosociales',
    synonyms: ['bajo rendimiento academico', 'universidad', 'colegio', 'estres por examenes'],
  },
  {
    id: 'ruptura-sentimental',
    dsm5Code: 'V61.03',
    dsm5Title: 'Ruptura familiar por separación o divorcio',
    cie10Code: 'Z63.5',
    cie10RipsCode: 'Z635',
    cie10Description: 'Ruptura familiar por separación o divorcio',
    category: 'Factores Psicosociales',
    synonyms: ['ruptura sentimental', 'divorcio', 'separacion conyugal', 'tusa'],
  },
];

/**
 * Normaliza una cadena quitando tildes y diacríticos para búsqueda tolerante
 */
export function normalizeSearchText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Motor de búsqueda inteligente para diagnósticos (DSM-5 / CIE-10)
 * Soporta búsqueda por:
 * - Código DSM-5 (ej: "300.02")
 * - Código CIE-10 (ej: "F41.1" o "F411")
 * - Título / Descripción
 * - Acrónimos (TAG, TDAH, TOC, TLP, TEPT)
 * - Categoría
 */
export function searchDiagnostics(query: string, limit = 15): DiagnosticItem[] {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = normalizeSearchText(query);
  const codeQuery = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  return DIAGNOSTIC_CATALOG.filter((item) => {
    // 1. Coincidencia directa por código DSM-5
    if (item.dsm5Code.toLowerCase().includes(cleanQuery)) return true;

    // 2. Coincidencia directa por código CIE-10
    if (item.cie10Code.toLowerCase().includes(cleanQuery)) return true;
    if (codeQuery.length >= 3 && item.cie10RipsCode.includes(codeQuery)) return true;

    // 3. Título DSM-5 y CIE-10 normalizado
    const normTitle = normalizeSearchText(item.dsm5Title);
    const normCie = normalizeSearchText(item.cie10Description);
    if (normTitle.includes(cleanQuery) || normCie.includes(cleanQuery)) return true;

    // 4. Categoría
    if (normalizeSearchText(item.category).includes(cleanQuery)) return true;

    // 5. Acrónimos y sinónimos
    return item.synonyms.some((syn) => normalizeSearchText(syn).includes(cleanQuery));
  }).slice(0, limit);
}

/**
 * Busca una entidad por código DSM-5 exacto
 */
export function findDiagnosticByDsm5(code: string): DiagnosticItem | undefined {
  if (!code) return undefined;
  const clean = code.trim().toLowerCase();
  return DIAGNOSTIC_CATALOG.find((d) => d.dsm5Code.toLowerCase() === clean);
}

/**
 * Busca una entidad por código CIE-10 (con o sin puntos)
 */
export function findDiagnosticByCie10(code: string): DiagnosticItem | undefined {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return DIAGNOSTIC_CATALOG.find((d) => d.cie10RipsCode === clean || d.cie10Code.replace(/[^A-Z0-9]/g, '') === clean);
}
