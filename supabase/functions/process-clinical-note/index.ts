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

    let messagesToAI = [];

    if (action === 'generate_soap') {
      systemPrompt = `Eres un asistente de psicología clínica experto en el formato SOAP y la norma oficial mexicana NOM-024-SSA3-2012. 
      Tu objetivo es transformar notas rápidas o puntos clave dictados por el terapeuta en un reporte clínico estructurado, riguroso y profesional.
      
      GUARDRAILS Y LÍMITES ÉTICOS:
      1. Solo sintetiza e interpreta clínicamente la información proporcionada. NO inventes eventos, datos ni síntomas que el terapeuta no haya mencionado.
      2. Toda sugerencia de diagnóstico CIE-10 es orientativa y debe ser confirmada por el profesional responsable.
      
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
      messagesToAI = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
    } else if (action === 'refine_note') {
      systemPrompt = `Eres un asistente de psicología clínica experto en redacción de reportes clínicos y la NOM-024.
      Tu objetivo es refinar, corregir o modificar el texto de un reporte clínico basándote en una instrucción específica del terapeuta, manteniendo la estructura HTML del texto.
      
      GUARDRAILS Y LÍMITES ÉTICOS:
      1. Respeta fielmente la intención clínica del terapeuta. No elimines información diagnóstica crítica a menos que el usuario lo solicite explícitamente.
      
      REGLAS DE FORMATO MUY IMPORTANTES:
      1. Mantén o genera la estructura utilizando ÚNICAMENTE etiquetas HTML básicas: <h3>, <strong>, <p>, <ul>, <li>, <br>.
      2. NO uses sintaxis Markdown (prohibido usar asteriscos ** o corchetes [] o paréntesis () para nombres de secciones).
      3. Mantén el tono clínico, profesional e impecable.
      
      Formato de salida esperado (JSON):
      {
        "report": "Texto completo refinado y formateado con HTML básico"
      }`;
      
      userPrompt = `Modifica el siguiente reporte clínico basándote en esta instrucción:\nINSTRUCCIÓN: ${text}\n\nREPORTE ORIGINAL:\n${patient_context || ''}`;
      messagesToAI = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
    } else if (action === 'chat') {
      systemPrompt = `Eres **Saudade AI**, el copilot clínico para el terapeuta. 
      Utilizas el contexto del expediente del paciente para responder dudas exclusivamente clínicas y administrativas del terapeuta responsable.
      
      GUARDRAILS Y LÍMITES ÉTICOS:
      1. Sé estrictamente profesional, empático y preciso.
      2. NUNCA inventes o alucines datos clínicas que no estén respaldados en el contexto del paciente.
      3. Recuerda que la decisión diagnóstica final y el plan terapéutico son responsabilidad exclusiva del terapeuta.
      
      CONTEXTO DEL PACIENTE:
      ${patient_context || 'No hay contexto adicional disponible.'}`;
      
      if (Array.isArray(messages) && messages.length > 0) {
        messagesToAI = [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || m.text || ''
          }))
        ];
      } else {
        messagesToAI = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text || '' }
        ];
      }
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
        model: 'llama-3.3-70b-versatile',
        messages: messagesToAI,
        temperature: 0.1,
        max_tokens: 2048,
        response_format: (action === 'generate_soap' || action === 'refine_note') ? { type: 'json_object' } : undefined,
      }),
    });

    const aiData = await response.json();
    
    if (aiData.error) {
      console.error('Groq API Error:', aiData.error);
      throw new Error(aiData.error.message || 'Error from AI Provider');
    }

    const content = aiData.choices[0].message.content;
    
    let result;
    if (action === 'generate_soap' || action === 'refine_note') {
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
