function isAllowedUrl(url) {
  try {
    if (!url) return false;
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch (e) {
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: "analyze-selection",
      title: "Analizar",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "pertinence-selection",
      title: "Pertinencia",
      contexts: ["selection"]
    });
    chrome.sidePanel.setOptions?.({ path: "sidepanel.html", enabled: true });
    chrome.sidePanel.setPanelBehavior?.({ openPanelOnActionClick: true });
  } catch (e) {
    console.warn("onInstalled:", e);
  }
});

/*
// Almacena una referencia al puerto de conexión para saber si el sidepanel está abierto.
let sidepanelPort = null;

// Escuchar la conexión del sidepanel
// background.js (Dentro de chrome.runtime.onConnect.addListener)

chrome.runtime.onConnect.addListener((port) => {
  // 💡 REGLA: Solo procesar el puerto del Side Panel.
  if (port.name === 'sidepanel_ready') {

    // 1. Asignar el nuevo puerto. 
    // Esto reemplaza CRÍTICAMENTE el puerto viejo si el panel se recargó.
    sidepanelPort = port;
    console.log("Sidepanel conectado y listo. Nuevo puerto asignado.");

    port.onDisconnect.addListener((p) => {

      if (sidepanelPort === p) {
        sidepanelPort = null;
        console.log("Sidepanel desconectado. Referencia limpiada.");
      } else {
        console.warn("Se desconectó un puerto viejo. Ignorando limpieza.");
      }
    });

  }
});
*/
/* background.js (Nueva función) */



// Función del menú contextual
chrome.contextMenus.onClicked.addListener(async (info, tab) => {

  const selectionFromInfo = info.selectionText?.trim();

  chrome.sidePanel.open({ tabId: tab.id }).catch(err => {
    console.error("Error abriendo sidePanel:", err);
  });

  if (info.menuItemId === "analyze-selection") {
    try {
      chrome.storage.sync.set({ textfromhtml: selectionFromInfo }, async () => { });
      chrome.runtime.sendMessage({ action: "envio_texto", value: selectionFromInfo });
    } catch (e) { }
  }
  else if (info.menuItemId === "pertinence-selection") {
      chrome.storage.sync.set({ textpertinencefromhtml: selectionFromInfo }, async () => { });
      chrome.runtime.sendMessage({ action: "envio_texto_pertinencia", value: selectionFromInfo }).catch(e => {
        if (e.message.includes('Receiving end does not exist')) {}
      });
  }
});


// Opcional: cuando el user hace click en el icono (action), abrimos el sidepanel inmediato
chrome.action.onClicked.addListener((tab) => {
  try {
    if (!tab || !tab.id || !isAllowedUrl(tab.url)) {
      console.warn("No hay pestaña válida para abrir sidePanel.");
      return;
    }
    // abrir inmediatamente (no await)
    chrome.sidePanel.open({ tabId: tab.id }).catch(err => {
      console.error("Error abriendo sidePanel (action):", err);
    });
    chrome.sidePanel.setOptions({ tabId: tab.id, path: "sidepanel.html", enabled: true }).catch(() => { });
  } catch (e) {
    console.error("action.onClicked error:", e);
  }
});