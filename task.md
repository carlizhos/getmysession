# Task Checklist

## High Priority (Must Do)
- [x] **Finish CRM Pipeline Logic**:
    - [x] Ensure drag-and-drop updates `status` in Supabase.
    - [x] Persist column changes.
- [x] **Calendar Appointments**:
    - [x] Create/Edit appointments linked to Supabase.
    - [x] Fetch real appointments for the calendar view.
- [/] **Patient Management**:
    - [/] Enhace patient list with search/filter (already implemented, needs refinement).
    - [x] Implement Patient Detail View (History, Notes, Info).
    - [ ] Add Edit/Delete functionality for patients.
- [x] **Clinical Notes**:
    - [x] Create `clinical_notes` table (renamed to `session_notes` to match form structure).
    - [x] Save notes from `Notes.tsx` and `AIAssistant.tsx`.
    - [x] Display notes history in Patient Detail View.
- [x] **Dashboard Real Data**:
    - [x] Replace `dashboardStats` with real counts.
    - [x] `TodayAgenda` fetching from DB.
    - [x] `RecentNotes` fetching from DB.
    - [x] `RevenueChart` fetching from DB.

## Medium Priority (Should Do)
- [x] **HIPAA/Security Features**:
    - [x] Inactivity timer (auto-logout).
    - [x] Audit logs (session_logs, page_views).
    - [ ] Row Level Security (RLS) policies refinement (basic RLS is on).
- [ ] **Payments/Finance**:
    - [ ] Integrate Stripe for real payments.
    - [ ] Sync payment status with appointments.

## Low Priority (Nice to Have)
- [ ] **Settings Page**:
    - [ ] Profile management.
    - [ ] Notification preferences.
- [ ] **Mobile Responsiveness**:
    - [ ] Check detailed views on mobile.
