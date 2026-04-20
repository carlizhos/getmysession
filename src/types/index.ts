// ── Clinical & Personnel Types ──────────────────────────────────────────────

export interface Patient {
    id: string;
    organization_id: string;
    name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    birth_date?: string; // Legacy/Compatibility
    sex?: string;
    occupation?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notes?: string;
    tags?: string[];
    curp?: string;
    rfc?: string;
    tax_name?: string;
    tax_zip_code?: string;
    tax_regime?: string;
    cfdi_use?: string;
    status?: 'active' | 'archived' | 'inactive';
    created_at?: string;
    deleted_at?: string | null;
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
    diagnostico_principal?: string;
    transcript_summary?: string;
    audio_url?: string;
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
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
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
}
