import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Tool Definitions (OpenAI-compatible format for Groq) ──────────────────────
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_patients",
      description:
        "Busca pacientes por nombre. Devuelve id, nombre, email, teléfono y estatus.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Nombre o parte del nombre del paciente a buscar",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_services",
      description:
        "Lista todos los servicios activos del terapeuta (nombre, duración, precio, color).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_appointment",
      description:
        "Crea una nueva cita en la agenda. SIEMPRE confirma con el usuario antes de llamar esta función. Necesitas al menos: nombre del paciente, fecha y hora de inicio.",
      parameters: {
        type: "object",
        properties: {
          patient_name: {
            type: "string",
            description: "Nombre completo del paciente",
          },
          patient_id: {
            type: "string",
            description:
              "UUID del paciente (si lo tienes de search_patients). Dejar vacío si no se conoce.",
          },
          date: {
            type: "string",
            description: "Fecha de la cita en formato YYYY-MM-DD",
          },
          start_time: {
            type: "string",
            description: "Hora de inicio en formato HH:MM (24h)",
          },
          duration_minutes: {
            type: "number",
            description: "Duración en minutos. Default: 60",
          },
          service_id: {
            type: "string",
            description: "UUID del servicio (opcional, obtenido de list_services)",
          },
          modality: {
            type: "string",
            enum: ["presencial", "online"],
            description: "Modalidad de la cita. Default: presencial",
          },
          notes: {
            type: "string",
            description: "Notas adicionales para la cita",
          },
          fee: {
            type: "number",
            description: "Costo de la sesión. Si hay servicio, se toma del servicio.",
          },
        },
        required: ["patient_name", "date", "start_time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_upcoming_appointments",
      description:
        "Lista las próximas citas agendadas. Puede filtrar por número de días hacia adelante.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description:
              "Número de días hacia adelante para buscar (default: 7). Usa 1 para 'hoy', 0 para hoy.",
          },
          patient_name: {
            type: "string",
            description: "Filtrar por nombre de paciente (opcional)",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_invoiceable_payments",
      description:
        "Lista los pagos que ya fueron cobrados pero NO tienen factura generada (disponibles para facturar).",
      parameters: {
        type: "object",
        properties: {
          patient_name: {
            type: "string",
            description: "Filtrar por nombre de paciente (opcional)",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_invoice",
      description:
        "Genera una factura CFDI para un pago específico. El paciente debe tener RFC, razón social y código postal fiscal registrados. SIEMPRE confirma con el usuario antes de facturar.",
      parameters: {
        type: "object",
        properties: {
          payment_id: {
            type: "string",
            description: "UUID del pago a facturar (obtenido de list_invoiceable_payments)",
          },
        },
        required: ["payment_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_today_summary",
      description:
        "Obtiene un resumen del día actual: citas programadas, ingresos del día, y próxima cita.",
      parameters: { type: "object", properties: {} },
    },
  },
  // ── NEW TOOLS ───────────────────────────────────────────────────────────────
  {
    type: "function" as const,
    function: {
      name: "create_patient",
      description:
        "Registra un nuevo paciente en el sistema. SIEMPRE confirma los datos con el usuario antes de crear.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre completo del paciente" },
          email: { type: "string", description: "Correo electrónico (opcional)" },
          phone: { type: "string", description: "Teléfono de contacto" },
          age: { type: "number", description: "Edad del paciente" },
          gender: { type: "string", enum: ["masculino", "femenino", "otro", "prefiero_no_decir"], description: "Género" },
          reason_for_consultation: { type: "string", description: "Motivo de consulta inicial" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_patient_details",
      description:
        "Obtiene el expediente completo de un paciente: datos personales, datos clínicos, citas recientes y pagos.",
      parameters: {
        type: "object",
        properties: {
          patient_id: { type: "string", description: "UUID del paciente (de search_patients)" },
          patient_name: { type: "string", description: "Nombre del paciente (se buscará si no hay ID)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_patient",
      description:
        "Actualiza datos de un paciente existente. SIEMPRE confirma los cambios con el usuario antes de aplicar.",
      parameters: {
        type: "object",
        properties: {
          patient_id: { type: "string", description: "UUID del paciente" },
          name: { type: "string", description: "Nuevo nombre" },
          email: { type: "string", description: "Nuevo email" },
          phone: { type: "string", description: "Nuevo teléfono" },
          age: { type: "number", description: "Nueva edad" },
          gender: { type: "string", description: "Nuevo género" },
          status: { type: "string", enum: ["activo", "alta", "inactivo", "baja"], description: "Nuevo estatus" },
        },
        required: ["patient_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancel_appointment",
      description:
        "Cancela una cita existente. SIEMPRE confirma con el usuario antes de cancelar. Puede buscar por paciente y fecha.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "UUID de la cita (si se conoce)" },
          patient_name: { type: "string", description: "Nombre del paciente (para buscar la cita)" },
          date: { type: "string", description: "Fecha de la cita a cancelar (YYYY-MM-DD)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reschedule_appointment",
      description:
        "Reagenda una cita existente a nueva fecha/hora. SIEMPRE confirma con el usuario antes de reagendar.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "UUID de la cita a reagendar" },
          patient_name: { type: "string", description: "Nombre del paciente (para buscar la cita si no hay ID)" },
          current_date: { type: "string", description: "Fecha actual de la cita (YYYY-MM-DD, para buscar)" },
          new_date: { type: "string", description: "Nueva fecha (YYYY-MM-DD)" },
          new_start_time: { type: "string", description: "Nueva hora de inicio (HH:MM, 24h)" },
          new_duration_minutes: { type: "number", description: "Nueva duración en minutos (opcional, mantiene la actual si no se indica)" },
        },
        required: ["new_date", "new_start_time"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "record_payment",
      description:
        "Registra un pago/cobro para una cita. SIEMPRE confirma monto y método con el usuario antes de cobrar.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string", description: "UUID de la cita a cobrar" },
          patient_name: { type: "string", description: "Nombre del paciente (para buscar cita pendiente de pago)" },
          amount: { type: "number", description: "Monto a cobrar en MXN" },
          method: { type: "string", enum: ["efectivo", "transferencia", "stripe"], description: "Método de pago" },
          notes: { type: "string", description: "Notas adicionales del pago" },
        },
        required: ["amount", "method"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_financial_summary",
      description:
        "Obtiene un resumen financiero del período indicado: ingresos totales, por método de pago, número de sesiones cobradas.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month", "year"], description: "Período del resumen. Default: month" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_session_note",
      description:
        "Crea una nota clínica de sesión para un paciente. SIEMPRE confirma el contenido con el usuario antes de guardar.",
      parameters: {
        type: "object",
        properties: {
          patient_id: { type: "string", description: "UUID del paciente" },
          patient_name: { type: "string", description: "Nombre del paciente (para buscar si no hay ID)" },
          appointment_id: { type: "string", description: "UUID de la cita asociada (opcional)" },
          subjective: { type: "string", description: "Lo que el paciente reporta (S del SOAP)" },
          objective: { type: "string", description: "Observaciones del terapeuta (O del SOAP)" },
          assessment: { type: "string", description: "Evaluación clínica (A del SOAP)" },
          plan: { type: "string", description: "Plan terapéutico (P del SOAP)" },
          general_notes: { type: "string", description: "Notas generales (si no se usa formato SOAP)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_patient_notes",
      description:
        "Lista las notas clínicas de un paciente, ordenadas de más reciente a más antigua.",
      parameters: {
        type: "object",
        properties: {
          patient_id: { type: "string", description: "UUID del paciente" },
          patient_name: { type: "string", description: "Nombre del paciente (para buscar si no hay ID)" },
          limit: { type: "number", description: "Número máximo de notas a devolver. Default: 5" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "assign_test",
      description:
        "Asigna un test psicométrico a un paciente. Tests disponibles: phq9 (depresión), gad7 (ansiedad), pcl5 (TEPT), audit (alcohol), dast10 (drogas), beck_depression, beck_anxiety, scl90. SIEMPRE confirma con el usuario.",
      parameters: {
        type: "object",
        properties: {
          patient_id: { type: "string", description: "UUID del paciente" },
          patient_name: { type: "string", description: "Nombre del paciente (para buscar si no hay ID)" },
          test_type: { type: "string", description: "Tipo de test: phq9, gad7, pcl5, audit, dast10, beck_depression, beck_anxiety, scl90" },
        },
        required: ["test_type"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_leads",
      description:
        "Lista los prospectos web pendientes (pacientes que agendaron online y están por confirmar).",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres **Saudade AI**, el asistente inteligente de gestión para consultorios de psicología.

Tu rol es ayudar al terapeuta a administrar TODA su práctica mediante lenguaje natural. Eres su mano derecha digital. Puedes:

📅 **Agenda**
• Agendar, cancelar y reagendar citas
• Consultar la agenda del día, semana o de un paciente específico

🏥 **Pacientes**
• Registrar nuevos pacientes
• Buscar y consultar expedientes completos
• Actualizar datos de pacientes
• Ver prospectos web pendientes

💰 **Finanzas**
• Registrar cobros/pagos
• Listar pagos por facturar
• Generar facturas CFDI
• Dar resúmenes financieros (día, semana, mes, año)

📝 **Clínica**
• Crear notas de sesión (SOAP o formato libre)
• Consultar historial de notas clínicas
• Asignar tests psicométricos (PHQ-9, GAD-7, PCL-5, etc.)

📊 **Resúmenes**
• Resumen ejecutivo del día

REGLAS IMPORTANTES:
1. SIEMPRE confirma con el usuario antes de ejecutar cualquier acción que cree, modifique o elimine datos. Muestra un resumen de lo que vas a hacer y pregunta "¿Confirmo?" o "¿Procedo?"
2. Si faltan datos requeridos, pregunta por ellos UNO A UNO de forma conversacional y amigable, como un asistente humano lo haría.
3. Cuando necesites identificar un paciente, usa search_patients primero para obtener el patient_id correcto.
4. Si el usuario pide facturar, primero usa list_invoiceable_payments para mostrar las opciones.
5. Si el usuario pide cobrar pero no especifica la cita, busca citas recientes pendientes de pago del paciente.
6. Responde SIEMPRE en español mexicano.
7. Sé conciso, profesional y cálido.
8. Usa emojis moderadamente para hacer la conversación más amigable.
9. Cuando muestres listas, formatea con viñetas claras.
10. Si no puedes hacer algo, dilo honestamente y sugiere alternativas o dile al usuario dónde puede hacerlo manualmente en la app.
11. Cuando crees notas clínicas, pregunta si quieren formato SOAP (Subjetivo, Objetivo, Evaluación, Plan) o notas libres.
12. Para tests psicométricos, explica brevemente qué mide cada test si el usuario pregunta.

Formato de fechas: usa formato natural (ej: "mañana a las 10:00", "lunes 26 de mayo").
Formato de moneda: MXN con el signo $.
Fecha actual del sistema: ${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

// ── Tool Executor ─────────────────────────────────────────────────────────────
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  supabaseClient: ReturnType<typeof createClient>,
  organizationId: string,
  userId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "search_patients": {
        const query = (args.query as string) || "";
        const { data, error } = await supabaseClient
          .from("patients")
          .select("id, name, email, phone, status, tags")
          .eq("organization_id", organizationId)
          .ilike("name", `%${query}%`)
          .limit(10);
        if (error) return JSON.stringify({ error: error.message });
        if (!data || data.length === 0)
          return JSON.stringify({
            message: "No se encontraron pacientes con ese nombre.",
          });
        return JSON.stringify(data);
      }

      case "list_services": {
        const { data, error } = await supabaseClient
          .from("services")
          .select("id, name, duration, price, color, currency")
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("name");
        if (error) return JSON.stringify({ error: error.message });
        if (!data || data.length === 0)
          return JSON.stringify({
            message: "No hay servicios configurados.",
          });
        return JSON.stringify(data);
      }

      case "create_appointment": {
        const patientName = args.patient_name as string;
        const date = args.date as string;
        const startTime = args.start_time as string;
        const durationMin = (args.duration_minutes as number) || 60;
        const serviceId = (args.service_id as string) || null;
        const modality = (args.modality as string) || "presencial";
        const notes = (args.notes as string) || null;
        let fee = (args.fee as number) || 0;
        let patientId = (args.patient_id as string) || null;

        // If service_id provided, fetch service details
        let color = "violet";
        if (serviceId) {
          const { data: svc } = await supabaseClient
            .from("services")
            .select("price, color, duration")
            .eq("id", serviceId)
            .single();
          if (svc) {
            if (!fee) fee = svc.price;
            color = svc.color || "violet";
          }
        }

        // If no patient_id but we have a name, try to find them
        if (!patientId && patientName) {
          const { data: patients } = await supabaseClient
            .from("patients")
            .select("id")
            .eq("organization_id", organizationId)
            .ilike("name", `%${patientName}%`)
            .limit(1);
          if (patients && patients.length > 0) {
            patientId = patients[0].id;
          }
        }

        const startDateTime = new Date(`${date}T${startTime}:00`);
        const endDateTime = new Date(
          startDateTime.getTime() + durationMin * 60 * 1000
        );

        const payload = {
          patient_id: patientId,
          patient_name: patientName,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          type: "individual",
          fee,
          notes,
          color,
          user_id: userId,
          organization_id: organizationId,
          modality,
          service_id: serviceId,
          status: "scheduled",
          payment_status: "pending",
          location: null,
          is_recurring: false,
          recurrence_id: null,
        };

        const { data, error } = await supabaseClient
          .from("appointments")
          .insert([payload])
          .select("id, patient_name, start_time, end_time, fee")
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Cita creada exitosamente.`,
          appointment: data,
        });
      }

      case "list_upcoming_appointments": {
        const days = (args.days as number) ?? 7;
        const patientFilter = args.patient_name as string | undefined;

        const now = new Date();
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const endDate = new Date(
          startOfToday.getTime() + (days || 7) * 24 * 60 * 60 * 1000
        );

        let query = supabaseClient
          .from("appointments")
          .select(
            "id, patient_name, start_time, end_time, status, type, fee, modality, payment_status"
          )
          .eq("organization_id", organizationId)
          .gte("start_time", startOfToday.toISOString())
          .lte("start_time", endDate.toISOString())
          .neq("status", "cancelled")
          .order("start_time", { ascending: true })
          .limit(20);

        if (patientFilter) {
          query = query.ilike("patient_name", `%${patientFilter}%`);
        }

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        if (!data || data.length === 0)
          return JSON.stringify({
            message: `No hay citas programadas para los próximos ${days} día(s).`,
          });
        return JSON.stringify({
          count: data.length,
          appointments: data,
        });
      }

      case "list_invoiceable_payments": {
        const patientFilter = args.patient_name as string | undefined;

        let query = supabaseClient
          .from("payments")
          .select(
            "id, patient_name, amount, currency, method, paid_at, invoice_status, appointment_id"
          )
          .eq("organization_id", organizationId)
          .eq("status", "paid")
          .or("invoice_url.is.null,invoice_url.eq.")
          .order("paid_at", { ascending: false })
          .limit(20);

        if (patientFilter) {
          query = query.ilike("patient_name", `%${patientFilter}%`);
        }

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        if (!data || data.length === 0)
          return JSON.stringify({
            message: "No hay pagos pendientes de facturación.",
          });
        return JSON.stringify({
          count: data.length,
          payments: data,
        });
      }

      case "generate_invoice": {
        const paymentId = args.payment_id as string;
        if (!paymentId)
          return JSON.stringify({ error: "Se requiere el ID del pago." });

        // Fetch the payment
        const { data: payment, error: pErr } = await supabaseClient
          .from("payments")
          .select("id, amount, appointment_id, patient_name, method, invoice_url")
          .eq("id", paymentId)
          .single();

        if (pErr || !payment)
          return JSON.stringify({ error: "Pago no encontrado." });

        if (payment.invoice_url)
          return JSON.stringify({
            error: "Este pago ya tiene una factura generada.",
            invoice_url: payment.invoice_url,
          });

        // Get appointment and patient
        if (!payment.appointment_id)
          return JSON.stringify({
            error:
              "Este pago no tiene cita asociada, no se puede obtener datos fiscales del paciente.",
          });

        const { data: appt } = await supabaseClient
          .from("appointments")
          .select("patient_id, start_time")
          .eq("id", payment.appointment_id)
          .single();

        if (!appt?.patient_id)
          return JSON.stringify({
            error: "No se encontró paciente asociado a la cita.",
          });

        const { data: patient } = await supabaseClient
          .from("patients")
          .select("name, email, rfc, tax_name, tax_zip_code, tax_regime, cfdi_use")
          .eq("id", appt.patient_id)
          .single();

        if (!patient)
          return JSON.stringify({ error: "Paciente no encontrado." });
        if (!patient.rfc || !patient.tax_name || !patient.tax_zip_code)
          return JSON.stringify({
            error: `Faltan datos fiscales del paciente ${patient.name}. Se requiere: RFC${!patient.rfc ? " ❌" : " ✅"}, Razón Social${!patient.tax_name ? " ❌" : " ✅"}, Código Postal Fiscal${!patient.tax_zip_code ? " ❌" : " ✅"}. Por favor, completa los datos fiscales del paciente en su perfil.`,
          });

        // Call Facturapi via environment
        const facturapiKey = Deno.env.get("FACTURAPI_KEY");
        if (!facturapiKey)
          return JSON.stringify({
            error: "Facturapi no está configurado en el servidor.",
          });

        const methodMap: Record<string, string> = {
          efectivo: "01",
          transferencia: "03",
          stripe: "04",
        };
        const paymentForm =
          methodMap[payment.method || ""] || "99";
        const sessionDate = appt.start_time
          ? new Date(appt.start_time).toLocaleDateString("es-MX")
          : "N/A";

        const invoiceResp = await fetch(
          "https://www.facturapi.io/v2/invoices",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${facturapiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customer: {
                legal_name: patient.tax_name,
                tax_id: patient.rfc,
                tax_system: patient.tax_regime || "616",
                address: { zip: patient.tax_zip_code },
                email: patient.email,
              },
              items: [
                {
                  quantity: 1,
                  product: {
                    description: `Consulta Psicológica - ${sessionDate}`,
                    product_key: "85121608",
                    price: payment.amount,
                    taxes: [
                      { type: "IVA", factor: "Exento", rate: 0 },
                    ],
                  },
                },
              ],
              payment_form: paymentForm,
              payment_method: "PUE",
              use: patient.cfdi_use || "D01",
            }),
          }
        );

        const invoiceData = await invoiceResp.json();
        if (!invoiceResp.ok)
          return JSON.stringify({
            error: `Error de Facturapi: ${invoiceData.message || JSON.stringify(invoiceData)}`,
          });

        // Update payment record
        await supabaseClient
          .from("payments")
          .update({
            invoice_id: invoiceData.id,
            invoice_url: `https://www.facturapi.io/dashboard/invoices/${invoiceData.id}`,
            invoice_status: "issued",
          })
          .eq("id", paymentId);

        return JSON.stringify({
          success: true,
          message: `Factura CFDI generada para ${patient.name} por $${payment.amount} MXN.`,
          invoice_id: invoiceData.id,
        });
      }

      case "get_today_summary": {
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const endOfDay = new Date(
          startOfDay.getTime() + 24 * 60 * 60 * 1000
        );

        const [{ data: appointments }, { data: payments }] =
          await Promise.all([
            supabaseClient
              .from("appointments")
              .select(
                "id, patient_name, start_time, end_time, status, fee, payment_status, modality"
              )
              .eq("organization_id", organizationId)
              .gte("start_time", startOfDay.toISOString())
              .lt("start_time", endOfDay.toISOString())
              .neq("status", "cancelled")
              .order("start_time", { ascending: true }),
            supabaseClient
              .from("payments")
              .select("id, amount, method, patient_name")
              .eq("organization_id", organizationId)
              .eq("status", "paid")
              .gte("created_at", startOfDay.toISOString())
              .lt("created_at", endOfDay.toISOString()),
          ]);

        const totalAppointments = appointments?.length || 0;
        const completedAppts =
          appointments?.filter((a) => a.status === "completed" || a.status === "attended")
            .length || 0;
        const totalIncome =
          payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // Find next upcoming appointment
        const upcoming = appointments?.find(
          (a) => new Date(a.start_time) > now
        );

        return JSON.stringify({
          date: startOfDay.toLocaleDateString("es-MX", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          total_appointments: totalAppointments,
          completed_appointments: completedAppts,
          total_income: totalIncome,
          total_payments: payments?.length || 0,
          next_appointment: upcoming
            ? {
                patient: upcoming.patient_name,
                time: new Date(upcoming.start_time).toLocaleTimeString(
                  "es-MX",
                  { hour: "2-digit", minute: "2-digit" }
                ),
                modality: upcoming.modality,
              }
            : null,
          appointments: appointments?.map((a) => ({
            patient: a.patient_name,
            time: new Date(a.start_time).toLocaleTimeString("es-MX", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: a.status,
            fee: a.fee,
          })),
        });
      }

      // ── NEW TOOL EXECUTORS ──────────────────────────────────────────────────

      case "create_patient": {
        const name = args.name as string;
        if (!name) return JSON.stringify({ error: "Se requiere el nombre del paciente." });

        const payload: Record<string, unknown> = {
          name,
          organization_id: organizationId,
          user_id: userId,
          status: "activo",
        };
        if (args.email) payload.email = args.email;
        if (args.phone) payload.phone = args.phone;
        if (args.age) payload.age = args.age;
        if (args.gender) payload.gender = args.gender;

        const { data, error } = await supabaseClient
          .from("patients")
          .insert([payload])
          .select("id, name, email, phone, age, gender, status")
          .single();

        if (error) return JSON.stringify({ error: error.message });

        // If reason_for_consultation provided, create clinical data
        if (args.reason_for_consultation) {
          await supabaseClient.from("patient_clinical_data").insert([{
            patient_id: data.id,
            reason_for_consultation: args.reason_for_consultation,
            organization_id: organizationId,
          }]);
        }

        return JSON.stringify({
          success: true,
          message: `Paciente "${name}" registrado exitosamente.`,
          patient: data,
        });
      }

      case "get_patient_details": {
        let patientId = args.patient_id as string | null;
        const patientName = args.patient_name as string | undefined;

        if (!patientId && patientName) {
          const { data: found } = await supabaseClient
            .from("patients")
            .select("id")
            .eq("organization_id", organizationId)
            .ilike("name", `%${patientName}%`)
            .limit(1);
          if (found && found.length > 0) patientId = found[0].id;
          else return JSON.stringify({ message: `No se encontró paciente con nombre "${patientName}".` });
        }
        if (!patientId) return JSON.stringify({ error: "Se requiere patient_id o patient_name." });

        const [{ data: patient }, { data: clinical }, { data: appointments }, { data: payments }] = await Promise.all([
          supabaseClient.from("patients").select("*").eq("id", patientId).single(),
          supabaseClient.from("patient_clinical_data").select("*").eq("patient_id", patientId).limit(1).maybeSingle(),
          supabaseClient.from("appointments").select("id, start_time, end_time, status, fee, payment_status, type, modality")
            .eq("organization_id", organizationId).eq("patient_id", patientId)
            .order("start_time", { ascending: false }).limit(5),
          supabaseClient.from("payments").select("id, amount, method, paid_at, status")
            .eq("organization_id", organizationId).ilike("patient_name", `%${patientName || ''}%`)
            .order("paid_at", { ascending: false }).limit(5),
        ]);

        return JSON.stringify({
          patient,
          clinical_data: clinical || null,
          recent_appointments: appointments || [],
          recent_payments: payments || [],
        });
      }

      case "update_patient": {
        const patientId = args.patient_id as string;
        if (!patientId) return JSON.stringify({ error: "Se requiere patient_id. Usa search_patients primero." });

        const updates: Record<string, unknown> = {};
        if (args.name) updates.name = args.name;
        if (args.email) updates.email = args.email;
        if (args.phone) updates.phone = args.phone;
        if (args.age) updates.age = args.age;
        if (args.gender) updates.gender = args.gender;
        if (args.status) updates.status = args.status;

        if (Object.keys(updates).length === 0)
          return JSON.stringify({ error: "No se proporcionaron campos para actualizar." });

        const { data, error } = await supabaseClient
          .from("patients")
          .update(updates)
          .eq("id", patientId)
          .eq("organization_id", organizationId)
          .select("id, name, email, phone, age, gender, status")
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Datos de ${data.name} actualizados.`,
          patient: data,
        });
      }

      case "cancel_appointment": {
        let appointmentId = args.appointment_id as string | null;

        if (!appointmentId) {
          const patientName = args.patient_name as string;
          const date = args.date as string;
          if (!patientName) return JSON.stringify({ error: "Se requiere appointment_id o patient_name para buscar la cita." });

          let query = supabaseClient
            .from("appointments")
            .select("id, patient_name, start_time, fee, status")
            .eq("organization_id", organizationId)
            .ilike("patient_name", `%${patientName}%`)
            .eq("status", "scheduled")
            .order("start_time", { ascending: true })
            .limit(5);

          if (date) {
            const dayStart = new Date(`${date}T00:00:00`);
            const dayEnd = new Date(`${date}T23:59:59`);
            query = query.gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString());
          }

          const { data: found } = await query;
          if (!found || found.length === 0)
            return JSON.stringify({ message: `No se encontraron citas activas para ${patientName}${date ? ` el ${date}` : ''}.` });
          if (found.length === 1) {
            appointmentId = found[0].id;
          } else {
            return JSON.stringify({
              message: `Se encontraron ${found.length} citas para ${patientName}. ¿Cuál quieres cancelar?`,
              appointments: found.map(a => ({
                id: a.id,
                patient: a.patient_name,
                date: new Date(a.start_time).toLocaleDateString('es-MX'),
                time: new Date(a.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                fee: a.fee,
              })),
            });
          }
        }

        const { data, error } = await supabaseClient
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", appointmentId)
          .eq("organization_id", organizationId)
          .select("id, patient_name, start_time")
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Cita de ${data.patient_name} cancelada (${new Date(data.start_time).toLocaleDateString('es-MX')}).`,
        });
      }

      case "reschedule_appointment": {
        let appointmentId = args.appointment_id as string | null;
        const newDate = args.new_date as string;
        const newTime = args.new_start_time as string;

        if (!newDate || !newTime) return JSON.stringify({ error: "Se requiere new_date y new_start_time." });

        if (!appointmentId) {
          const patientName = args.patient_name as string;
          const currentDate = args.current_date as string;
          if (!patientName) return JSON.stringify({ error: "Se requiere appointment_id o patient_name." });

          let query = supabaseClient
            .from("appointments")
            .select("id, patient_name, start_time, end_time, status")
            .eq("organization_id", organizationId)
            .ilike("patient_name", `%${patientName}%`)
            .eq("status", "scheduled")
            .order("start_time", { ascending: true })
            .limit(5);

          if (currentDate) {
            const dayStart = new Date(`${currentDate}T00:00:00`);
            const dayEnd = new Date(`${currentDate}T23:59:59`);
            query = query.gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString());
          }

          const { data: found } = await query;
          if (!found || found.length === 0)
            return JSON.stringify({ message: `No se encontraron citas activas para ${patientName}.` });
          if (found.length === 1) {
            appointmentId = found[0].id;
          } else {
            return JSON.stringify({
              message: `Se encontraron ${found.length} citas para ${patientName}. ¿Cuál quieres reagendar?`,
              appointments: found.map(a => ({
                id: a.id,
                date: new Date(a.start_time).toLocaleDateString('es-MX'),
                time: new Date(a.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
              })),
            });
          }
        }

        // Get current appointment to preserve duration
        const { data: current } = await supabaseClient
          .from("appointments")
          .select("start_time, end_time")
          .eq("id", appointmentId)
          .single();

        const currentDuration = current
          ? (new Date(current.end_time).getTime() - new Date(current.start_time).getTime()) / 60000
          : 60;
        const duration = (args.new_duration_minutes as number) || currentDuration;

        const newStart = new Date(`${newDate}T${newTime}:00`);
        const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

        const { data, error } = await supabaseClient
          .from("appointments")
          .update({ start_time: newStart.toISOString(), end_time: newEnd.toISOString() })
          .eq("id", appointmentId)
          .eq("organization_id", organizationId)
          .select("id, patient_name, start_time, end_time")
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Cita de ${data.patient_name} reagendada al ${new Date(data.start_time).toLocaleDateString('es-MX')} a las ${new Date(data.start_time).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}.`,
        });
      }

      case "record_payment": {
        const amount = args.amount as number;
        const method = args.method as string;
        if (!amount || !method) return JSON.stringify({ error: "Se requiere amount y method." });

        let appointmentId = args.appointment_id as string | null;
        const patientName = args.patient_name as string | undefined;

        // Find appointment if not provided
        if (!appointmentId && patientName) {
          const { data: found } = await supabaseClient
            .from("appointments")
            .select("id, patient_name, start_time, fee")
            .eq("organization_id", organizationId)
            .ilike("patient_name", `%${patientName}%`)
            .eq("payment_status", "pending")
            .order("start_time", { ascending: false })
            .limit(1);
          if (found && found.length > 0) appointmentId = found[0].id;
        }

        // Record payment
        const paymentPayload: Record<string, unknown> = {
          amount,
          currency: "mxn",
          method,
          status: "paid",
          paid_at: new Date().toISOString(),
          user_id: userId,
          organization_id: organizationId,
          notes: (args.notes as string) || null,
        };

        if (appointmentId) {
          // Get patient name from appointment
          const { data: appt } = await supabaseClient
            .from("appointments")
            .select("patient_name, patient_id")
            .eq("id", appointmentId)
            .single();

          paymentPayload.appointment_id = appointmentId;
          paymentPayload.patient_name = appt?.patient_name || patientName || "Desconocido";

          // Update appointment payment status
          await supabaseClient
            .from("appointments")
            .update({ payment_status: "paid" })
            .eq("id", appointmentId);
        } else {
          paymentPayload.patient_name = patientName || "Ingreso manual";
        }

        const { data, error } = await supabaseClient
          .from("payments")
          .insert([paymentPayload])
          .select("id, patient_name, amount, method, paid_at")
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Pago de $${amount} MXN registrado (${method}) para ${data.patient_name}.`,
          payment: data,
        });
      }

      case "get_financial_summary": {
        const period = (args.period as string) || "month";
        const now = new Date();
        let startDate: Date;

        switch (period) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default: // month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const { data: payments } = await supabaseClient
          .from("payments")
          .select("amount, method, paid_at, patient_name, invoice_status")
          .eq("organization_id", organizationId)
          .eq("status", "paid")
          .gte("paid_at", startDate.toISOString())
          .order("paid_at", { ascending: false });

        const total = payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
        const byMethod: Record<string, number> = {};
        payments?.forEach(p => {
          const m = p.method || "otro";
          byMethod[m] = (byMethod[m] || 0) + (p.amount || 0);
        });
        const invoiced = payments?.filter(p => p.invoice_status === 'issued').length || 0;

        const periodLabels: Record<string, string> = { today: "hoy", week: "esta semana", month: "este mes", year: "este año" };

        return JSON.stringify({
          period: periodLabels[period] || period,
          total_income: total,
          total_payments: payments?.length || 0,
          invoiced_count: invoiced,
          by_method: byMethod,
        });
      }

      case "create_session_note": {
        let patientId = args.patient_id as string | null;
        const patientName = args.patient_name as string | undefined;

        if (!patientId && patientName) {
          const { data: found } = await supabaseClient
            .from("patients")
            .select("id")
            .eq("organization_id", organizationId)
            .ilike("name", `%${patientName}%`)
            .limit(1);
          if (found && found.length > 0) patientId = found[0].id;
          else return JSON.stringify({ message: `No se encontró paciente con nombre "${patientName}".` });
        }
        if (!patientId) return JSON.stringify({ error: "Se requiere patient_id o patient_name." });

        const notePayload: Record<string, unknown> = {
          patient_id: patientId,
          user_id: userId,
          organization_id: organizationId,
          session_date: new Date().toISOString(),
        };

        if (args.subjective) notePayload.subjective = args.subjective;
        if (args.objective) notePayload.objective = args.objective;
        if (args.assessment) notePayload.assessment = args.assessment;
        if (args.plan) notePayload.plan = args.plan;
        if (args.general_notes) notePayload.general_notes = args.general_notes;
        if (args.appointment_id) notePayload.appointment_id = args.appointment_id;

        const { data, error } = await supabaseClient
          .from("session_notes")
          .insert([notePayload])
          .select("id, session_date")
          .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({
          success: true,
          message: `Nota clínica guardada exitosamente.`,
          note_id: data.id,
        });
      }

      case "list_patient_notes": {
        let patientId = args.patient_id as string | null;
        const patientName = args.patient_name as string | undefined;
        const limit = (args.limit as number) || 5;

        if (!patientId && patientName) {
          const { data: found } = await supabaseClient
            .from("patients")
            .select("id")
            .eq("organization_id", organizationId)
            .ilike("name", `%${patientName}%`)
            .limit(1);
          if (found && found.length > 0) patientId = found[0].id;
          else return JSON.stringify({ message: `No se encontró paciente con nombre "${patientName}".` });
        }
        if (!patientId) return JSON.stringify({ error: "Se requiere patient_id o patient_name." });

        const { data, error } = await supabaseClient
          .from("session_notes")
          .select("id, session_date, subjective, objective, assessment, plan, general_notes, created_at")
          .eq("patient_id", patientId)
          .eq("organization_id", organizationId)
          .order("session_date", { ascending: false })
          .limit(limit);

        if (error) return JSON.stringify({ error: error.message });
        if (!data || data.length === 0)
          return JSON.stringify({ message: "No se encontraron notas clínicas para este paciente." });
        return JSON.stringify({ count: data.length, notes: data });
      }

      case "assign_test": {
        let patientId = args.patient_id as string | null;
        const patientName = args.patient_name as string | undefined;
        const testType = args.test_type as string;

        if (!testType) return JSON.stringify({ error: "Se requiere test_type." });

        if (!patientId && patientName) {
          const { data: found } = await supabaseClient
            .from("patients")
            .select("id, name")
            .eq("organization_id", organizationId)
            .ilike("name", `%${patientName}%`)
            .limit(1);
          if (found && found.length > 0) patientId = found[0].id;
          else return JSON.stringify({ message: `No se encontró paciente con nombre "${patientName}".` });
        }
        if (!patientId) return JSON.stringify({ error: "Se requiere patient_id o patient_name." });

        const { data, error } = await supabaseClient
          .from("patient_tests")
          .insert([{
            patient_id: patientId,
            test_type: testType,
            status: "pending",
            assigned_by: userId,
            organization_id: organizationId,
          }])
          .select("id, test_type, status")
          .single();

        if (error) return JSON.stringify({ error: error.message });

        const testNames: Record<string, string> = {
          phq9: "PHQ-9 (Depresión)",
          gad7: "GAD-7 (Ansiedad)",
          pcl5: "PCL-5 (TEPT)",
          audit: "AUDIT (Alcohol)",
          dast10: "DAST-10 (Drogas)",
          beck_depression: "Inventario de Beck (Depresión)",
          beck_anxiety: "Inventario de Beck (Ansiedad)",
          scl90: "SCL-90",
        };

        return JSON.stringify({
          success: true,
          message: `Test ${testNames[testType] || testType} asignado. El paciente podrá responderlo desde su Portal del Paciente.`,
          test: data,
        });
      }

      case "list_leads": {
        const { data, error } = await supabaseClient
          .from("leads")
          .select("id, name, email, phone, age, reason_for_consultation, status, created_at")
          .eq("organization_id", organizationId)
          .in("status", ["pending", "new", "contacted"])
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) return JSON.stringify({ error: error.message });
        if (!data || data.length === 0)
          return JSON.stringify({ message: "No hay prospectos web pendientes. 🎉" });
        return JSON.stringify({ count: data.length, leads: data });
      }

      default:
        return JSON.stringify({ error: `Herramienta desconocida: ${toolName}` });
    }
  } catch (err) {
    return JSON.stringify({ error: `Error ejecutando ${toolName}: ${(err as Error).message}` });
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqKey = Deno.env.get("GROQ_API_KEY");

    if (!groqKey) throw new Error("GROQ_API_KEY not configured");

    // Create client with user's token for RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser(token);

    if (userErr || !user) throw new Error("User not authenticated");

    const { messages, organization_id } = await req.json();

    if (!organization_id) throw new Error("organization_id is required");
    if (!messages || !Array.isArray(messages))
      throw new Error("messages array is required");

    // Build conversation for Groq
    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // ── Multi-turn tool-calling loop ──────────────────────────────────────
    const MAX_TOOL_ROUNDS = 8;
    let finalReply = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const groqResp = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: groqMessages,
            tools: TOOLS,
            tool_choice: "auto",
            temperature: 0.3,
            max_tokens: 2048,
          }),
        }
      );

      const groqData = await groqResp.json();
      if (groqData.error) {
        console.error("Groq API Error:", groqData.error);
        throw new Error(groqData.error.message || "Error from AI provider");
      }

      const choice = groqData.choices[0];
      const assistantMessage = choice.message;

      // Add assistant message to conversation
      groqMessages.push(assistantMessage);

      // Check if we have tool calls
      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs: Record<string, unknown> = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            toolArgs = {};
          }

          console.log(`Executing tool: ${toolName}`, toolArgs);

          const result = await executeTool(
            toolName,
            toolArgs,
            supabaseClient,
            organization_id,
            user.id
          );

          // Add tool result to conversation
          groqMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        // Continue loop to let Groq process tool results
      } else {
        // No tool calls — we have a final text response
        finalReply = assistantMessage.content || "";
        break;
      }
    }

    if (!finalReply) {
      finalReply =
        "Lo siento, no pude completar la operación. ¿Podrías intentarlo de nuevo?";
    }

    return new Response(
      JSON.stringify({ reply: finalReply }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("System agent error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
