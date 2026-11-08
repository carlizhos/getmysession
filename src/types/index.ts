// ── Clinical & Personnel Types ──────────────────────────────────────────────

export interface PatientClinicalData {
    patient_id: string;
    organization_id: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PatientFiscalData {
    patient_id: string;
    organization_id: string;
    nit?: string; // Colombia NIT o Cédula
    tax_name?: string; // Razón Social o Nombre del Paciente
    tax_zip_code?: string; // Código postal o DANE
    tax_regime?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Patient {
    id: string;
    organization_id: string;
    name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    birth_date?: string; // Legacy/Compatibility
    gender?: string;
    occupation?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    tags?: string[];
    
    // Identificación y datos sociodemográficos para Colombia (MinSalud / RIPS Res. 2275)
    document_type?: 'CC' | 'TI' | 'CE' | 'PA' | 'RC' | 'PPT' | 'CD' | 'SC' | string;
    document_number?: string;
    municipality_code?: string; // Código DANE 5 dígitos (ej: 11001)
    department_code?: string; // Código DANE Depto 2 dígitos (ej: 11)
    residence_area?: '01' | '02' | string; // 01: Urbana, 02: Rural
    user_type?: '01' | '02' | '03' | '04' | '05' | string; // 04: Particular, 01: Contributivo Cotizante, etc.

    // Representante Legal / Tutor / Acudiente (Ley 1098 de 2006 para Menores de Edad)
    guardian_name?: string;
    guardian_document_type?: 'CC' | 'CE' | 'PA' | 'PPT' | string;
    guardian_document_number?: string;
    guardian_phone?: string;
    guardian_relationship?: string;

    curp?: string; // Legacy / compatibilidad temporal
    status?: 'active' | 'archived' | 'inactive';
    link_code?: string;
    is_whatsapp_linked?: boolean;
    created_at?: string;
    deleted_at?: string | null;
    
    // Joined relations from Supabase
    patient_clinical_data?: PatientClinicalData[];
    patient_fiscal_data?: PatientFiscalData[];
}

export interface SessionNote {
    id: string;
    organization_id: string;
    patient_id: string;
    user_id: string;
    date: string;
    session_number: number;
    mood?: {
        rating: number;
        notes: string;
    };
    bridge?: {
        homework_review?: string;
        notes?: string;
    };
    agenda?: {
        topic?: string;
        notes?: string;
        resolved?: boolean;
        interventions?: string;
        thoughts?: string;
    }[];
    beliefs?: {
        belief?: string;
        evidence_for?: string;
        evidence_against?: string;
        alternative?: string;
    };
    action_plan?: {
        task: string;
        completed: boolean;
    }[];
    cie10_code?: string;
    cie10_description?: string;
    dsm5_code?: string;
    dsm5_description?: string;
    diagnostico_principal?: string;
    transcript_summary?: string;
    audio_url?: string;
    mental_status?: Record<string, string[]>;
    created_at?: string;
    deleted_at?: string | null;
}

export interface PatientTest {
    id: string;
    organization_id: string;
    patient_id: string;
    user_id: string;
    test_type: string;
    status: 'pending' | 'completed' | 'scored';
    score?: number;
    interpretation?: string;
    answers?: Record<string, number | string | boolean | null>;
    token?: string;
    created_at: string;
    completed_at?: string | null;
}

export interface Appointment {
    id: string;
    organization_id: string;
    patient_id: string | null;
    patient_name: string;
    user_id: string;
    start_time: string;
    end_time: string;
    status: 'scheduled' | 'confirmed' | 'cancelled' | 'attended' | 'completed' | 'pending';
    type?: string;
    fee?: number;
    notes?: string;
    color?: string;
    title?: string;
    google_event_id?: string;
    meet_link?: string;
    meeting_link?: string; // Consistency
    meeting_platform?: string;
    modality?: 'presencial' | 'online';
    location?: string;
    commission_percentage?: number;
    reschedule_policy_hours?: number;
    
    // MinSalud Colombia RIPS / CUPS
    cups_code?: string; // ej: 943100, 890208
    service_modality?: '01' | '02' | '03' | string; // 01 Intramural, 03 Telemedicina
    consultation_purpose?: string; // 10 Diagnóstico, 14 Tratamiento
    external_cause?: string; // 13 Enfermedad general
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    reps_code?: string;
    nit?: string;
    created_at: string;
    settings?: Record<string, string | number | boolean | null>;
}

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    organization_id?: string;
    role?: 'admin' | 'therapist' | 'receptionist';
    
    // Datos del Prestador de Salud (Colombia)
    reps_code?: string; // Código de Habilitación de la Secretaría de Salud
    rethus_number?: string; // Registro de Talento Humano en Salud
    nit?: string; // Cédula o NIT tributario
    dian_prefix?: string; // Prefijo de facturación autorizado (ej: SETP)
    dian_resolution?: string; // Número de resolución DIAN
    porcentaje_consultorio?: number;
    stripe_fee_percent?: number;
}

export interface Payment {
    id: string;
    organization_id: string;
    appointment_id?: string;
    patient_name: string;
    amount: number;
    method: 'efectivo' | 'transferencia' | 'stripe';
    status: 'paid' | 'pending' | 'failed' | 'refunded';
    notes?: string;
    created_at: string;

    // Facturación Electrónica DIAN y MinSalud (Colombia)
    invoice_id?: string;
    invoice_url?: string;
    invoice_status?: string;
    cufe?: string; // Código Único de Facturación Electrónica (DIAN)
    cuv?: string; // Código Único de Validación (MinSalud RIPS Res. 2275)
    dian_status?: 'none' | 'processing' | 'issued' | 'error';
    rips_status?: 'none' | 'generated' | 'validated' | 'rejected';
    rips_json?: Record<string, any>;
    dian_xml_url?: string;
    dian_invoice_number?: string;
    dian_error_log?: string;
}

export interface AuditLog {
    id: string;
    organization_id: string;
    profile_id: string;
    action: string;
    resource_type: string;
    details?: Record<string, any>;
    created_at: string;
}

// ── Async Clinical Tracking ─────────────────────────────────────────────

export interface AsyncMessage {
  id: string;
  organization_id: string;
  patient_id: string;
  source_text: string;
  source_type: 'whatsapp' | 'whatsapp_audio' | 'portal' | 'manual';
  ai_summary: string | null;
  ai_emotions: string[];
  ai_key_points: string[];
  ai_red_flag: boolean;
  ai_red_flag_reason: string | null;
  ai_approach_suggestion: string | null;
  ai_processed_at: string | null;
  created_at: string;
}
