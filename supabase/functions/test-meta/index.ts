import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN') || "";
  const metaPhoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID') || "";
  
  if (req.method === 'POST') {
    const { templateName, phone, variables } = await req.json();
    
    const templatePayload: any = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName || "confirmacion_cita",
        language: { code: reqBody.language || "es_MX" }
      }
    };
    
    if (variables && Array.isArray(variables)) {
      templatePayload.template.components = [
        {
          type: "body",
          parameters: variables.map((v: string) => ({
            type: "text",
            text: v || ""
          }))
        }
      ];
    }
    
    const tplResponse = await fetch(`https://graph.facebook.com/v25.0/${metaPhoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${metaAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(templatePayload)
    });
    
    const data = await tplResponse.json();
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  }
  
  return new Response("OK", { status: 200 });
});



