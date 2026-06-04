import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, action, patient_context, messages } = await req.json();
    const apiKey = Deno.env.get('GROQ_API_KEY');

    if (!apiKey) {
      throw new Error('GROQ_API_KEY not found in environment');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'generate_soap') {
      systemPrompt = `Eres un asistente de psicología clínica experto en el formato SOAP y la NOM-024. 
      Tu objetivo es transformar notas rápidas o puntos clave en un reporte estructurado y profesional.
      
      REGLAS DE FORMATO MUY IMPORTANTES:
      1. NO uses sintaxis Markdown bajo ninguna circunstancia (prohibido usar asteriscos **, corchetes [] o paréntesis () para nombres de secciones).
      2. El reporte debe verse excepcionalmente limpio y profesional.
      3. Utiliza ÚNICAMENTE etiquetas HTML básicas para estructurar el texto: <h3> para los títulos de las secciones, <strong> para resaltar puntos clave, <p> para párrafos, <ul> y <li> para listas, y <br> para saltos de línea.
      
      Formato de salida esperado (JSON):
      {
        "report": "Texto completo formateado con HTML básico en secciones SOAP: Subjetivo, Objetivo, Análisis, Plan",
        "cie10": "Código CIE-10 sugerido (ej. F41.1)",
        "diagnostico": "Descripción breve del diagnóstico"
      }`;
      
      userPrompt = `Genera un reporte SOAP profesional basado en los siguientes puntos de la sesión:\n\n${text}`;
    } else if (action === 'chat') {
      systemPrompt = `Eres un asistente de psicología clínica inteligente. 
      Utilizas el contexto del expediente del paciente para responder dudas del terapeuta.
      Sé profesional, empático y preciso. No inventes datos que no estén en el contexto.
      
      CONTEXTO DEL PACIENTE:
      ${patient_context || 'No hay contexto adicional disponible.'}`;
      
      // En el chat, 'messages' ya vienen con el historial si se desea, 
      // pero aquí simplificaremos o usaremos el último.
      userPrompt = text;
    } else {
      throw new Error('Action not supported');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: action === 'generate_soap' ? { type: 'json_object' } : undefined,
      }),
    });

    const aiData = await response.json();
    
    if (aiData.error) {
      console.error('Groq API Error:', aiData.error);
      throw new Error(aiData.error.message || 'Error from AI Provider');
    }

    const content = aiData.choices[0].message.content;
    
    let result;
    if (action === 'generate_soap') {
      result = JSON.parse(content);
    } else {
      result = { reply: content };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function execution error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
