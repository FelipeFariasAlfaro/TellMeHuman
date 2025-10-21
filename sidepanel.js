import {
    analizewithOpenAI, analizewithChrome, testOpenAIConfig,
    analizeWithGemini, analizePertinencewithChrome, analizePertinencewithOpenAI,
    analizePertinenceWithGemini, humanizeTextChrome, humanizedWithOpenAI, humanizedWithGeminiAI
} from './js/iaworks.js';
import { initGauge, animateGaugeTo } from './js/gauge.js';
import { leng, setting_leng } from "./js/lang.js";

//menus
const analisis = document.getElementById('analisis');
const pertinencia = document.getElementById('pertinencia');
//analisis de texto
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
const iaseleccion = document.getElementById('iaseleccion');
const save_ia_config = document.getElementById('save-ia-config');
const openai_token = document.getElementById('openai-token');
const openai_modelo = document.getElementById('openai-model');
const delete_ia_config = document.getElementById('delete-ia-config');
const gemini_modelo = document.getElementById('gemini-model');
const gemini_token = document.getElementById('gemini-token');
const label_iainuse1 = document.getElementById('label_iainuse1');
const btnajustesia = document.getElementById('btn_ajustes_ia');
const selmodeloia = document.getElementById('sel_modelo_ia');
const selmodegemini = document.getElementById('sel_mode_gemini');
const mensajeconfig = document.getElementById('mensajeconfig');
//analisis pertinencia
const pertnenceBtn = document.getElementById('analyze_pertnence');
const texto_pertinence = document.getElementById('texto_pertinence');
const clearPerticencebtn = document.getElementById('clear_perticence');
const label_iainuse2 = document.getElementById('label_iainuse2');
var counterP = document.getElementById('counterP');
var result_pertinence = document.getElementById('result-pertinence');
const robot_sleeping2 = document.getElementById('robot-sleeping2');
const humanizer = document.getElementById('humanizer');
const advertenciaheader = document.getElementById('advertenciaheader');
const advertenciaheader2 = document.getElementById('advertencia2');
const advertenciageneral = document.getElementById('advertenciageneral');
const about = document.getElementById('about');
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
    if (text && text.trim().length > 1) {
        texto_pertinence.value = text.trim();
        document.getElementById("pertinencia").click();
        updateCounterPertinence();
        pertnenceBtn.disabled = false;
        clearPerticencebtn.disabled = false;
        chrome.storage.sync.set({ textpertinencefromhtml: "" });
    }
};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

    if (message.action === 'envio_texto_pertinencia') {
        processTextPertinencePayload(message.value);
        sendResponse(1);
    } else if (message.action === 'envio_texto') {
        processTextPayload(message.value);
        sendResponse(1);
    }
});

document.addEventListener('DOMContentLoaded', async () => {

    //seteo de lenguaje, si es el primer ingreso
    await setting_initial_lenguaje();
    //seteo del lenguaje
    await setting_leng();
    //setear la IA y muestra los campos que corresponden
    await settingIA()
    //setea el espacio para el canvas
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
    humanizer.addEventListener('click', humanizar);
    //inicializa front
    await initFront();
    //carga el texto seleccionado si corresponde
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
    humanizer.disabled = true;

    result_pertinence.innerHTML = `<div class="col-12" id="dominio"></div>
        <div class="col-12" id="confidence"></div>
        <div class="col-12" id="summary"></div>
        <div class="col-12" id="issues"></div>
        <div class="col-12" id="check_suggestions"></div>
        <div class="col-12" id="claims_to_check"></div>
        <div class="col-12" id="notes"></div>`;

    analisis.innerHTML = leng.DETECTOR_IA;
    pertinencia.innerHTML = leng.PERTINENCIA_IA;
    advertenciaheader.innerHTML = leng.ADVERTENCIA1;
    texto.placeholder = leng.PLACEHOLDERANALISIS;
    analizeBtn.innerHTML = leng.ANALIZARTEXT;
    humanizer.innerHTML = leng.HUMANIZAR;
    advertenciaheader2.innerHTML = leng.ADVERTENCIA2;
    pertnenceBtn.innerHTML = leng.REVISARPERTINENCIA;
    texto_pertinence.placeholder = leng.PLACEHOLDERPERTINENCE;
    advertenciageneral.innerHTML = leng.ADVERTENCIAGENERAL;
    btnajustesia.innerHTML = leng.AJUSTESIA;
    iaseleccion.innerHTML = leng.SELECCIONIA;
    selmodeloia.innerHTML = leng.SELECCIONMODELO;
    selmodegemini.innerHTML = leng.SELECCIONMODELO;
    mensajeconfig.innerHTML = leng.MENSAJEAJUSTES;
    about.innerHTML = leng.ABOUT;
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
        clearBtn.disabled = true;
        humanizer.disabled = true;
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
    humanizer.disabled = 'true'
    seccion_analisis.style.display = 'none';
    robot_sleeping.style.display = 'block';
}

function clearAllPertinence() {
    texto_pertinence.value = '';
    result_pertinence.innerHTML = '';
    robot_sleeping2.style.display = 'block'
    updateCounterPertinence();
}

async function settingIA() {
    try {
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
    } catch (err) {
        Swal.fire({
            title: 'Error',
            html: leng.ERROR_SETTING_IA,
            icon: 'error',
            confirmButtonText: leng.BTN_ENTIENDO
        });
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
                    text: leng.MSG_IA_GEMINI_OK,
                    confirmButtonText: 'OK'
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    html: leng.ERROR_NOTOKEN_GEMINI,
                    icon: 'error',
                    confirmButtonText: leng.BTN_ENTIENDO
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
                Swal.fire({
                    icon: 'success',
                    title: leng.EXITO_SWAL,
                    text: leng.MSG_IA_OPENAI_OK,
                    confirmButtonText: 'OK'
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    html: leng.ERROR_NOTOKEN_OPENAI,
                    icon: 'error',
                    confirmButtonText: leng.BTN_ENTIENDO
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
                text: leng.MSG_IA_CHROME_OK,
                confirmButtonText: 'OK'
            });
            delete_ia_config.disabled = false;
            label_iainuse1.innerHTML = "Detector: Chrome AI";
            label_iainuse2.innerHTML = "Detector: Chrome AI";
        }

    } catch (e) {
        Swal.fire({
            title: 'Error',
            html: leng.ERROR_SAVE_IA,
            icon: 'error',
            confirmButtonText: leng.BTN_ENTIENDO
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

async function analizeWithIA() {
    const text = texto.value?.trim();
    if (!text) {
        result.innerText = "Ingresa o selecciona un texto primero.";
        Swal.fire({
            title: 'Upss',
            html: leng.ERROR_NO_TEXT,
            icon: 'info',
            confirmButtonText: leng.BTN_ENTIENDO
        });
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
            result.innerHTML = `<strong>${leng.RAZONS}:</strong>\n- ${explanation.join('\n- ')}`;

            animateGaugeTo(prob);
            seccion_analisis.style.display = 'block';
            robot_sleeping.style.display = 'none';

            Swal.fire({
                icon: 'success',
                title: leng.EXITO_SWAL,
                text: leng.ANALISIS_CORRECTO,
                confirmButtonText: 'OK'
            });
            humanizer.disabled = false;

        } else {
            //result.innerText = "Respuesta del modelo (no JSON parseable):\n\n" + reply;
            Swal.fire({
                title: '¡Error!',
                text: leng.ERROR_RESPUESTA_NOPARSEABLE,
                icon: 'error',
                confirmButtonText: leng.BTN_ENTIENDO,
                allowOutsideClick: false
            });
        }

    } catch (err) {
        Swal.fire({
            title: '¡Error!',
            text: leng.ERROR_RESPUESTA_MAL,
            icon: 'error',
            confirmButtonText: leng.BTN_ENTIENDO,
            allowOutsideClick: false
        });

    } finally {
        analizeBtn.disabled = false;
    }
}

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
        Swal.fire({
            title: 'Upss',
            html: leng.ERROR_NO_TEXT,
            icon: 'info',
            confirmButtonText: leng.BTN_ENTIENDO
        });
        return;
    }

    try {

        var json;
        var restpuJ;
        const { ia_default } = await chrome.storage.sync.get(['ia_default']);

        if (ia_default === "chrome") {
            let jsonTemp = await analizePertinencewithChrome(text);
            json = String(jsonTemp).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').replace(/^`/, '').replace(/`$/, '');
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

        let dominio = restpuJ.domain;
        if (dominio) {
            document.getElementById('dominio').innerHTML = `<label><strong>${leng.DOMINIO}:</strong> <span class="badge bg-primary">${dominio}</span></label>`;
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

async function humanizar() {

    let aHumanizar = texto.value;

    if (!aHumanizar || aHumanizar.length > 0) {

        const { ia_default } = await chrome.storage.sync.get(['ia_default']);
        let respuestaHumanizadaTemp;
        let respuestaHumanizada;

        if (ia_default === "chrome") {
            respuestaHumanizadaTemp = await humanizeTextChrome(aHumanizar);
            respuestaHumanizada = respuestaHumanizadaTemp.humanized_text;
        } else if (ia_default === "openai") {
            respuestaHumanizadaTemp = await humanizedWithOpenAI(aHumanizar);
            const reply = respuestaHumanizadaTemp.choices?.[0]?.message?.content || respuestaHumanizadaTemp.choices?.[0]?.text || '';
            const restpuJ = JSON.parse(stripLeadingJsonFences(reply));
            respuestaHumanizada = restpuJ.humanized_text;
        } else if (ia_default === "gemini") {
            respuestaHumanizadaTemp = await humanizedWithGeminiAI(aHumanizar);
            const reply = respuestaHumanizadaTemp.choices?.[0]?.message?.content || respuestaHumanizadaTemp.choices?.[0]?.text || '';
            const restpuJ = JSON.parse(stripLeadingJsonFences(reply));
            respuestaHumanizada = restpuJ.humanized_text;
        }

        Swal.fire({
            title: 'Texto humanizado',
            html: `<div style="max-height: 300px; overflow-y: auto; text-align: left;">${respuestaHumanizada}</div>`,
            icon: 'info',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Reemplazar texto',
            denyButtonText: 'Copiar',
            cancelButtonText: 'Cerrar',
            allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                texto.value = respuestaHumanizada;
            } else if (result.isDenied) {
                navigator.clipboard.writeText(respuestaHumanizada)
                    .then(() => Swal.fire('¡Copiado!', '', 'success'))
                    .catch(() => Swal.fire('Error al copiar', '', 'error'));
            }
        });

    } else {
        Swal.fire({
            title: '¡Error!',
            text: 'Debe existir un texto para humanizar!',
            icon: 'error',
            confirmButtonText: 'Aceptar',
            allowOutsideClick: false
        });
    }
}

