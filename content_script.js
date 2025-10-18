(function () {
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
  });
})();
