<div align="center">

# 🎙️ Vocalis

*Latin for “of the voice”*

**Speak in any language. Export in any format.**

Speak or type — export your words to PDF, Word, Markdown and more.

A beautiful, local-first web app built with Flask. Dictate in 15 languages (including Telugu, Hindi and Tamil), edit, and download in the document format you choose.

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-111111)
![Tests](https://github.com/Ramakrishna2006/vocalis/actions/workflows/tests.yml/badge.svg)

</div>

---

## ✨ Features

| | |
|---|---|
| 🎙️ **Live dictation** | Pulsing mic button, real-time waveform, timer and live preview |
| 🌐 **15 languages** | English, Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Urdu, Spanish, French, German |
| 🗣️ **Voice commands** | “new line”, “new paragraph”, “full stop”, “comma”, “question mark”… |
| ⌨️ **Text mode** | Type, paste, or import `.txt` / `.md` files; one-click “Tidy up” |
| 📄 **6 export formats** | PDF · DOCX · TXT · Markdown · HTML · RTF |
| 🎨 **Styling options** | Title, author, font size and alignment |
| 🌗 **Dark & light themes** | Glassmorphism UI with animated gradients |
| 💾 **Autosave** | Your draft survives a page refresh; recent exports list |
| ⚡ **Shortcut** | `Ctrl + S` downloads instantly |

## 🚀 Run it locally — step by step

**Step 1 — Install the prerequisites**
- [Python 3.10+](https://www.python.org/downloads/). On Windows, tick **"Add Python to PATH"** during install.
- [Git](https://git-scm.com/downloads).
- Google Chrome or Microsoft Edge, for voice typing.

Check they work:
```bash
python --version
git --version
```

**Step 2 — Get the code**
```bash
git clone https://github.com/Ramakrishna2006/vocalis.git
cd vocalis
```
(Or download the ZIP from GitHub, extract it, and open a terminal inside the folder.)

**Step 3 — Create a virtual environment** (keeps this project's packages separate)
```bash
python -m venv venv
```

**Step 4 — Activate it**
```bash
# Windows (Command Prompt / PowerShell)
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```
You'll see `(venv)` at the start of your terminal line.

**Step 5 — Install the dependencies**
```bash
pip install -r requirements.txt
```

**Step 6 — Start the server**
```bash
python app.py
```
You should see: `Vocalis running -> http://localhost:5000`

**Step 7 — Use the app**
1. Open **http://localhost:5000** in Chrome or Edge.
2. On the **Voice** tab, pick your language and tap the mic. Click **Allow** when the browser asks for microphone access.
3. Speak. Say "new paragraph" or "full stop" to format as you go. Or switch to the **Text** tab and type.
4. Enter a title, choose a format on the right (PDF, DOCX…), and click **Download**.

**Step 8 — Stop the server**
Press `Ctrl + C` in the terminal. Type `deactivate` to leave the virtual environment.

## ☁️ Upload this project to your GitHub — step by step

**Step 1 — Create an empty repository on GitHub**
1. Sign in at [github.com](https://github.com) and click **+ → New repository**.
2. Name it `vocalis`, add a description, choose **Public**.
3. **Do not** tick "Add a README", ".gitignore" or "license", because this project already has them.
4. Click **Create repository** and copy the URL, e.g. `https://github.com/Ramakrishna2006/vocalis.git`.

**Step 2 — Tell Git who you are** (first time only)
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

**Step 3 — Open a terminal inside the `vocalis` folder**
```bash
cd path/to/vocalis
```

**Step 4 — Initialise Git and make your first commit**

If the folder has no `.git` folder yet:
```bash
git init
git add .
git commit -m "Initial commit: Vocalis"
```
If it already has one (`git status` works), just commit any changes:
```bash
git add .
git commit -m "Update Vocalis"
```

**Step 5 — Connect to GitHub and push**
```bash
git branch -M main
git remote add origin https://github.com/Ramakrishna2006/vocalis.git
git push -u origin main
```
When asked to sign in, use your GitHub username and a **Personal Access Token** as the password (GitHub → Settings → Developer settings → Personal access tokens → Generate new token, tick `repo`). Or sign in through the browser window Git opens.

**Step 6 — Check it on GitHub**
Refresh your repository page. You'll see all the files and this README. Open the **Actions** tab to watch the automatic tests run.

**Step 7 — Check the badge**
The Tests badge at the top of this README points to `github.com/Ramakrishna2006/vocalis`. If you fork or copy this project, replace `Ramakrishna2006` with your own GitHub username and push again.

**Later — pushing new changes**
```bash
git add .
git commit -m "Describe what you changed"
git push
```

## ⚙️ How it works — step by step

1. **You speak.** `static/app.js` uses the browser's **Web Speech API** (`SpeechRecognition`) to turn speech into text. Interim words show live in blue. Final words are added to the editor.
2. **Voice commands are applied.** Phrases like "new line" or "comma" are swapped for real punctuation, and sentences are capitalised.
3. **The waveform animates.** The **Web Audio API** reads microphone volume and draws bars on a `<canvas>`.
4. **Your draft is saved.** The text and title are kept in `localStorage`, so a refresh doesn't lose your work.
5. **You click Download.** The browser sends the text, title, author, format, font size and alignment as JSON to `POST /convert`.
6. **Flask builds the document.** `app.py` picks a builder function for the format: `python-docx` for Word, `fpdf2` for PDF, and plain string building for TXT, MD, HTML and RTF.
7. **The file comes back.** Flask returns it with `send_file`, and the browser downloads it with a safe filename.

## 🗂️ Project structure

```
vocalis/
├── app.py                  # Flask server + document builders
├── requirements.txt
├── templates/
│   └── index.html          # UI
├── static/
│   ├── style.css           # Styles & animations
│   └── app.js              # Speech recognition, editor, export logic
├── tests/
│   └── test_app.py         # Pytest suite (all formats)
├── fonts/                  # Optional: drop Unicode .ttf fonts here
└── .github/workflows/
    └── tests.yml           # GitHub Actions CI
```

## 🔌 API

`POST /convert` — returns the file as a download.

```json
{
  "text": "Your content here",
  "title": "My Document",
  "author": "Optional",
  "format": "pdf | docx | txt | md | html | rtf",
  "fontSize": 12,
  "align": "left | center | right | justify"
}
```

## 🧪 Running tests

```bash
pip install pytest
pytest -v
```

## 📝 Notes

- Voice typing uses the browser’s Web Speech API, which needs an internet connection. Typing and exporting work fully offline.
- Microphone access works on `localhost` without HTTPS.
- **Indian-language PDFs:** On Windows the app uses the built-in *Nirmala UI* font automatically. On macOS/Linux, download a [Noto font](https://fonts.google.com/noto) (e.g. `NotoSansTelugu-Regular.ttf`) and put it in the `fonts/` folder.

## 🛠️ Built with

[Flask](https://flask.palletsprojects.com/) · [python-docx](https://python-docx.readthedocs.io/) · [fpdf2](https://py-pdf.github.io/fpdf2/) · Web Speech API · Web Audio API

## 📄 License

[MIT](LICENSE)
