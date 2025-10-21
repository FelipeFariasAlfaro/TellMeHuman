import { leng, setting_leng } from "./lang.js";
import { ENDPOINTS } from './urls.js'

setting_leng();


async function callGeminiAI(systemPrompt, userPrompt) {
  try {
    // Mostrar loader (igual que en tu función original)
    Swal.fire({
      icon: 'info',
      title: "cargando",
      text: "Espera unos momentos",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    const { gemini_key } = await chrome.storage.sync.get(['gemini_key']);
    const { gemini_model } = await chrome.storage.sync.get(['gemini_model']);

    const GOOGLE_API_KEY = gemini_key;
    const MODEL = gemini_model;

    if (!GOOGLE_API_KEY) {
      Swal.close();
      result.innerText = 'No hay Google API key configurada. Abre Opciones y pega tu clave.';
      btn.disabled = false;
      return;
    }

    const system = systemPrompt;

    const user = userPrompt;

    const body = {
      contents: [
        {
          parts: [
            { text: system + "\n\n" + user }
          ]
        }
      ],
      generationConfig: {
        temperature: 0,
        candidateCount: 1
      }
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const textErr = await resp.text();
      throw new Error(`Gemini API error ${resp.status}: ${textErr}`);
    }

    const dataJson = await resp.json();
    console.log('Gemini response (raw):', dataJson);

    // --- Inline: extraer de forma robusta el texto generado por Gemini ---
    let replyText = '';
    try {
      const c0 = dataJson?.candidates?.[0];

      if (c0) {
        // rutas comunes y variadas
        if (c0?.content?.parts?.[0]?.text) replyText = c0.content.parts[0].text;
        else if (Array.isArray(c0?.content) && c0.content[0]?.text) replyText = c0.content[0].text;
        else if (c0?.text) replyText = c0.text;
        else if (c0?.content?.[0]?.output?.[0]?.content?.text) replyText = c0.content[0].output[0].content.text;
        else if (c0?.output?.[0]?.content?.[0]?.text) replyText = c0.output[0].content[0].text;
      }

      // otras rutas alternativas
      if (!replyText) {
        if (dataJson?.output?.[0]?.content?.[0]?.text) replyText = dataJson.output[0].content[0].text;
        else if (typeof dataJson === 'string') replyText = dataJson;
      }
    } catch (e) {
      replyText = '';
    }

    replyText = String(replyText || '').trim();

    // Normalizar a la forma que usa tu código (como OpenAI)
    const normalized = {
      choices: [
        {
          message: { content: replyText },
          text: replyText
        }
      ],
      raw: dataJson
    };

    console.log('Gemini response (normalized):', normalized);

    Swal.close();
    return normalized;
  } catch (err) {
    Swal.close();
    Swal.fire("Error", "Error al conectar con Gemini: " + (err?.message || String(err)), "error");
  }
}

async function callOpenAI(systemPrompt, userPrompt) {
  try {
    // Obtener clave desde storage
    Swal.fire({
      icon: 'info',
      title: "cargando",
      text: "Espera unos momentos",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    //const data = await storageGet(['openai_key']);
    ///const key = data.openai_key;
    const { openai_key } = await chrome.storage.sync.get(['openai_key']);
    const key = openai_key;
    if (!key) {
      result.innerText = 'No hay OpenAI API key configurada. Abre Opciones y pega tu clave.';
      btn.disabled = false;
      return;
    }

    // Preparar prompt / body
    const system = systemPrompt;
    const user = userPrompt;

    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0
    };

    // Llamada a la API
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const textErr = await resp.text();
      throw new Error(`OpenAI API error ${resp.status}: ${textErr}`);
    }

    // <-- FIX: llamar a resp.json() y esperar el resultado
    const dataJson = await resp.json();

    // opcional: ver el contenido en consola para debug
    console.log('OpenAI response:', dataJson);

    Swal.close();
    return dataJson;
  } catch (err) {
    Swal.fire("Error", "Error al conectar con OpenAI: " + (err?.message || String(err)), "error");
  }
}

async function callChromeAI(systemPrompt, userPrompt) {
  Swal.fire({
    icon: 'info',
    title: 'cargando',
    text: 'Espera unos momentos',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  });

  /*
  if (typeof window.LanguageModel === 'undefined') {
    Swal.close();
    Swal.fire('Error', 'La API LanguageModel no está disponible en este contexto.', 'error');
    return;
  }
    */

  // Para Chrome LanguageModel initialPrompts / prompt:
  const LLM_OPTS = {
    initialPrompts: [{ role: 'system', content: systemPrompt }],
    expectedInputs: [{ type: 'text', languages: ['es'] }],
    expectedOutputs: [{ type: 'text', languages: ['es'] }]
  };

  let session = null;
  try {
    
    const availability = await LanguageModel.availability(LLM_OPTS);
    
    if (availability === 'unavailable') {
      Swal.close();
      Swal.fire('No disponible', 'El modelo no está disponible en este contexto.', 'error');
      return;
    }

    session = await LanguageModel.create(LLM_OPTS);
    const rawAnswer = await session.prompt([{ role: 'user', content: userPrompt }], LLM_OPTS);

    Swal.close();
    return rawAnswer;
  } catch (err) {
    console.error('Error LanguageModel:', err);
    Swal.close();
    Swal.fire('Error', 'Error al usar la API de LanguageModel: ' + (err?.message || String(err)), 'error');
  } finally {
    try { 
      if (session) 
        session.destroy(); 
    } catch (e) 
    { console.warn('destroy error', e); }
  }
}


export async function testOpenAIConfig() {
  try {
    const { openai_key, openai_model } = await chrome.storage.sync.get(['openai_key', 'openai_model']);

    const resp = await fetch(ENDPOINTS.OPENAI_MODELS, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openai_key}`
      }
    });

    if (!resp.ok) {
      Swal.fire({
        icon: 'error',
        title: leng.MSG_ERROR_SWAL,
        text: leng.MSG_IA_OPENAI_ERROR_TOKEN,
        confirmButtonText: leng.BTN_ENTIENDO
      });
      document.getElementById('openai-token').value = '';
      await chrome.storage.sync.set({ openai_key: '' });
      return false;
    }

    const data = await resp.json();
    const exists = data.data.some(m => m.id === openai_model);

    if (exists) {
      Swal.fire({
        icon: 'success',
        title: leng.EXITO_SWAL,
        text: leng.MSG_IA_GUARDADO_OK,
        confirmButtonText: 'OK'
      });

      return true;
    } else {
      Swal.fire({
        icon: 'error',
        title: leng.MSG_ERROR_SWAL,
        text: leng.MSG_IA_OPENAI_ERROR_TOKEN,
        confirmButtonText: leng.BTN_ENTIENDO
      });
      document.getElementById('openai-token').value = '';
      await chrome.storage.sync.set({ openai_key: '' });
      return false;
    }
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: leng.MSG_ERROR_SWAL,
      text: leng.MSG_IA_OPENAI_ERROR_TOKEN,
      confirmButtonText: leng.BTN_ENTIENDO
    });
    document.getElementById('openai-token').value = '';
    await chrome.storage.sync.set({ openai_key: '' });
    return false;
  }
}

/* ------------ ANALISIS -------------- */

const systemPromptAnalisys = `Eres un evaluador que estima la probabilidad de que un TEXTO haya sido generado por IA.
RESPONDE SOLO UN JSON VÁLIDO EN UNA ÚNICA LÍNEA con las claves:
- probability: entero 0-100 (0 = humano, 100 = IA)
- explanation: array de strings cortos (máx 5 items) con razones concretas y concisas

REGLAS IMPORTANTES:
- NO agregues texto adicional: **solo** devuelve el JSON en su formato tradicional (sin etiquetas, sin explicaciones, sin backticks ni bloques de código).
- Para considerar que un texto es de IA, busca características como: frases repetitivas y n-grams repetidos, baja variedad léxica (TTR reducido), longitud de oraciones uniforme, estructura muy pulida y coherente, tono neutro/formal y genérico, exceso de frases de transición ("en resumen","además"), formato en listas o resúmenes, falta de detalles personales o anécdotas, uso sistemático de sinónimos para evitar repeticiones exactas, puntuación y ortografía impecables, ausencia de errores tipográficos o disfluencias, respuestas demasiado exhaustivas o demasiado concisas, vocabulario amplio pero superficial ("eficiencia","optimizar"), frases tipo "como modelo de lenguaje"/disclaimers, repetición de estructuras sintácticas, evasión de posturas personales, ejemplos y estadísticas genéricos, fluidez alta pero baja originalidad, tendencia a seguir plantillas, posibles artefactos de watermarking, señales de baja sorpresa en log-prob/perplexity.
- Para considerar que un texto es humano, busca características como: anécdotas personales, detalles sensoriales, lenguaje coloquial, errores tipográficos, estructura narrativa con experiencia.
- Basa la probability en la combinación de estas señales, determinando una posible tendencia.
- Cada elemento de "explanation" debe ser breve (8-15 palabras) y apuntar a una evidencia observada en el texto.
- ASEGURATE CON DOBLE VALIDACION de que el JSON sea siempre parseable y válido
- VERIFICA que explanation sea un array de strings cortos, y que el array tiene el formato correcto, incluyendo corchetes y comillas y los [] de apertura y cierre.
`;

function buildUserPromptAnalisys(text) {
  return `A continuación hay tres ejemplos que muestran el formato y la calibración esperada. OBSÉRVALOS y aplica la misma escala:

EJEMPLO 1 (HUMANO)
Texto:
"Anoche fuimos a la feria del barrio; la gente traía recetas familiares y un perro se perdió y luego apareció."
Resultado (JSON):
{"probability":5,"explanation":["Anécdota personal y detalles sensoriales","Lenguaje coloquial y específico","Estructura narrativa con experiencia"]}

EJEMPLO 2 (IA)
Texto:
"En resumen, las estrategias de optimización deberían priorizar eficiencia, escalabilidad y modularidad; además se recomienda monitoreo continuo."
Resultado (JSON):
{"probability":95,"explanation":["Tono formal y generalista","Frases genéricas sobre buenas prácticas","Estructura tipo resumen lista"]}

EJEMPLO 3 (AMBIGUO CORTO)
Texto:
"Hola, ¿cómo estás?"
Resultado (JSON):
{"probability":50,"explanation":["Muy breve y genérico","Frecuente en corpora automáticos","Falta de rasgos personales claros"]}

AHORA: Evalúa el siguiente TEXTO y devuelve SOLO el JSON en UNA LÍNEA con las claves "probability" y "explanation" tal como en los ejemplos.
Texto a evaluar:
---START---
${text}
---END---

RECUERDA: devuelve únicamente el JSON en una sola línea, sin comentarios ni fences.`;
}

// Versión final de analizewithChrome que utiliza extractFirstJSON
export async function analizewithChrome(text) {
  let respuesta = await callChromeAI(systemPromptAnalisys, buildUserPromptAnalisys(text));
  return respuesta;
}

export async function analizewithOpenAI(text) {
  let respuesta = await callOpenAI(systemPromptAnalisys, buildUserPromptAnalisys(text))
  return respuesta
}

export async function analizeWithGemini(text) {
  const resp = await callGeminiAI(systemPromptAnalisys, buildUserPromptAnalisys(text));
  return resp;
}


/* ------------ PERTINENCIA -------------- */

const systemPromptPertinence = `Eres un modelo de verificación y clasificación de contenido. 
Tu tarea es analizar brevemente textos y entregar un informe estructurado y accionable que ayude a un revisor 
humano a decidir si el texto requiere comprobación, revisión por experto, o es seguro/adecuado tal cual.`;

function buildUserPromptPertinence(text) {
  return `Sobre el texto que te indico al final, Realiza:
A) clasificación del dominio/género (elige una etiqueta única de esta lista exacta: scientific, educational, news, opinion, promotional, legal, medical, technical, social, other).
B) un resumen conciso (1-2 frases).
C) identifica y enumera problemas potenciales o afirmaciones que requieran verificación (cada ítem con: tipo, por qué, nivel de urgencia: low/medium/high).
D) sugiere acciones concretas (verificar fuente, buscar DOI/estudio, pedir revisión experta, añadir disclaimer, no publicar).
E) asigna un score de confianza 0-100 sobre la clasificación y una estimación de la veracidad general (low/medium/high/unknown).
F) si hay afirmaciones factuales, extrae hasta 5 frases/afirmaciones exactas que deban comprobarse.

**Formato de salida (devuelve SOLO JSON válido, nada más):**
{
  "domain": "scientific",
  "confidence": 87,
  "summary": "Resumen en 1-2 frases",
  "veracity": "medium",
  "issues": [
    {"claim": "El XXX cura YYY", "type": "medical_claim", "why": "no cita estudio; lenguaje categórico", "urgency": "high"},
    ...
  ],
  "check_suggestions": [
    {"action": "buscar DOI / estudio peer-reviewed", "priority":"high"},
    {"action": "consultar experto médico", "priority":"high"},
    {"action": "añadir disclaimer", "priority":"medium"}
  ],
  "claims_to_check": ["El XXX cura YYY", "El 80% de ..."],
  "notes": "Cualquier comentario adicional (opcional)."
}

Texto a evaluar:
---START---
${text}
---END---`;
}

export async function analizePertinencewithChrome(text) {
  let respuesta = await callChromeAI(systemPromptPertinence, buildUserPromptPertinence(text));
  return respuesta;
}


export async function analizePertinencewithOpenAI(text) {
  let respuesta = await callOpenAI(systemPromptPertinence, buildUserPromptPertinence(text))
  return respuesta
}


export async function analizePertinenceWithGemini(text) {
  const resp = await callGeminiAI(systemPromptPertinence, buildUserPromptPertinence(text));
  return resp;

}

/* -------- Humanizar ------------ */


const systemPromptHumanized = `Eres un asistente que reescribe textos para que suenen más humanos y naturales, preservando completamente el significado original.
Sigue estas reglas:
- Mantén siempre el significado original del texto.
- Reescribe las oraciones para que fluyan de manera natural y conversacional, evitando construcciones que parezcan generadas por IA.
- Conserva el estilo y tono del texto original, incluyendo nivel de formalidad, vocabulario y contexto.
- Varía la longitud de las oraciones y utiliza contracciones u expresiones naturales cuando sea adecuado.
- Proporciona solo el texto reescrito, sin explicaciones ni comentarios adicionales.`;

function buildUserPromptHumanized(text) {
  return `
    AHORA: Humaniza el siguiente TEXTO y devuelve la respuesta como un JSON solo con la clave "humanized_text".
    Texto a evaluar:
    ---START---
    ${text}
    ---END---
    RECUERDA: devuelve únicamente el JSON en una sola línea, sin comentarios ni fences.`;
}

export async function humanizeTextChrome(text) 
{
    try {
        const aiGlobal = (typeof window !== 'undefined') ? window.ai || window.chrome?.ai : null;

        if (aiGlobal && (aiGlobal.rewriter)) 
        {
            const api = aiGlobal.rewriter || aiGlobal.proofreader;
            const reply = await api.rewrite?.({
                text,
                instructions: 'Reescribe este texto para que suene más humano y natural, conservando el significado. Usa oraciones de diferente longitud, contracciones ocasionales y un fraseo natural. Mantén un tono similar al original.',
            
            }) ?? await api.proofread?.({
                text,
                instructions: 'Reescribe para sonar más humano y natural mientras preserva el significado.'
            });

            const suggested =
                reply?.suggestedText ||
                reply?.rewrittenText ||
                reply?.text ||
                (typeof reply === 'string' ? reply : null);

            if (suggested) {
                console.log("Utililizado el primer intento con rewrite")
                return { humanized_text: String(suggested) };
            }
        }
    } catch (err) {
        console.warn('Proofreader/rewriter no disponible o error:', err);
    }

    try {
        const LM = (typeof window !== 'undefined') ? window.LanguageModel || window.ai?.languageModel : null;

        if (LM && typeof LM.create === 'function') {
            const session = await LM.create({
                expectedInputs: [{ type: 'text', languages: ['es', 'en'] }],
                expectedOutputs: [{ type: 'text', languages: ['es', 'en'] }],
                initialPrompts: [{
                    role: 'system',
                    content: systemPromptHumanized
                }]
            });

            const prompt = buildUserPromptHumanized(text);

            const raw = await session.prompt(prompt);
            const humanized = (typeof raw === 'string') ? raw.trim() : (raw?.text || '');

            try { await session.destroy(); } catch (e) { /* ignore */ }

            if (humanized) return { humanized_text: humanized };
        }
    } catch (err) {
        console.warn('Prompt API fallback falló:', err);
    }
}

export async function humanizedWithOpenAI(text) {
  let respuesta = await callOpenAI(systemPromptHumanized, buildUserPromptHumanized(text))
  return respuesta
}

export async function humanizedWithGeminiAI(text) {
  let respuesta = await callGeminiAI(systemPromptHumanized, buildUserPromptHumanized(text))
  return respuesta
}

