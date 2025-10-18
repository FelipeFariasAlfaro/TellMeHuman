document.addEventListener('DOMContentLoaded', () => {
  const apiInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('save');
  const clearBtn = document.getElementById('clear');

  async function load() {
    const data = await chrome.storage.local.get('openai_api_key');
    if (data.openai_api_key) apiInput.value = data.openai_api_key;
  }

  saveBtn.addEventListener('click', async () => {
    const v = apiInput.value.trim();
    await chrome.storage.local.set({ openai_api_key: v });
    alert('Clave guardada localmente. Usa una clave dedicada si es posible.');
  });

  clearBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('openai_api_key');
    apiInput.value = '';
    alert('Clave borrada del storage local.');
  });

  load();
});
