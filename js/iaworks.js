import { leng, setting_leng } from "./lang.js";
import { ENDPOINTS } from './urls.js'

setting_leng();


async function callGeminiAI(systemPrompt, userPrompt) {

  // Mostrar loader (igual que en tu función original)
  Swal.close();
  Swal.fire({
    icon: 'info',
    title: leng.CARGANDO,
    text: leng.ANALIZANDO,
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
    result.innerText = leng.NO_API_GOOGLE;
    Swal.fire({
      title: 'Error',
      html: leng.NO_API_GOOGLE,
      icon: 'error',
      confirmButtonText: leng.BTN_ENTIENDO
    });
    btn.disabled = false;
    return;
  }

  const system = systemPrompt;
  const user = userPrompt;
  const body = {
    contents: [{ parts: [{ text: system + "\n\n" + user }] }],
    generationConfig: {
      temperature: 0,
      candidateCount: 1
    }
  };

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_API_KEY
      },
      body: JSON.stringify(body)
    });

    const status = resp.status;

    if (status > 300) {
      throw new Error(`Error HTTP`);
    }

    if (!resp.ok) {
      throw new Error(`Respuesta no valida`);
    }

    const dataJson = await resp.json();

    // --- Inline: extraer de forma robusta el texto generado por Gemini ---
    let replyText = '';
    try {
      const c0 = dataJson?.candidates?.[0];

      if (c0) {
        if (c0?.content?.parts?.[0]?.text) replyText = c0.content.parts[0].text;
        else if (Array.isArray(c0?.content) && c0.content[0]?.text) replyText = c0.content[0].text;
        else if (c0?.text) replyText = c0.text;
        else if (c0?.content?.[0]?.output?.[0]?.content?.text) replyText = c0.content[0].output[0].content.text;
        else if (c0?.output?.[0]?.content?.[0]?.text) replyText = c0.output[0].content[0].text;
      }

      if (!replyText) {
        if (dataJson?.output?.[0]?.content?.[0]?.text) replyText = dataJson.output[0].content[0].text;
        else if (typeof dataJson === 'string') replyText = dataJson;
      }
    } catch (err) {
      replyText = '';
      throw new Error(`Parsing error`);
    }

    replyText = String(replyText || '').trim();

    const normalized = {
      choices: [
        {
          message: { content: replyText },
          text: replyText
        }
      ],
      raw: dataJson
    };

    Swal.close();
    return normalized;
  }
  catch (err) {
    Swal.close();
    if (err.message === 'Error HTTP') {
      Swal.fire({
        title: 'Error',
        html: leng.ERROR_HTTP,
        icon: 'error',
        confirmButtonText: leng.BTN_ENTIENDO
      });
      return false;

    } else if (err.message === 'Parsing error') {
      Swal.fire({
        title: 'Error',
        html: leng.ERROR_RESPUESTA_NOPARSEABLE,
        icon: 'error',
        confirmButtonText: leng.BTN_ENTIENDO
      });
      return false;
    } else {
      Swal.fire({
        title: 'Error',
        html: leng.ERROR_EN_ANALISIS,
        icon: 'error',
        confirmButtonText: leng.BTN_ENTIENDO
      });
      return false;
    }
  }
}

async function callOpenAI(systemPrompt, userPrompt) {

  // Obtener clave desde storage
  Swal.close();
  Swal.fire({
    icon: 'info',
    title: leng.CARGANDO,
    text: leng.ANALIZANDO,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  });

  const { openai_key } = await chrome.storage.sync.get(['openai_key']);
  const { openai_model } = await chrome.storage.sync.get(['openai_model']);
  let key = openai_key;
  key = key.trim();
  const MODEL = openai_model;

  if (!key) {
    result.innerText = "";
    Swal.close();
    Swal.fire({
      title: 'Error',
      html: leng.NO_OPENAI,
      icon: 'error',
      confirmButtonText: leng.BTN_ENTIENDO
    });
    btn.disabled = false;
    return;
  }

  const system = systemPrompt;
  const user = userPrompt;
  const body = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 1
  };

  try {

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify(body)
    });

    const status = resp.status;

    if (status > 300) {
      throw new Error(`Error HTTP`);
    }

    if (!resp.ok) {
      throw new Error(`Respuesta no valida`);
    }

    const dataJson = await resp.json();

    Swal.close();
    return dataJson;
  } catch (err) {
    Swal.close();
    if (err.message === 'Error HTTP') {
      Swal.fire({
        title: 'Error',
        html: leng.ERROR_HTTP,
        icon: 'error',
        confirmButtonText: leng.BTN_ENTIENDO
      });
      return false;
    } else {
      Swal.fire({
        title: 'Error',
        html: leng.ERROR_EN_ANALISIS,
        icon: 'error',
        confirmButtonText: leng.BTN_ENTIENDO
      });
      return false;
    }
  }
}

async function callChromeAI(systemPrompt, userPrompt) {
  //evita ejecutar dos veces ---
  if (window.__callChromeAI_running) {
    console.warn('[callChromeAI] invocation blocked: already running');
    console.trace();
    return false;
  }
  window.__callChromeAI_running = true;

  //--- Estado y flags ---
  let session = null;
  let modalType = null; // 'spinner' | 'download' | null
  let downloadModalShown = false;
  let firstDownloadEventSeen = false;
  let successShown = false;
  let createInProgress = false;
  let debounceTimer = null;

  function safeCloseSwal() {
    try { Swal.close(); } catch (e) {}
    modalType = null;
  }

  function showSpinnerModal() {
    modalType = 'spinner';
    try {
      Swal.fire({
        icon: 'info',
        title: leng.CARGANDO,
        text: leng.ANALIZANDO,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });
    } catch (e) { console.warn('showSpinnerModal err', e); }
  }

  function showDownloadModalOnce(initialText = leng.DOWNLOAD) {
    if (downloadModalShown) return;
    downloadModalShown = true;
    modalType = 'download';
    try {
      Swal.fire({
        title: leng.PREPARE_IA,
        html: `
          <div style="text-align:left">
            <div id="ia-progress-text">${initialText}</div>
            <div style="margin-top:8px">
              <div style="background:#eee;border-radius:6px;overflow:hidden">
                <div id="ia-progress-bar" style="width:0%;height:12px;transition:width 300ms ease"></div>
              </div>
            </div>
            <div style="margin-top:6px;font-size:12px;color:#666">
              ${leng.MSG_INTERNO_DOWNLOAD}
            </div>
          </div>
        `,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false
      });
    } catch (e) { console.warn('showDownloadModalOnce err', e); }
  }

  function updateDownloadProgressImmediate(pct, text) {
    const container = Swal.getHtmlContainer();
    if (!container) return;
    const bar = container.querySelector('#ia-progress-bar');
    const txt = container.querySelector('#ia-progress-text');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (txt && text) txt.textContent = text;
  }
  function updateDownloadProgress(pct, text) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => updateDownloadProgressImmediate(pct, text), 80);
  }

  function isIneligibleError(err) {
    const msg = (err && err.message) ? err.message : ('' + err);
    return /not.*eligible|elegible|device.*not.*eligible|not.*eligible.*for.*on-?device/i.test(msg);
  }

  // abrimos spinner inicial
  safeCloseSwal();
  showSpinnerModal();

  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);

  const LLM_OPTS = {
    initialPrompts: [{ role: 'system', content: systemPrompt }],
    expectedInputs: [{ type: 'text', languages: ['' + lenguaje] }],
    expectedOutputs: [{ type: 'text', languages: ['' + lenguaje] }]
  };

  try {
    // 1) availability (decisión inicial pero NO mostrar modal de descarga basándose solo en esto)
    let availability;
    try {
      availability = await LanguageModel.availability(LLM_OPTS);
    } catch (avErr) {
      safeCloseSwal();
      Swal.fire('Error', leng.ERROR_MODELO_CHROME, 'error');
      return false;
    }

    if (availability === 'unavailable') {
      safeCloseSwal();
      Swal.fire('Error', leng.ERROR_MODELO_CHROME, 'error');
      return false;
    }

    const alreadyAvailable = (availability === 'available');

    // 2) create() con monitor — el monitor SOLO abrirá el modal de descarga si:
    //    - availability !== 'available' (es decir, esperamos descarga posible), y
    //    - create() aún está en progreso, y
    //    - es el primer evento de downloadprogress recibido.
    createInProgress = true;
    session = await LanguageModel.create({
      ...LLM_OPTS,
      monitor: (m) => {
        // attach handler defensivo
        const attachHandler = (handler) => {
          if (typeof m.addEventListener === 'function') m.addEventListener('downloadprogress', handler);
          else if (typeof m.on === 'function') m.on('downloadprogress', handler);
        };

        attachHandler((e) => {
          // ignorar eventos si availability dijo available
          if (alreadyAvailable) {
            return;
          }

          // ignorar si create ya terminó
          if (!createInProgress) {
            return;
          }

          // parse defensivo
          let pct = null;
          try {
            if (typeof e.loaded === 'number' && typeof e.total === 'number' && e.total > 0) {
              pct = Math.round((e.loaded / e.total) * 100);
            } else if (typeof e.loaded === 'number' && e.loaded <= 1) {
              pct = Math.round(e.loaded * 100);
            } else if (typeof e.loaded === 'number') {
              pct = Math.round(e.loaded);
            } else if (e?.detail && typeof e.detail.progress === 'number') {
              pct = Math.round(e.detail.progress * 100);
            }
          } catch (parseErr) {
            console.warn('[callChromeAI] parse progress err', parseErr);
          }

          // Solo abrir modal de descarga si NO estaba disponible y es el primer evento
          if (!firstDownloadEventSeen && !alreadyAvailable) {
            firstDownloadEventSeen = true;
            try { Swal.close(); } catch (_) {}
            showDownloadModalOnce(leng.DOWNLOAD);
          }

          // actualizar barra si estamos en modal de descarga
          if (modalType === 'download') {
            if (pct !== null) updateDownloadProgress(pct, `${leng.AVANCE} ${pct}%`);
            else updateDownloadProgress(0, `${leng.AVANCE}...`);
          } else {
            console.log('[callChromeAI] downloadprogress recibido pero modalType != download', e);
          }
        });
      }
    });

    // create() ya retornó
    createInProgress = false;
    console.log('[callChromeAI] create() completó, firstDownloadEventSeen=', firstDownloadEventSeen);

    // Si había descarga real (availability != available) y vimos eventos -> pedir reinicio y SALIR
    if (!alreadyAvailable && firstDownloadEventSeen) {
      try { await chrome.storage.sync.set({ modelPendingRestart: true }); } catch (setErr) { console.warn('modelPendingRestart set err', setErr); }

      safeCloseSwal();
      if (!successShown) {
        successShown = true;
        await Swal.fire({
          title: leng.DOWNLOAD_COMPLETE,
          html: `${leng.MSG_COMPLETE}`,
          icon: 'success',
          confirmButtonText: leng.BTN_ENTIENDO
        });
      }

      try { if (session && typeof session.destroy === 'function') session.destroy(); } catch (dErr) { console.warn('destroy err', dErr); }
      return 'restart_required';
    }

    const rawAnswer = await session.prompt([{ role: 'user', content: userPrompt }], LLM_OPTS);
    return rawAnswer;

  } catch (err) {
    console.error('[callChromeAI] error final', err);
    safeCloseSwal();

    if (isIneligibleError(err)) {
      const res = await Swal.fire({
        title: leng.NOCOMPATIBLE,
        html: `${leng.MSG_NOCOMPATIBLE}`,
        icon: 'error',
        confirmButtonText: leng.BTN_ENTIENDO,
      });
      return false;
    }

    return false;
  } finally {
    try { 
      if (session && typeof session.destroy === 'function') 
        session.destroy(); 
    } 
    catch (destroyErr) { 
      console.warn('Error destroying session', destroyErr); 
    }
    window.__callChromeAI_running = false;
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

    console.log("Codigo:", resp.status);
    if (!resp.ok || resp.status === 401) {
      console.log("Entré!");
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Upsss! error',
        text: leng.ERROR_OPENAI1,
        confirmButtonText: leng.BTN_ENTIENDO
      });
      document.getElementById('openai-token').value = '';
      await chrome.storage.sync.set({ openai_key: '' });
      return false;
    }
    else {
      const data = await resp.json();
      const exists = data.data.some(m => m.id === openai_model);

      if (exists) {
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: leng.EXITO_SWAL,
          text: leng.MSG_IA_GUARDADO_OK,
          confirmButtonText: 'OK'
        });

        return true;
      } else {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Upss!',
          text: leng.ERROR_OPENAI_VALIDACION,
          confirmButtonText: leng.BTN_ENTIENDO
        });
        document.getElementById('openai-token').value = '';
        await chrome.storage.sync.set({ openai_key: '' });
        return false;
      }
    }


  } catch (e) {
    Swal.close();
    Swal.fire({
      icon: 'error',
      title: 'Upss!',
      text: leng.ERROR_OPENAI_VALIDACION,
      confirmButtonText: leng.BTN_ENTIENDO
    });
    document.getElementById('openai-token').value = '';
    await chrome.storage.sync.set({ openai_key: '' });
    return false;
  }
}

/* ------------ ANALISIS -------------- */

const systemPromptAnalisys_es = `Eres un evaluador que estima la probabilidad de que un TEXTO haya sido generado por IA.
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
const systemPromptAnalisys_en = `You are an evaluator estimating the probability that a TEXT was generated by AI.
ONLY RESPOND WITH VALID JSON ON A SINGLE LINE with the following keys:
- probability: integer 0-100 (0 = human, 100 = AI)
- explanation: array of short strings (maximum 5 items) with concrete and concise reasons

IMPORTANT RULES:
- DO NOT add additional text: **only** return the JSON in its traditional format (no tags, no explanations, no backticks, or code blocks).
- To consider a text as AI, look for features such as: repetitive phrases and repeated n-grams, low lexical variety (low TTR), uniform sentence length, highly polished and coherent structure, neutral/formal and generic tone, excessive transitional phrases ("in summary", "in addition"), list or summary format, lack of personal details or anecdotes, systematic use of synonyms to avoid exact repetitions, impeccable punctuation and spelling, absence of typos or disfluencies, overly exhaustive or overly concise answers, broad but shallow vocabulary ("efficiency", "optimize"), "as a language model" type phrases/disclaimers, repetition of syntactical structures, avoidance of personal positions, generic examples and statistics, high fluency but low originality, tendency to follow templates, possible watermarking artifacts, signs of low surprise in log-prob/perplexity.
- To consider a text human, look for characteristics such as: personal anecdotes, sensory details, colloquial language, typos, and experienced narrative structure.
- Base probability on the combination of these signals, determining a possible bias.
- Each "explanation" element should be brief (8-15 words) and point to evidence observed in the text.
- ENSURE WITH DOUBLE VALIDATION that the JSON is always parsable and valid.
- VERIFY that explanation is an array of short strings, and that the array is formatted correctly, including brackets and quotes, and the opening and closing [].
`;

function buildUserPromptAnalisys_es(text) {
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
function buildUserPromptAnalisys_en(text) {
  return `Below are three examples that show the expected format and calibration. OBSERVE THEM and apply the same scale:

EXAMPLE 1 (HUMAN)
Text:
"Last night we went to the neighborhood fair; people were bringing family recipes, and a dog got lost and then reappeared."
Result (JSON):
{"probability":5,"explanation":["Personal anecdote and sensory details","Colloquial and specific language","Narrative structure with experience"]}

EXAMPLE 2 (AI)
Text:
"In summary, optimization strategies should prioritize efficiency, scalability, and modularity; continuous monitoring is also recommended."
Result (JSON):
{"probability":95,"explanation":["Formal and general tone","Generic phrases about best practices","List summary structure"]}

EXAMPLE 3 (SHORT AMBIGUOUS)
Text:
"Hello, how are you?"
Result (JSON):
{"probability":50,"explanation":["Very brief and generic","Frequent in automatic corpora","Lack of clear personal traits"]}

NOW: Evaluate the following TEXT and return ONLY the JSON on ONE LINE with the keywords "probability" and "explanation" as in the examples.
Text to evaluate:
---START---
${text}
---END---

REMEMBER: return only the JSON on a single line, without comments or fences.`;
}

// Versión final de analizewithChrome que utiliza extractFirstJSON
export async function analizewithChrome(text) {
  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  if (lenguaje === 'es') {
    let respuesta = await callChromeAI(systemPromptAnalisys_es, buildUserPromptAnalisys_es(text));
    return respuesta;
  } else {
    let respuesta = await callChromeAI(systemPromptAnalisys_en, buildUserPromptAnalisys_en(text));
    return respuesta;
  }

}

export async function analizewithOpenAI(text) {
  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  if (lenguaje === 'es') {
    let respuesta = await callOpenAI(systemPromptAnalisys_es, buildUserPromptAnalisys_es(text))
    return respuesta
  } else {
    let respuesta = await callOpenAI(systemPromptAnalisys_en, buildUserPromptAnalisys_en(text))
    return respuesta
  }
}

export async function analizeWithGemini(text) {
  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  if (lenguaje === 'es') {
    const resp = await callGeminiAI(systemPromptAnalisys_es, buildUserPromptAnalisys_es(text));
    return resp;
  } else {
    const resp = await callGeminiAI(systemPromptAnalisys_en, buildUserPromptAnalisys_en(text));
    return resp;
  }

}


/* ------------ PERTINENCIA -------------- */

const systemPromptPertinence_es = `Eres un modelo de verificación y clasificación de contenido. 
Tu tarea es analizar brevemente textos y entregar un informe estructurado y accionable que ayude a un revisor 
humano a decidir si el texto requiere comprobación, revisión por experto, o es seguro/adecuado tal cual.`;
const systemPromptPertinence_en = `You are a content verification and classification model.
Your task is to briefly analyze texts and deliver a structured, actionable report that helps a human reviewer decide whether the text requires verification, peer review, or is safe/suitable as is.`;

function buildUserPromptPertinence_es(text) {
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

function buildUserPromptPertinence_en(text) {
  return `For the text I've provided at the end, do the following:
A) Domain/Genre Classification (choose a single tag from this exact list: scientific, educational, news, opinion, promotional, legal, medical, technical, social, other).
B) A concise summary (1-2 sentences).
C) Identify and list potential issues or claims that require verification (each item with: type, reason, urgency level: low/medium/high).
D) Suggest concrete actions (verify source, search DOI/study, request peer review, add disclaimer, do not publish).
E) Assign a confidence score (0-100) to the classification and an overall veracity estimate (low/medium/high/unknown).
F) If there are factual claims, extract up to 5 exact phrases/claims that need verification.

**Output format (returns ONLY valid JSON, nothing else):**
{
"domain": "scientific",
"confidence": 87,
"summary": "Summary in 1-2 sentences",
"veracity": "medium",
"issues": [
{"claim": "XXX cures YYY", "type": "medical_claim", "why": "no study cited; categorical language", "urgency": "high"},
...
],
"check_suggestions": [
{"action": "search DOI / peer-reviewed study", "priority":"high"},
{"action": "consult medical expert", "priority":"high"},
{"action": "add disclaimer", "priority":"medium"}
],
"claims_to_check": ["XXX cures YYY", "80% of..."],
"notes": "Any additional comments (optional)."
}

Text to evaluate:
---START---
${text}
---END---`;
}

export async function analizePertinencewithChrome(text) {
  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  if (lenguaje === 'es') {
    let respuesta = await callChromeAI(systemPromptPertinence_es, buildUserPromptPertinence_es(text));
    return respuesta;
  } else {
    let respuesta = await callChromeAI(systemPromptPertinence_en, buildUserPromptPertinence_en(text));
    return respuesta;
  }
}

export async function analizePertinencewithOpenAI(text) {
  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  if (lenguaje === 'es') {
    let respuesta = await callOpenAI(systemPromptPertinence_es, buildUserPromptPertinence_es(text))
    return respuesta
  } else {
    let respuesta = await callOpenAI(systemPromptPertinence_en, buildUserPromptPertinence_en(text))
    return respuesta
  }
}

export async function analizePertinenceWithGemini(text) {
  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  if (lenguaje === 'es') {
    const resp = await callGeminiAI(systemPromptPertinence_es, buildUserPromptPertinence_es(text));
    return resp;
  } else {

  }
  const resp = await callGeminiAI(systemPromptPertinence_en, buildUserPromptPertinence_en(text));
  return resp;

}

/* -------- Humanizar ------------ */


const systemPromptHumanized_es = `Eres un asistente que reescribe textos para que suenen más humanos y naturales, preservando completamente el significado original.
Sigue estas reglas:
- Mantén siempre el significado original del texto.
- Reescribe las oraciones para que fluyan de manera natural y conversacional, evitando construcciones que parezcan generadas por IA.
- Conserva el estilo y tono del texto original, incluyendo nivel de formalidad, vocabulario y contexto.
- Varía la longitud de las oraciones y utiliza contracciones u expresiones naturales cuando sea adecuado.
- Proporciona solo el texto reescrito, sin explicaciones ni comentarios adicionales.`;
const systemPromptHumanized_en = `You are an assistant who rewrites texts to make them sound more human and natural, fully preserving the original meaning.
Follow these rules:
- Always maintain the original meaning of the text.
- Rewrite sentences so they flow naturally and conversationally, avoiding constructions that seem AI-generated.
- Preserve the style and tone of the original text, including formality, vocabulary, and context.
- Vary sentence lengths and use contractions or natural expressions where appropriate.
- Provide only the rewritten text, without additional explanations or comments.`

function buildUserPromptHumanized_es(text) {
  return `
    AHORA: Humaniza el siguiente TEXTO y devuelve la respuesta como un JSON solo con la clave "humanized_text".
    Texto a evaluar:
    ---START---
    ${text}
    ---END---
    RECUERDA: devuelve únicamente el JSON en una sola línea, sin comentarios ni fences.`;
}
function buildUserPromptHumanized_en(text) {
  return `
    NOW: Humanize the following TEXT and return the response as JSON with only the "humanized_text" key.
    Text to evaluate:
    ---START---
    ${text}
    ---END---
    REMEMBER: Return only the JSON on a single line, without comments or fences.`;
}

export async function humanizeTextChrome(text) {
  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  let prompt;
  let systemPromptHumanized;
  if (lenguaje === 'es') {
    prompt = buildUserPromptHumanized_es(text);
    systemPromptHumanized = systemPromptHumanized_es;
  } else {
    prompt = buildUserPromptHumanized_en(text);
    systemPromptHumanized = systemPromptHumanized_en;
  }

  try {
    const aiGlobal = (typeof window !== 'undefined') ? window.ai || window.chrome?.ai : null;

    if (aiGlobal && (aiGlobal.rewriter)) {
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

      let prompt;
      if (lenguaje === 'es') {
        prompt = buildUserPromptHumanized_es(text);
      } else {
        prompt = buildUserPromptHumanized_en(text);
      }


      const raw = await session.prompt(prompt);
      try { await session.destroy(); } catch (e) { /* ignore */ }

      return raw;
    }
  } catch (err) {
    console.warn('Prompt API fallback falló:', err);
  }
}

export async function humanizedWithOpenAI(text) {

  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  if (lenguaje === 'es') {
    let respuesta = await callOpenAI(systemPromptHumanized_es, buildUserPromptHumanized_es(text))
    return respuesta
  } else {
    let respuesta = await callOpenAI(systemPromptHumanized_en, buildUserPromptHumanized_en(text))
    return respuesta
  }
}

export async function humanizedWithGeminiAI(text) {
  const { lenguaje } = await chrome.storage.sync.get(['lenguaje']);
  if (lenguaje === 'es') {
    let respuesta = await callGeminiAI(systemPromptHumanized_es, buildUserPromptHumanized_es(text))
    return respuesta
  } else {
    let respuesta = await callGeminiAI(systemPromptHumanized_en, buildUserPromptHumanized_en(text))
    return respuesta
  }
}

