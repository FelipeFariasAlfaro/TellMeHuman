
import {
    analizewithOpenAI, analizewithChrome, testOpenAIConfig,
    analizeWithGemini, analizePertinencewithChrome, analizePertinencewithOpenAI, analizePertinenceWithGemini
} from './js/iaworks.js';
import { initGauge, animateGaugeTo } from './js/gauge.js';
import { leng, setting_leng } from "./js/lang.js";

// Elementos
var texto = document.getElementById('text');
const analizeBtn = document.getElementById('analyze');
const clearBtn = document.getElementById('clear');
const result = document.getElementById('result');
var counter = document.getElementById('counter');
const seccion_analisis = document.getElementById('result-analisys');
const robot_sleeping = document.getElementById('robot-sleeping');
//IA settings
const openai_data = document.getElementById('openai-data');
const gemini_data = document.getElementById('gemini-data');
const iaselect = document.getElementById('iaselect');
const save_ia_config = document.getElementById('save-ia-config');
const openai_token = document.getElementById('openai-token');
const openai_modelo = document.getElementById('openai-model');
const delete_ia_config = document.getElementById('delete-ia-config');
const gemini_modelo = document.getElementById('gemini-model');
const gemini_token = document.getElementById('gemini-token');
const label_iainuse1 = document.getElementById('label_iainuse1');

//texto_pertinence
const pertnenceBtn = document.getElementById('analyze_pertnence');
const texto_pertinence = document.getElementById('texto_pertinence');
const clearPerticencebtn = document.getElementById('clear_perticence');
const label_iainuse2 = document.getElementById('label_iainuse2');
var counterP = document.getElementById('counterP');
var result_pertinence = document.getElementById('result-pertinence');
const robot_sleeping2 = document.getElementById('robot-sleeping2');
var port = chrome.runtime.connect({ name: 'sidepanel_ready' });

const MAX = 2000;
setting_leng();

// Lógica para procesar el texto recibido
const processTextPayload = (text) => {
    if (text && text.trim().length > 1) {
        texto.value = text.trim();
        document.getElementById("analisis").click();
        updateCounter();
        analizeBtn.disabled = false;
        clearBtn.disabled = false;
        chrome.storage.sync.set({ textfromhtml: "" });
    }
};

const processTextPertinencePayload = (text) => {
    console.log("vamos a procesar el texto en el campo");
    if (text && text.trim().length > 1) {
        texto_pertinence.value = text.trim();
        document.getElementById("pertinencia").click();
        updateCounterPertinence();
        pertnenceBtn.disabled = false;
        clearPerticencebtn.disabled = false;
        chrome.storage.sync.set({ textpertinencefromhtml: "" });
    }
};

/*
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    
    console.log("Recibi el mensaje desde el background");
    // El Side Panel se comporta como un script de UI/Página que escucha mensajes de runtime.
    if (msg.type === 'envio_texto') {
        console.log("Mensaje revibido en envio texto")
        //processTextPayload(msg.payload);
    }
    else if (msg.type === 'envio_texto_pertinencia') {
        console.log("Pertinencia recibida por mensaje de una sola vez.");
        //processTextPertinencePayload(msg.payload);
    }
    
    // No necesitas retornar true si no usas sendResponse
});*/

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  
  if (message.action === 'envio_texto_pertinencia') {
    processTextPertinencePayload(message.value);
    sendResponse(1); // Opcional: envía una respuesta de vuelta al Service Worker
  }else if(message.action === 'envio_texto'){
    processTextPayload(message.value);
    sendResponse(1);
  }

});

// --- Main ---
document.addEventListener('DOMContentLoaded', async () => {

    console.log("Esta cargando el dom");

    //seteo de lenguaje, si es el primer ingreso
    await setting_initial_lenguaje();

    //seteo del lenguaje
    await setting_leng();

    //setear la IA y muestra los campos que corresponden
    await settingIA()

    initGauge('gaugeCanvas', 200, 100, { arc: 'down' });

    //llamadas de eventos
    texto.addEventListener('keyup', updateCounter);
    clearBtn.addEventListener('click', clearAll);
    analizeBtn.addEventListener('click', analizeWithIA);
    iaselect.addEventListener('change', updateIACombo);
    save_ia_config.addEventListener('click', saveIaSettings);
    delete_ia_config.addEventListener('click', deletetoken);
    pertnenceBtn.addEventListener('click', analizePertinenceWithIA);
    clearPerticencebtn.addEventListener('click', clearAllPertinence);
    texto_pertinence.addEventListener('keyup', updateCounterPertinence);
    await initFront();

    const { textfromhtml } = await chrome.storage.sync.get(['textfromhtml']);
    if (textfromhtml && textfromhtml.trim().length > 1) {
        processTextPayload(textfromhtml);
    }

    const { textpertinencefromhtml } = await chrome.storage.sync.get(['textpertinencefromhtml']);
    if (textpertinencefromhtml && textpertinencefromhtml.trim().length > 1) {
        processTextPertinencePayload(textpertinencefromhtml);
    }
});


async function initFront() {
    analizeBtn.disabled = true;
    clearBtn.disabled = true;
    texto.value = '';

    analyze_pertnence.disabled = true;
    clear_perticence.disabled = true;
    texto_pertinence.value = '';
    robot_sleeping2.display = 'block';
    result_pertinence.display = 'none';

    result_pertinence.innerHTML = `<div class="col-12" id="dominio"></div>
        <div class="col-12" id="confidence"></div>
        <div class="col-12" id="summary"></div>
        <div class="col-12" id="issues"></div>
        <div class="col-12" id="check_suggestions"></div>
        <div class="col-12" id="claims_to_check"></div>
        <div class="col-12" id="notes"></div>`;
}

function stripLeadingJsonFences(str) {
    if (typeof str !== 'string') return str;
    let s = str.trim();
    s = s.replace(/^\s*`+\s*(?:json\b)?\s*/i, '');
    s = s.replace(/\s*`+\s*$/g, '');
    return s;
}

function updateCounter() {
    const len = texto.value.length;
    const remaining = MAX - len;
    counter.innerText = remaining >= 0 ? remaining : 0;

    if ((len === 0) || (len > MAX)) {
        analizeBtn.disabled = true;
        clearBtn.disabled = true
    } else {
        analizeBtn.disabled = false;
        clearBtn.disabled = false;
    }
    counter.style.color = len > MAX ? 'crimson' : '';
}

function updateCounterPertinence() {
    var len = texto_pertinence.value.length;
    var remaining = MAX - len;
    counterP.innerText = remaining >= 0 ? remaining : 0;

    if ((len === 0) || (len > MAX)) {
        pertnenceBtn.disabled = true;
        clearPerticencebtn.disabled = true
    } else {
        pertnenceBtn.disabled = false;
        clearPerticencebtn.disabled = false;
    }
    counterP.style.color = len > MAX ? 'crimson' : '';
}

function clearAll() {
    texto.value = '';
    result.innerText = '';
    updateCounter();
    seccion_analisis.style.display = 'none';
    robot_sleeping.style.display = 'block';
}

function clearAllPertinence() {
    texto_pertinence.value = '';
    result_pertinence.innerHTML = '';
    robot_sleeping2.style.display = 'block'

}

// Aplica texto recibido al textarea y actualiza UI
async function applyPendingText(text) {
    if (typeof text !== 'string') return;
    texto.value = text;
    updateCounter();
    // limpiar la clave para evitar reaparecer en la próxima apertura
    //await storageRemove('pendingAnalysisText');
}

async function analizeWithIA() {
    const text = texto.value?.trim();
    if (!text) {
        result.innerText = "Ingresa o selecciona un texto primero.";
        return;
    }

    result.innerText = '';
    analizeBtn.disabled = true;

    try {

        var json;
        var restpuJ;
        const { ia_default } = await chrome.storage.sync.get(['ia_default']);

        if (ia_default === "chrome") {

            var jsonTemp = await analizewithChrome(text);
            json = String(jsonTemp).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/^`/, '').replace(/`$/, '');

        } else if (ia_default === "gemini") {

            var jsonTemp = await analizeWithGemini(text);
            const reply = jsonTemp.choices?.[0]?.message?.content || jsonTemp.choices?.[0]?.text || '';
            json = String(reply).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/^`/, '').replace(/`$/, '');

        } else if (ia_default === "openai") {
            var jsonTemp = await analizewithOpenAI(text);
            const reply = jsonTemp.choices?.[0]?.message?.content || jsonTemp.choices?.[0]?.text || '';
            json = String(reply).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/^`/, '').replace(/`$/, '');
        }

        json = stripLeadingJsonFences(json);
        restpuJ = JSON.parse(json);

        if (restpuJ && typeof restpuJ.probability !== 'undefined') {
            const prob = restpuJ.probability;
            const explanation = Array.isArray(restpuJ.explanation) ? restpuJ.explanation : [String(restpuJ.explanation || '')];
            result.innerHTML = `<strong>Razones:</strong>\n- ${explanation.join('\n- ')}`;

            animateGaugeTo(prob);
            seccion_analisis.style.display = 'block';
            robot_sleeping.style.display = 'none';

            Swal.fire({
                icon: 'success',
                title: "Todo bien",
                text: "Análisis completado correctamente. Revisa los resultados.",
                confirmButtonText: 'OK'
            });

        } else {
            result.innerText = "Respuesta del modelo (no JSON parseable):\n\n" + reply;
        }

    } catch (err) {
        result.innerText = 'Error al analizar: ' + (err?.message || String(err));
        console.error('analyze error', err);
    } finally {
        analizeBtn.disabled = false;
    }
}

async function settingIA() {
    const { ia_default } = await chrome.storage.sync.get(['ia_default']);
    if (ia_default === "gemini") {
        openai_data.style = 'display:none';
        gemini_data.style = 'display:block';
        iaselect.value = "Google Gemini";

        const { gemini_key } = await chrome.storage.sync.get(['gemini_key']);
        gemini_token.value = gemini_key || '';

        const { gemini_model } = await chrome.storage.sync.get(['gemini_model']);
        gemini_modelo.value = gemini_model || '';

        if (gemini_token.value.length > 0) {
            delete_ia_config.disabled = false;
        } else {
            delete_ia_config.disabled = true;
        }
        label_iainuse1.innerHTML = "Detector: Google Gemini";
        label_iainuse2.innerHTML = "Detector: Google Gemini";

    } else if (ia_default === "openai") {
        openai_data.style = 'display:block';
        gemini_data.style = 'display:none';
        iaselect.value = "OpenAI";

        const { openai_key } = await chrome.storage.sync.get(['openai_key']);
        openai_token.value = openai_key || '';
        const { openai_model } = await chrome.storage.sync.get(['openai_model']);
        openai_modelo.value = openai_model || '';
        if (openai_token.value.length > 0) {
            delete_ia_config.disabled = false;
        } else {
            delete_ia_config.disabled = true;
        }
        label_iainuse1.innerHTML = "Detector: OpenAI";
        label_iainuse2.innerHTML = "Detector: OpenAI";

    } else if (ia_default === "chrome") {
        openai_data.style = 'display:none';
        gemini_data.style = 'display:none';
        iaselect.value = "ChromeIA";
        delete_ia_config.disabled = true;
        label_iainuse1.innerHTML = "Detector: Chrome AI";
        label_iainuse2.innerHTML = "Detector: Chrome AI";
    } else {
        await chrome.storage.sync.set({
            ia_default: 'chrome'
        });
        openai_data.style = 'display:none';
        gemini_data.style = 'display:none';
        iaselect.value = "ChromeIA";
        delete_ia_config.disabled = true;
        label_iainuse1.innerHTML = "Detector: Chrome AI";
        label_iainuse2.innerHTML = "Detector: Chrome AI";
    }
}

async function setting_initial_lenguaje() {
    const { activate } = await chrome.storage.sync.get('activate');

    //si es primer ingreso, pedir idioma
    if (!activate || activate === false) {

        Swal.fire({
            title: 'Selecciona tu idioma / Select your language',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: 'Español',
            denyButtonText: 'English',
            cancelButtonText: 'Cerrar',
            allowOutsideClick: true,
            allowEscapeKey: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                await chrome.storage.sync.set({ activate: 'true' });
                await chrome.storage.sync.set({ lenguaje: 'es' });
            } else if (result.isDenied) {
                await chrome.storage.sync.set({ activate: 'true' });
                await chrome.storage.sync.set({ lenguaje: 'en' });
            } else {
                await chrome.storage.sync.set({ activate: 'false' });
                return;
            }
        });
    }
}

// --- Helpers para usar chrome.storage con async/await (compatibilidad) ---
export function storageGet(keys) {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get(keys, (res) => resolve(res || {}));
        } catch (e) {
            resolve({});
        }
    });
}

function storageRemove(key) {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.remove(key, () => resolve());
        } catch (e) {
            resolve();
        }
    });
}

function updateIACombo() {
    const ia_selected = iaselect.value;
    if (ia_selected === "Google Gemini") {
        openai_data.style = 'display:none';
        gemini_data.style = 'display:block';
        if (gemini_token.value.length > 0) {
            delete_ia_config.disabled = false;
        } else {
            delete_ia_config.disabled = true;
        }

    } else if (ia_selected === "OpenAI") {
        openai_data.style = 'display:block';
        gemini_data.style = 'display:none';
        if (openai_token.value.length > 0) {
            delete_ia_config.disabled = false;
        } else {
            delete_ia_config.disabled = true;
        }
    } else if (ia_selected === "ChromeIA") {
        openai_data.style = 'display:none';
        gemini_data.style = 'display:none';
        delete_ia_config.disabled = true;
    }
}

async function saveIaSettings() {
    const ia_selected = iaselect.value;

    try {
        if (ia_selected === "Google Gemini") {

            let token = gemini_token.value.trim();
            let model = gemini_modelo.value.trim();

            if (token && token.length > 10) {
                await chrome.storage.sync.set({ gemini_key: token });
                await chrome.storage.sync.set({ ia_default: 'gemini' });
                await chrome.storage.sync.set({ gemini_model: model });
                delete_ia_config.disabled = false;
                Swal.fire({
                    icon: 'success',
                    title: leng.EXITO_SWAL,
                    text: leng.MSG_IA_GUARDADO_OK,
                    confirmButtonText: 'OK'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: "Error",
                    text: "Debes ingresar tu token de Google Gemini.",
                });
                return;
            }
            label_iainuse1.innerHTML = "Detector: Google Gemini";
            label_iainuse2.innerHTML = "Detector: Google Gemini";


        } else if (ia_selected === "OpenAI") {

            let token = openai_token.value.trim();
            let model = openai_modelo.value.trim();

            if (token && token.length > 10) {
                await chrome.storage.sync.set({ openai_key: token });
                await chrome.storage.sync.set({ ia_default: 'openai' });
                await chrome.storage.sync.set({ openai_model: model });
                if (await testOpenAIConfig())
                    delete_ia_config.disabled = false;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: "Error",
                    text: "Debes ingresar tu token de OpenAI.",
                });
                return;
            }
            label_iainuse1.innerHTML = "Detector: OpenAI";
            label_iainuse2.innerHTML = "Detector: OpenAI";

        } else if (ia_selected === "ChromeIA") {
            await chrome.storage.sync.set({ ia_default: 'chrome' });
            Swal.fire({
                icon: 'success',
                title: leng.EXITO_SWAL,
                text: leng.MSG_IA_GUARDADO_OK,
                confirmButtonText: 'OK'
            });
            delete_ia_config.disabled = false;
            label_iainuse1.innerHTML = "Detector: Chrome AI";
            label_iainuse2.innerHTML = "Detector: Chrome AI";
        }

    } catch (e) {
        Swal.fire({
            icon: 'error',
            title: "Error",
            text: "No se pudieron guardar las configuraciones de IA. Intenta nuevamente.",
        });
        return;
    }

}

async function deletetoken() {

    Swal.fire({
        title: leng.DESEAS_CONTINUAR,
        text: leng.ELIMINAR_TOKEN,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: leng.BTN_CONFIRMAR,
        cancelButtonText: leng.BTN_CANCELAR
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { ia_default } = await chrome.storage.sync.get(['ia_default']);
            if (ia_default === "gemini") {
                gemini_token.value = '';
                await chrome.storage.sync.set({ gemini_key: '' });
                delete_ia_config.disabled = true;
                Swal.fire({
                    icon: 'success',
                    title: leng.EXITO_SWAL,
                    text: leng.TOKEN_ELIMINADO,
                    confirmButtonText: 'OK'
                });

            } else if (ia_default === "openai") {
                openai_token.value = '';
                await chrome.storage.sync.set({ openai_key: '' });
                delete_ia_config.disabled = true;
                Swal.fire({
                    icon: 'success',
                    title: leng.EXITO_SWAL,
                    text: leng.TOKEN_ELIMINADO,
                    confirmButtonText: 'OK'
                });
            }
        }
    });


}

//Analisis

async function analizePertinenceWithIA() {

    result_pertinence.innerHTML = `<div class="col-12" id="dominio"></div>
        <div class="col-12" id="confidence"></div>
        <div class="col-12" id="summary"></div>
        <div class="col-12" id="issues"></div>
        <div class="col-12" id="check_suggestions"></div>
        <div class="col-12" id="claims_to_check"></div>
        <div class="col-12" id="notes"></div>`;

    const text = texto_pertinence.value?.trim();
    if (!text) {
        result.innerText = "Ingresa o selecciona un texto primero.";
        return;
    }

    try {

        var json;
        var restpuJ;
        const { ia_default } = await chrome.storage.sync.get(['ia_default']);

        if (ia_default === "chrome") {

            console.log("Iniciando análisis de pertinencia con ChromeIA...");
            let jsonTemp = await analizePertinencewithChrome(text);
            json = String(jsonTemp).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/^`/, '').replace(/`$/, '');
            console.log("Respuesta ChromeIA:", json);
        }
        else if (ia_default === "openai") {
            let jsonTemp = await analizePertinencewithOpenAI(text);
            const reply = jsonTemp.choices?.[0]?.message?.content || jsonTemp.choices?.[0]?.text || '';
            json = String(reply).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/^`/, '').replace(/`$/, '');
        }
        else if (ia_default === "gemini") {
            let jsonTemp = await analizePertinenceWithGemini(text);
            const reply = jsonTemp.choices?.[0]?.message?.content || jsonTemp.choices?.[0]?.text || '';
            json = String(reply).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/^`/, '').replace(/`$/, '');
        }

        json = stripLeadingJsonFences(json);
        restpuJ = JSON.parse(json);
        console.log("Respuesta parseada:", restpuJ);

        let dominio = restpuJ.domain;
        if (dominio) {
            document.getElementById('dominio').innerHTML = `<label><strong>Domain:</strong> <span class="badge bg-primary">${dominio}</span></label>`;
        }

        let confidence = restpuJ.confidence;
        if (confidence) {
            document.getElementById('confidence').innerHTML = '<label><strong>Confidence:</strong> ' + confidence + '%</label>';
        }

        let summary = restpuJ.summary;
        if (summary) {
            document.getElementById('summary').innerHTML = `<label><strong>Summary:</strong> ` + summary + `</label>`;
        }

        let issues = restpuJ.issues;//array
        if (issues && issues.length > 0) {

            let issuesHtml = '<label><strong>Issues:</strong> </label><ul>';
            issues.forEach(issue => {
                issuesHtml += `<li><strong>Claim:</strong> ${issue.claim}, <strong>Type:</strong> ${issue.type}, <strong>Why:</strong> ${issue.why}, <strong>Urgency:</strong> ${issue.urgency}</li>`;
            });
            document.getElementById('issues').innerHTML = issuesHtml + '</ul>';

        }

        let check_suggestions = restpuJ.check_suggestions;//array
        let suggestionsHtml = '<label><strong>Check Suggestions:</strong></label><ul>';
        if (check_suggestions && check_suggestions.length > 0) {
            check_suggestions.forEach(suggestion => {
                suggestionsHtml += `<li>${suggestion.action}: ${suggestion.priority}</li>`;
            });
            document.getElementById('check_suggestions').innerHTML = suggestionsHtml + '</ul>';
        }

        let claims_to_check = restpuJ.claims_to_check;//array
        let claimsHtml = '<label><strong>Claims to Check:</strong> </label><ul>';
        if (claims_to_check && claims_to_check.length > 0) {
            claims_to_check.forEach(claim => {
                claimsHtml += `<li>${claim}</li>`;
            });
            document.getElementById('claims_to_check').innerHTML = claimsHtml + '</ul>';
        }


        let notes = restpuJ.notes;
        if (notes && notes.length > 0) {
            document.getElementById('notes').innerHTML = `<label><strong>Notes: </strong> ${notes}</label><ul>`;
        }

        robot_sleeping2.style.display = 'none';
        Swal.fire({
            icon: 'success',
            title: "Todo bien",
            text: "Análisis 2 completado correctamente. Revisa los resultados.",
            confirmButtonText: 'OK'
        });

    } catch (err) {
        result.innerText = 'Error al analizar: ' + (err?.message || String(err));
        console.error('analyze error', err);
    }
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}