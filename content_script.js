var port = chrome.runtime.connect({ name: 'sidepanel_ready' });
 port.onMessage.addListener((msg) => {
    console.log("intentare....2222");
    if (msg.type === 'envio_texto') {
      console.log("analisis");
        //processTextPayload(msg.payload);
    }
    else if (msg.type === 'envio_texto_pertinencia') {
        console.log("Pertinencia");
        //processTextPertinencePayload(msg.payload);
    }
});









