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
      title: "Analizar con TellMeHuman",
      contexts: ["selection"]
    });
    chrome.sidePanel.setOptions?.({ path: "sidepanel.html", enabled: true }).catch(()=>{});
    chrome.sidePanel.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(()=>{});
  } catch (e) {
    console.warn("onInstalled:", e);
  }
});

// Handler del menu contextual
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "analyze-selection") return;

  const selectionFromInfo = info.selectionText?.trim();
  chrome.storage.sync.set({textfromhtml: selectionFromInfo});

  try {
    if (tab && tab.id && isAllowedUrl(tab.url)) {
      await chrome.sidePanel.open({ tabId: tab.id }).catch(err => {
        console.error("Error abriendo sidePanel (context menu):", err);
      });
      await chrome.sidePanel.setOptions({ tabId: tab.id, path: "sidepanel.html", enabled: true }).catch(()=>{});
    } else {
      console.warn("No se abre sidePanel: pestaña inválida o URL no permitida.");
    }
  } catch (e) {
    console.error("contextMenus.onClicked (open) error:", e);
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