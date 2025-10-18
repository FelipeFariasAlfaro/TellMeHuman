
import { analizewithOpenAI, analizewithChrome, testOpenAIConfig, analizeWithGemini } from './js/iaworks.js';
import { initGauge, animateGaugeTo } from './js/gauge.js';
import { leng, setting_leng } from "./js/lang.js";

// Elementos
const texto = document.getElementById('text');
const analizeBtn = document.getElementById('analyze');
const clearBtn = document.getElementById('clear');
const result = document.getElementById('result');
const counter = document.getElementById('counter');
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

const MAX = 1000;
setting_leng();

// --- Main ---
document.addEventListener('DOMContentLoaded', async () => {
    //seteo de lenguaje, si es el primer ingreso
    await settingLenguaje()

    //seteo del lenguaje
    await setting_leng();

    //setear la IA y muestra los campos que corresponden
    await settingIA()

    initGauge('gaugeCanvas', 200, 100, { arc: 'down' });

    //llamadas de eventos
    texto.addEventListener('keydown', updateCounter);
    clearBtn.addEventListener('click', clearAll);
    analizeBtn.addEventListener('click', await analizeWithIA);
    iaselect.addEventListener('change', updateIACombo);
    save_ia_config.addEventListener('click', saveIaSettings);
    delete_ia_config.addEventListener('click', deletetoken);

    // Listener: runtime.onMessage (mensaje inmediato desde background)
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!msg || !msg.type) return false;
        if (msg.type === 'pendingAnalysisText' && typeof msg.text === 'string') {
            applyPendingText(msg.text).catch(() => { });
        }
        return false;
    });

});



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
    analizeBtn.disabled = (len === 0) || (len > MAX); // deshabilita si vacío o excede
    counter.style.color = len > MAX ? 'crimson' : '';
}

function clearAll() {
    texto.value = '';
    result.innerText = '';
    updateCounter();
    seccion_analisis.style.display = 'none';
    robot_sleeping.style.display = 'block';
}

// Aplica texto recibido al textarea y actualiza UI
async function applyPendingText(text) {
    if (typeof text !== 'string') return;
    texto.value = text;
    updateCounter();
    // limpiar la clave para evitar reaparecer en la próxima apertura
    await storageRemove('pendingAnalysisText');
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

            json = await analizewithChrome(text);

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

    } else if (ia_default === "chrome") {
        openai_data.style = 'display:none';
        gemini_data.style = 'display:none';
        iaselect.value = "ChromeIA";
        delete_ia_config.disabled = true;
    } else {
        await chrome.storage.sync.set({
            ia_default: 'chrome'
        });
        openai_data.style = 'display:none';
        gemini_data.style = 'display:none';
        iaselect.value = "ChromeIA";
        delete_ia_config.disabled = true;
    }
}

async function settingLenguaje() {
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
        } else if (ia_selected === "ChromeIA") {
            await chrome.storage.sync.set({ ia_default: 'chrome' });
            Swal.fire({
                icon: 'success',
                title: leng.EXITO_SWAL,
                text: leng.MSG_IA_GUARDADO_OK,
                confirmButtonText: 'OK'
            });
            delete_ia_config.disabled = false;
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