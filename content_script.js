
  /*
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'getSelection') {
      try {
        const sel = (window.getSelection && window.getSelection().toString()) || '';
        sendResponse({ text: sel });
      } catch (e) {
        sendResponse({ text: '' });
      }
      return true;
    }

    console.log("Mensaje recibido en sidepanel.js:", message);
    if (msg.action === "textoFromWeb") {

      const textoRecibido = message.value;
        //texto.value = textoRecibido || '';
       updateCounter();
    }
  });
  */








