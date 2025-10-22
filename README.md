# Tell Me Human — Chrome Extension (MV3)

Detect likely AI-written text, check pertinence/safety, and humanize content in one click — directly in Chrome’s Side Panel or via the context menu. Privacy-first: prefers **on-device** Chrome AI when available; optional cloud fallbacks (OpenAI/Gemini) with your own API keys.

---

## ✨ Features
- **AI-likelihood score (0–100)** with concise reasons (`probability`, `explanation[]`).
- **Pertinence/Safety check** for doubtful claims, tone issues, and policy risks.
- **One-click Humanization** that preserves meaning while improving fluency.
- **Side Panel + Context Menu** entry points; works in **English/Spanish**.
- **Privacy-first:** on-device analysis when supported; optional cloud fallbacks (user-provided keys).
- **Strict JSON outputs** for reliable parsing (single-line, no wrappers).

---

## 🧰 Requirements
- **Google Chrome 128+** (test on Stable/Beta/Canary).
- **Developer mode** enabled.
- (Optional) **API keys** for OpenAI / Gemini if you want cloud fallbacks.

---

## 🚀 Installation (Unpacked)
1. Unzip the project into a local folder.
2. Open `chrome://extensions/`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder.
5. Confirm:
   - The extension icon is visible.
   - The **Service Worker** is running (`chrome://extensions/` → “Service worker” → “Inspect views”).
   - The **Side Panel** opens (extension icon → “Open Side Panel”).

---

## 🧪 Quick Start (2 minutes)
1. Open any page with text (article, email, doc viewer).
2. Select a paragraph → right-click → **Tell Me Human → Analyze**.
3. Click on Analyze Text in sidepanel
4. Results in **Side Panel** to review:
   - **Score (0–100)** and **explanations**.
   - Click **Humanize** to generate a more natural version.
5. (Optional) Copy to clipboard or replace in-page if your build supports it.

---

## ⚙️ Configuration

### On-device Chrome AI
- The extension auto-detects **Chrome AI on-device**.
- When available, analysis and humanization run **locally** (no text leaves the browser).
- If your Chrome doesn’t expose these APIs, check version/channel/flags.

### Fallbacks (OpenAI / Gemini)
- In the Side Panel → **Settings**:
  - Enable **OpenAI** or **Gemini**.
  - Paste your **API key** (stored in `chrome.storage.sync`).
- Choose provider/model and adjust limits (tokens/temperature) per your account.
> **Privacy:** with cloud fallbacks enabled, your text is sent to the selected provider. With on-device only, **no** text is sent externally.

---

## 🔐 Permissions (manifest.json)
The extension typically requests:
- `"sidePanel"` — Side Panel UI.
- `"storage"` — store settings (language, keys, toggles).
- `"contextMenus"` — context menu on text selection.
- `"activeTab"` — read/modify the active tab (for in-page actions).
> Keep permissions minimal; remove anything unused.

---

## 🌐 Internationalization (i18n)
- UI strings in `leng/en.json` and `leng/es.json`.
- Use the language selected by the user when installing the application 
- The engine aims to keep the **input language** when Analizing and humanizing.

---

## 🧠 How It Works (High-level)
- Estimates the likelihood that text was AI-generated (0–100) with brief explanations.
- Runs a **pertinence/safety** pass (tone, weak claims) with actionable hints.
- **Humanizes** the text while preserving meaning and author voice.
- Forces analysis responses into **single-line JSON** for robust parsing.

---

## 🧭 Usage Tips
- Select reasonable blocks (1–6 paragraphs) for stronger signals.
- The **explanation** is a **signal**, not a legal verdict; combine with your judgment.
- **Educators:** use score + explanation as indicators of AI-style patterns in student reports (not as definitive proof).

---

## 🧪 Testing (short checklist)
- Functional: analyze → score + explanations; humanize preserves meaning.
- Fallbacks: on-device only vs OpenAI/Gemini enabled; clear error messages for invalid keys or rate limits.
- UI/outputs consistent in EN/ES.

---

## 🐞 Debugging
- **Service Worker logs:** `chrome://extensions/` → Inspect views.
- **Side Panel logs:** open DevTools (`F12`) on the panel.
- Check rate limiting and invalid keys (surfaced via SweetAlert2).

---


## 🛡️ Privacy
- **On-device first:** with fallbacks off, text **stays local**.
- Cloud fallbacks send text to your chosen provider; never log API keys to console.

---

## ❓ FAQ
**Does it guarantee authorship?**  
No. It provides **probabilities** and **explanations**; final judgment is human.

**Do I need OpenAI/Gemini?**  
Only for cloud fallbacks. On-device mode does not require external accounts.

**Does it work offline?**  
Yes, when on-device is available; otherwise network is required for fallbacks.

**Which languages are supported?**  
UI: EN/ES. Analysis/humanization follows the input language.

---

## 📄 License
MIT — see `LICENSE`.

