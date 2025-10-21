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
      title: "Analyze",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "pertinence-selection",
      title: "Pertinence",
      contexts: ["selection"]
    });
    chrome.sidePanel.setOptions?.({ path: "sidepanel.html", enabled: true });
    chrome.sidePanel.setPanelBehavior?.({ openPanelOnActionClick: true });
  } catch (e) {
    console.warn("onInstalled:", e);
  }
});


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