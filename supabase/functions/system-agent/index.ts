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
];

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres **Saudade AI**, el asistente inteligente de gestión para consultorios de psicología.

Tu rol es ayudar al terapeuta a administrar su práctica mediante lenguaje natural. Puedes:
• Agendar citas (pregunta los datos que falten antes de crear)
• Consultar la agenda del día o semana
• Buscar pacientes en la base de datos
• Listar pagos disponibles para facturación
• Generar facturas CFDI
• Dar un resumen ejecutivo del día

REGLAS IMPORTANTES:
1. SIEMPRE confirma con el usuario antes de crear una cita o generar una factura. Muestra los datos y pregunta "¿Confirmo?"
2. Si faltan datos requeridos (nombre, fecha, hora), pregunta por ellos de forma conversacional.
3. Cuando busques pacientes, usa search_patients para obtener el patient_id correcto.
4. Si el usuario pide facturar, primero usa list_invoiceable_payments para mostrar las opciones.
5. Para crear citas, los datos mínimos son: nombre del paciente, fecha y hora.
6. Responde SIEMPRE en español mexicano.
7. Sé conciso, profesional y amable.
8. Usa emojis moderadamente para hacer la conversación más amigable.
9. Cuando muestres listas, formatea con viñetas claras.
10. Si no puedes hacer algo, dilo honestamente y sugiere alternativas.

Formato de fechas: usa formato natural (ej: "mañana a las 10:00", "lunes 26 de mayo").
Formato de moneda: MXN con el signo $.`;

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
    const MAX_TOOL_ROUNDS = 5;
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
