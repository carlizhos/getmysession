import { test, expect } from '@playwright/test';

test.describe('Flujo Crítico E2E - Saudade', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar llamadas de Autenticación de Supabase
    await page.route('**/auth/v1/token*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mocked-jwt-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mocked-refresh-token',
          user: {
            id: 'mocked-user-id',
            email: 'test@saudade.mx',
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: { full_name: 'Dr. Carlos Castro' },
            aud: 'authenticated',
            role: 'authenticated',
          }
        }),
      });
    });

    await page.route('**/auth/v1/user*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mocked-user-id',
          email: 'test@saudade.mx',
          user_metadata: { full_name: 'Dr. Carlos Castro' },
          aud: 'authenticated',
          role: 'authenticated',
        }),
      });
    });

    // Interceptar llamadas REST de base de datos Supabase
    await page.route('**/rest/v1/profiles*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mocked-user-id',
          full_name: 'Dr. Carlos Castro',
          prefix: 'Dr.',
          current_organization_id: 'mocked-org-id',
          cedulas: [{ numero: '12345', tipo: 'licenciatura' }],
          notification_settings: { paciente_whatsapp: true },
          horario_atencion: {
            dias: {
              0: { activo: true, inicio: '08:00', fin: '17:00' },
              1: { activo: true, inicio: '08:00', fin: '17:00' },
              2: { activo: true, inicio: '08:00', fin: '17:00' },
              3: { activo: true, inicio: '08:00', fin: '17:00' },
              4: { activo: true, inicio: '08:00', fin: '17:00' },
              5: { activo: true, inicio: '08:00', fin: '17:00' },
              6: { activo: true, inicio: '08:00', fin: '17:00' }
            },
            dias_no_laborables: [],
            fin: '17:00'
          }
        }),
      });
    });

    await page.route('**/rest/v1/organization_members*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            organization_id: 'mocked-org-id',
            role: 'owner',
            organizations: {
              id: 'mocked-org-id',
              name: 'Consultorio E2E',
              slug: 'consultorio-e2e',
              subscription_status: 'active',
              plan_id: 'pro',
              current_period_end: null,
              cancel_at_period_end: false,
              stripe_customer_id: null,
              settings: {},
              type: 'personal'
            }
          }
        ]),
      });
    });

    await page.route('**/rest/v1/activity_logs*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/services*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/leads*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/rest/v1/patients*', async route => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mocked-patient-id',
            name: 'Paciente de Prueba E2E',
            email: 'paciente@test.com',
            phone: '5551234567',
            organization_id: 'mocked-org-id',
            created_at: new Date().toISOString(),
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'mocked-patient-id',
              name: 'Paciente de Prueba E2E',
              email: 'paciente@test.com',
              phone: '5551234567',
              organization_id: 'mocked-org-id',
              created_at: new Date().toISOString(),
              patient_clinical_data: [],
              patient_fiscal_data: []
            }
          ]),
        });
      }
    });

    await page.route('**/rest/v1/appointments*', async route => {
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mocked-appointment-id',
            patient_id: 'mocked-patient-id',
            start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            status: 'scheduled',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.route('**/rest/v1/session_notes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/functions/v1/notify-appointment*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Capture console logs and page errors from browser
    page.on('pageerror', exception => {
      console.error(`❌ Page Error: ${exception.stack || exception.message}`);
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        console.error(`💬 Console Error: ${message.text()}`);
      }
    });
  });

  test('Happy Path: Login, creación de paciente y agenda de cita', async ({ page }) => {
    // 1. Iniciar sesión
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@saudade.mx');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Esperar redirección al Dashboard
    await page.waitForURL('**/');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 15000 });

    // 2. Ir a la sección de Pacientes y agregar uno nuevo
    await page.click('text=Pacientes');
    await page.waitForURL('**/patients');
    
    // Abrir formulario de creación (si la lista está vacía, aparecerá "Agregar Paciente", si no, "Nuevo Paciente")
    const newPatientBtn = page.locator('button:has-text("Nuevo Paciente"), button:has-text("Agregar Paciente")').first();
    await newPatientBtn.click();
    
    // Llenar datos
    await page.fill('input#name', 'Paciente de Prueba E2E');
    await page.fill('input#email', 'paciente@test.com');
    await page.fill('input#phone', '5551234567');
    await page.fill('input#dateOfBirth', '1990-01-01');
    await page.click('button:has-text("Guardar Paciente")');

    // Confirmar que el paciente aparece en la lista
    await expect(page.locator('text=Paciente de Prueba E2E').first()).toBeVisible();

    // 3. Ir a Agenda y agendar una cita
    await page.click('text=Agenda');
    await page.waitForURL('**/agenda');

    // Navegar a la siguiente semana y seleccionar un día (Miércoles) para agendar en el futuro
    await page.locator('.lucide-chevron-right').first().click();
    await page.locator('.grid-cols-8 > div').nth(3).click();

    // Agendar cita
    await page.click('button:has-text("Crear")');
    await page.click('text=Agendar una cita con paciente');
    
    const searchInput = page.locator('input[placeholder="Buscar paciente por nombre o email..."]');
    await searchInput.click();
    await searchInput.pressSequentially('Paciente', { delay: 100 });
    await page.locator('[role="option"]:has-text("Paciente de Prueba E2E")').first().click();
    await page.click('button:has-text("Crear Cita")');

    // Confirmar que aparece en la agenda
    await expect(page.locator('text=agendada correctamente').first()).toBeVisible();
  });
});
