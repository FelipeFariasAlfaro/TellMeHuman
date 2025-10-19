import { storageGet } from '../sidepanel.js';
import { leng, setting_leng } from "./lang.js";
import { ENDPOINTS } from './urls.js'

setting_leng();



const systemPrompt = `Eres un evaluador que estima la probabilidad de que un TEXTO haya sido generado por IA.
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

function buildUserPrompt(text) {
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
  Swal.fire({
    icon: 'info',
    title: 'cargando',
    text: 'Espera unos momentos',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  });

  if (typeof window.LanguageModel === 'undefined') {
    Swal.close();
    Swal.fire('Error', 'La API LanguageModel no está disponible en este contexto.', 'error');
    return;
  }

  // Para Chrome LanguageModel initialPrompts / prompt:
  const LLM_OPTS = {
    initialPrompts: [{ role: 'system', content: systemPrompt }],
    expectedInputs: [{ type: 'text', languages: ['es'] }],
    expectedOutputs: [{ type: 'text', languages: ['es'] }]
  };

  let session = null;
  try {
    const availability = await LanguageModel.availability(LLM_OPTS);
    console.log('LanguageModel availability:', availability);
    if (availability === 'unavailable') {
      Swal.close();
      Swal.fire('No disponible', 'El modelo no está disponible en este contexto.', 'error');
      return;
    }

    session = await LanguageModel.create(LLM_OPTS);
    const rawAnswer = await session.prompt([{ role: 'user', content: buildUserPrompt(text) }], LLM_OPTS);
    console.log('rawAnswer desde session.prompt():', rawAnswer);


    Swal.close();
    return rawAnswer;
  } catch (err) {
    console.error('Error LanguageModel:', err);
    Swal.close();
    Swal.fire('Error', 'Error al usar la API de LanguageModel: ' + (err?.message || String(err)), 'error');
  } finally {
    try { if (session) session.destroy(); } catch (e) { console.warn('destroy error', e); }
  }
}

export async function analizewithOpenAI(text) {
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

    const data = await storageGet(['openai_key']);
    const key = data.openai_key;
    if (!key) {
      result.innerText = 'No hay OpenAI API key configurada. Abre Opciones y pega tu clave.';
      btn.disabled = false;
      return;
    }

    // Preparar prompt / body
    const system = `Eres un asistente que evalúa si un texto fue generado por IA. RESPONDE SOLO JSON válido con las claves:
        - probability: entero 0-100 (probabilidad estimada de que el texto sea generado por IA)
        - explanation: array de strings con puntos cortos que justifiquen la estimación.`;
    const user = `Texto:
      ---START---
      ${text}
      ---END---
      Devuelve SOLO un JSON con probability (0-100) y explanation (lista de razones cortas).`;

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

export async function testOpenAIConfig() 
{
  try{
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
      await chrome.storage.sync.set({openai_key: ''});
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
      await chrome.storage.sync.set({openai_key: ''});
      return false;
    }
  }catch(e){
    Swal.fire({
      icon: 'error',
      title: leng.MSG_ERROR_SWAL,
      text: leng.MSG_IA_OPENAI_ERROR_TOKEN,
      confirmButtonText: leng.BTN_ENTIENDO
    });
    document.getElementById('openai-token').value = '';
    await chrome.storage.sync.set({openai_key: ''});
    return false;
  }  
}

export async function analizeWithGemini(text) {
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

    const system = `Eres un asistente que evalúa si un texto fue generado por IA. RESPONDE SOLO JSON válido con las claves:
        - probability: entero 0-100 (probabilidad estimada de que el texto sea generado por IA)
        - explanation: array de strings con puntos cortos que justifiquen la estimación.`;

    const user = `Texto:
      ---START---
      ${text}
      ---END---
      Devuelve SOLO un JSON con probability (0-100) y explanation (lista de razones cortas).`;

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

