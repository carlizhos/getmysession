export type TestOption = {
  value: number;
  label: string;
};

export type TestQuestion = {
  id: string;
  text: string;
};

export type ScoringRule = {
  min: number;
  max: number;
  interpretation: string;
  color: string; // Tailwind color class for badges
};

export type PsychometricTest = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  options: TestOption[];
  questions: TestQuestion[];
  scoring: ScoringRule[];
};

export const psychometricTests: Record<string, PsychometricTest> = {
  'gad-7': {
    id: 'gad-7',
    name: 'GAD-7 (Trastorno de Ansiedad Generalizada)',
    description: 'Cuestionario breve para evaluar e identificar el trastorno de ansiedad generalizada.',
    instructions: 'Durante las últimas 2 semanas, ¿qué tan seguido le han molestado los siguientes problemas?',
    options: [
      { value: 0, label: 'Ningún día' },
      { value: 1, label: 'Varios días' },
      { value: 2, label: 'Más de la mitad de los días' },
      { value: 3, label: 'Casi todos los días' },
    ],
    questions: [
      { id: 'q1', text: 'Me he sentido nervioso(a), ansioso(a) o con los nervios de punta.' },
      { id: 'q2', text: 'No he podido dejar de preocuparme o no he podido controlar mi preocupación.' },
      { id: 'q3', text: 'Me he preocupado demasiado por diferentes cosas.' },
      { id: 'q4', text: 'He tenido dificultad para relajarme.' },
      { id: 'q5', text: 'Me he sentido tan inquieto(a) que no he podido quedarme quieto(a).' },
      { id: 'q6', text: 'Me he enojado o irritado fácilmente.' },
      { id: 'q7', text: 'He sentido miedo, como si algo terrible fuera a pasar.' },
    ],
    scoring: [
      { min: 0, max: 4, interpretation: 'Ansiedad Mínima', color: 'bg-green-100 text-green-800 border-green-200' },
      { min: 5, max: 9, interpretation: 'Ansiedad Leve', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      { min: 10, max: 14, interpretation: 'Ansiedad Moderada', color: 'bg-amber-100 text-amber-800 border-amber-200' },
      { min: 15, max: 21, interpretation: 'Ansiedad Severa', color: 'bg-red-100 text-red-800 border-red-200' },
    ],
  },
  'phq-9': {
    id: 'phq-9',
    name: 'PHQ-9 (Cuestionario sobre la Salud del Paciente)',
    description: 'Instrumento para detectar y evaluar la severidad de la depresión.',
    instructions: 'Durante las últimas 2 semanas, ¿qué tan seguido le han molestado los siguientes problemas?',
    options: [
      { value: 0, label: 'Ningún día' },
      { value: 1, label: 'Varios días' },
      { value: 2, label: 'Más de la mitad de los días' },
      { value: 3, label: 'Casi todos los días' },
    ],
    questions: [
      { id: 'q1', text: 'Poco interés o placer en hacer las cosas.' },
      { id: 'q2', text: 'Me he sentido decaído(a), deprimido(a) o sin esperanzas.' },
      { id: 'q3', text: 'He tenido dificultad para quedarme o mantenerme dormido(a), o he dormido demasiado.' },
      { id: 'q4', text: 'Me he sentido cansado(a) o con poca energía.' },
      { id: 'q5', text: 'He tenido poco apetito o he comido en exceso.' },
      { id: 'q6', text: 'Me he sentido mal conmigo mismo(a), o que soy un fracaso o que he decepcionado a mi familia.' },
      { id: 'q7', text: 'He tenido dificultad para concentrarme en cosas tales como leer el periódico o ver televisión.' },
      { id: 'q8', text: 'Me he movido o hablado tan lento que otras personas podrían haberlo notado. O por el contrario, he estado tan inquieto(a) o agitado(a) que me he estado moviendo mucho más de lo normal.' },
      { id: 'q9', text: 'He pensado que estaría mejor muerto(a) o que me gustaría lastimarme de alguna manera.' },
    ],
    scoring: [
      { min: 0, max: 4, interpretation: 'Depresión Mínima', color: 'bg-green-100 text-green-800 border-green-200' },
      { min: 5, max: 9, interpretation: 'Depresión Leve', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      { min: 10, max: 14, interpretation: 'Depresión Moderada', color: 'bg-amber-100 text-amber-800 border-amber-200' },
      { min: 15, max: 19, interpretation: 'Depresión Moderadamente Severa', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      { min: 20, max: 27, interpretation: 'Depresión Severa', color: 'bg-red-100 text-red-800 border-red-200' },
    ],
  }
};

export const evaluateTestScore = (testId: string, score: number) => {
  const test = psychometricTests[testId];
  if (!test) return null;
  
  return test.scoring.find(rule => score >= rule.min && score <= rule.max);
};
