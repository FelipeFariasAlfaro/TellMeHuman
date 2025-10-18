// background.js (MV3 service worker)
// Crea menú contextual y gestiona la apertura del sidepanel + envío de texto seleccionado.

// Helper simple
function isAllowedUrl(url) {
  try {
    if (!url) return false;
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch (e) {
    return false;
  }
}

// On installed: crear context menu y (opcional) establecer opciones por defecto
chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.create({
      id: "analyze-selection",
      title: "Analizar con ",
      contexts: ["selection"]
    });
    // Opcional: setear opción por defecto (no await)
    chrome.sidePanel.setOptions?.({ path: "sidepanel.html", enabled: true }).catch(()=>{});
    chrome.sidePanel.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(()=>{});
  } catch (e) {
    console.warn("onInstalled:", e);
  }
});

// Handler del menu contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "analyze-selection") return;

  // 1) Obtén la selección proporcionada por Chrome (si la hay)
  const selectionFromInfo = info.selectionText?.trim();

  // 2) Abrir el sidepanel inmediatamente (mantener user gesture)
  try {
    if (tab && tab.id && isAllowedUrl(tab.url)) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(err => {
        console.error("Error abriendo sidePanel (context menu):", err);
      });
      // actualizar opciones sin bloquear
      chrome.sidePanel.setOptions({ tabId: tab.id, path: "sidepanel.html", enabled: true }).catch(()=>{});
    } else {
      console.warn("No se abre sidePanel: pestaña inválida o URL no permitida.");
    }
  } catch (e) {
    console.error("contextMenus.onClicked (open) error:", e);
  }

  // 3) Si info.selectionText llegó, guardarlo y notificar al sidepanel
  if (selectionFromInfo) {
    // Guardar en storage (asincrónico, no await)
    chrome.storage.local.set({ pendingAnalysisText: selectionFromInfo }, () => {});
    // Notificar rápidamente al sidepanel (si está abierto y escuchando)
    try {
      chrome.runtime.sendMessage({ type: 'pendingAnalysisText', text: selectionFromInfo });
    } catch (e) { /* ignore */ }
    return;
  }

  // 4) Si no vino selectionText (casos edge), pedir la selección al content script de la pestaña
  try {
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'getSelection' }, (response) => {
        // Nota: response puede ser undefined si no hay listener o content script no inyectado
        const text = response?.text?.trim();
        if (text) {
          chrome.storage.local.set({ pendingAnalysisText: text }, () => {});
          try {
            chrome.runtime.sendMessage({ type: 'pendingAnalysisText', text });
          } catch (e) {}
        } else {
          // No se obtuvo selección desde content script (posible: content script no inyectado)
          // No hacemos nada; el sidepanel leerá storage al abrirse o el usuario puede pegar manualmente.
        }
      });
    }
  } catch (e) {
    console.error("Error pidiendo selección al content script:", e);
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
    chrome.sidePanel.setOptions({ tabId: tab.id, path: "sidepanel.html", enabled: true }).catch(()=>{});
  } catch (e) {
    console.error("action.onClicked error:", e);
  }
});

