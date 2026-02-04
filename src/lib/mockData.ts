// Mock data for the clinical management platform
import { 
  CalendarDays, 
  Users, 
  Brain, 
  FileText, 
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  tags: string[];
  lastSession: string;
  nextSession?: string;
  notes: string;
  createdAt: string;
  avatar?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  type: string;
  fee: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  notes?: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string;
  content: string;
  aiSummary?: string;
  format: 'SOAP' | 'BIRP' | 'DAP' | 'TCC' | 'libre';
  createdAt: string;
}

export interface Transaction {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string;
  amount: number;
  method: 'cash' | 'transfer' | 'card';
  date: string;
  status: 'completed' | 'pending';
}

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'María García López',
    email: 'maria.garcia@email.com',
    phone: '+34 612 345 678',
    dateOfBirth: '1990-05-15',
    tags: ['Ansiedad', 'TCC', 'Alta Prioridad'],
    lastSession: '2024-01-20',
    nextSession: '2024-01-27',
    notes: 'Progreso significativo en técnicas de respiración',
    createdAt: '2023-06-01',
  },
  {
    id: '2',
    name: 'Carlos Rodríguez Martín',
    email: 'carlos.rodriguez@email.com',
    phone: '+34 623 456 789',
    dateOfBirth: '1985-08-22',
    tags: ['Depresión', 'Seguimiento'],
    lastSession: '2024-01-18',
    nextSession: '2024-01-25',
    notes: 'Ajuste de estrategias de afrontamiento',
    createdAt: '2023-09-15',
  },
  {
    id: '3',
    name: 'Ana Fernández Ruiz',
    email: 'ana.fernandez@email.com',
    phone: '+34 634 567 890',
    dateOfBirth: '1978-12-03',
    tags: ['Terapia de Pareja', 'Comunicación'],
    lastSession: '2024-01-22',
    notes: 'Sesión conjunta con pareja programada',
    createdAt: '2023-11-20',
  },
  {
    id: '4',
    name: 'Diego Sánchez Pérez',
    email: 'diego.sanchez@email.com',
    phone: '+34 645 678 901',
    dateOfBirth: '1995-03-28',
    tags: ['Estrés Laboral', 'Mindfulness'],
    lastSession: '2024-01-19',
    nextSession: '2024-01-26',
    notes: 'Implementando técnicas de gestión del tiempo',
    createdAt: '2024-01-05',
  },
  {
    id: '5',
    name: 'Laura Moreno Castro',
    email: 'laura.moreno@email.com',
    phone: '+34 656 789 012',
    dateOfBirth: '1988-07-14',
    tags: ['Duelo', 'Apoyo Emocional'],
    lastSession: '2024-01-21',
    nextSession: '2024-01-28',
    notes: 'Proceso de duelo por pérdida familiar',
    createdAt: '2023-12-10',
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'apt1',
    patientId: '1',
    patientName: 'María García López',
    startTime: '2024-01-27T09:00:00',
    endTime: '2024-01-27T10:00:00',
    status: 'confirmed',
    type: 'Sesión Individual',
    fee: 80,
    paymentStatus: 'pending',
  },
  {
    id: 'apt2',
    patientId: '2',
    patientName: 'Carlos Rodríguez Martín',
    startTime: '2024-01-27T10:30:00',
    endTime: '2024-01-27T11:30:00',
    status: 'confirmed',
    type: 'Seguimiento',
    fee: 70,
    paymentStatus: 'paid',
  },
  {
    id: 'apt3',
    patientId: '4',
    patientName: 'Diego Sánchez Pérez',
    startTime: '2024-01-27T12:00:00',
    endTime: '2024-01-27T13:00:00',
    status: 'pending',
    type: 'Sesión Individual',
    fee: 80,
    paymentStatus: 'pending',
  },
  {
    id: 'apt4',
    patientId: '3',
    patientName: 'Ana Fernández Ruiz',
    startTime: '2024-01-27T16:00:00',
    endTime: '2024-01-27T17:30:00',
    status: 'confirmed',
    type: 'Terapia de Pareja',
    fee: 120,
    paymentStatus: 'pending',
  },
  {
    id: 'apt5',
    patientId: '5',
    patientName: 'Laura Moreno Castro',
    startTime: '2024-01-27T18:00:00',
    endTime: '2024-01-27T19:00:00',
    status: 'cancelled',
    type: 'Sesión Individual',
    fee: 80,
    paymentStatus: 'pending',
  },
];

export const mockClinicalNotes: ClinicalNote[] = [
  {
    id: 'note1',
    patientId: '1',
    patientName: 'María García López',
    appointmentId: 'apt-prev1',
    content: 'Paciente reporta mejora en episodios de ansiedad. Continúa practicando ejercicios de respiración diariamente.',
    aiSummary: 'Progreso positivo en manejo de ansiedad. Técnicas de respiración efectivas.',
    format: 'SOAP',
    createdAt: '2024-01-20T10:30:00',
  },
  {
    id: 'note2',
    patientId: '2',
    patientName: 'Carlos Rodríguez Martín',
    appointmentId: 'apt-prev2',
    content: 'Sesión enfocada en reestructuración cognitiva. Identificamos patrones de pensamiento negativos.',
    aiSummary: 'Trabajo en pensamientos automáticos negativos. Tarea: registro de pensamientos.',
    format: 'TCC',
    createdAt: '2024-01-18T11:00:00',
  },
  {
    id: 'note3',
    patientId: '5',
    patientName: 'Laura Moreno Castro',
    appointmentId: 'apt-prev3',
    content: 'Paciente expresa tristeza profunda pero muestra avances en aceptación del proceso de duelo.',
    aiSummary: 'Fase de aceptación iniciada. Apoyo emocional continuo.',
    format: 'libre',
    createdAt: '2024-01-21T15:00:00',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: 'tx1',
    patientId: '2',
    patientName: 'Carlos Rodríguez Martín',
    appointmentId: 'apt2',
    amount: 70,
    method: 'transfer',
    date: '2024-01-25',
    status: 'completed',
  },
  {
    id: 'tx2',
    patientId: '1',
    patientName: 'María García López',
    appointmentId: 'apt-prev1',
    amount: 80,
    method: 'card',
    date: '2024-01-20',
    status: 'completed',
  },
  {
    id: 'tx3',
    patientId: '4',
    patientName: 'Diego Sánchez Pérez',
    appointmentId: 'apt-prev4',
    amount: 80,
    method: 'cash',
    date: '2024-01-19',
    status: 'completed',
  },
];

export const dashboardStats = {
  monthlyRevenue: 2450,
  previousMonthRevenue: 2100,
  activePatients: 24,
  newPatients: 3,
  retentionRate: 87,
  todayAppointments: 5,
  pendingPayments: 350,
  completedSessions: 32,
};

export const tagColors: Record<string, string> = {
  'Ansiedad': 'anxiety',
  'Depresión': 'depression',
  'TCC': 'therapy',
  'Alta Prioridad': 'priority',
  'Terapia de Pareja': 'couple',
  'Seguimiento': 'secondary',
  'Comunicación': 'info',
  'Estrés Laboral': 'warning',
  'Mindfulness': 'zen',
  'Duelo': 'depression',
  'Apoyo Emocional': 'info',
};

export const reportFormats = [
  { value: 'SOAP', label: 'SOAP', description: 'Subjetivo, Objetivo, Análisis, Plan' },
  { value: 'BIRP', label: 'BIRP', description: 'Comportamiento, Intervención, Respuesta, Plan' },
  { value: 'DAP', label: 'DAP', description: 'Datos, Evaluación, Plan' },
  { value: 'GIRP', label: 'GIRP', description: 'Objetivo, Intervención, Respuesta, Plan' },
  { value: 'TCC', label: 'TCC', description: 'Pensamiento, Emoción, Conducta' },
  { value: 'humanista', label: 'Humanista/Gestalt', description: 'Enfoque experiencial' },
  { value: 'psicodinamico', label: 'Psicodinámico', description: 'Exploración del inconsciente' },
  { value: 'anamnesis', label: 'Anamnesis', description: 'Historia clínica completa' },
  { value: 'MSE', label: 'Examen Estado Mental', description: 'MSE estructurado' },
  { value: 'psicometrico', label: 'Informe Psicométrico', description: 'Resultados de evaluación' },
  { value: 'libre', label: 'Formato Libre', description: 'Sin estructura predefinida' },
];

export const navItems = [
  { icon: CalendarDays, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Pacientes', path: '/patients' },
  { icon: CalendarDays, label: 'Calendario', path: '/calendar' },
  { icon: Brain, label: 'IA Asistente', path: '/ai-assistant' },
  { icon: FileText, label: 'Notas Clínicas', path: '/notes' },
  { icon: DollarSign, label: 'Finanzas', path: '/finance' },
];
