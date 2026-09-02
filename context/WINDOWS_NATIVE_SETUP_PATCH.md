# Windows-Native Setup Patch
*(Replaces "Human Setup H.1–H.7" in CURSOR_BUILD_GUIDE.md — no WSL2, no Ubuntu)*

## How to use this file
1. Complete the manual installs below (Tesseract and Ollama need a one-time GUI installer — everything else can run in PowerShell).
2. Paste the **"PASTE INTO CURSOR"** block as your first message, or use the patched phase files in this folder directly.
3. **All phase files (02–14) in this folder are Windows-native FINAL prompts** — do not use unpatched WSL commands from older copies.
4. Cosmetic README text fixes are listed at the bottom.

---

## PASTE INTO CURSOR (verbatim, as your first message)

```
I'm building this project on native Windows 11 — no WSL2, no Ubuntu, no Linux
subsystem. My terminal is PowerShell. Whenever a shell command is needed for
any phase of this build, use PowerShell/Windows syntax — winget instead of
apt, no sudo, no "curl | sh" pipe installers, backslash or quoted paths.
If any phase text mentions WSL2, Ubuntu, apt, python3.11, or bash-only syntax,
translate it to the Windows-native equivalent automatically instead of
running it literally.

Hardware: RTX 5050, 8 GB VRAM, 24 GB DDR5 RAM, Windows 11.

Environment setup (already completed and verified on my machine):

H.1 — Python 3.11: winget install Python.Python.3.11 -e
H.2 — Node.js LTS: winget install OpenJS.NodeJS.LTS -e
H.3 — Git: winget install Git.Git -e
H.4 — Tesseract (eng+hin): UB Mannheim installer + PATH; TESSERACT_CMD in .env
H.5 — GPU: nvidia-smi shows RTX 5050 ~8GB
H.6 — Ollama: OllamaSetup.exe + ollama pull qwen2.5:7b; ollama ps shows GPU
H.7 — venv + TTS: python -m venv .venv; pip install pyttsx3 (optional piper-tts)

All verified. Proceed with Phase 0 from patched context/02-phase0 file next.
```

---

## README text fixes (Phase 10)

1. Setup line: `Python 3.11 (winget), Node LTS (winget), Git, Tesseract UB Mannheim + Hindi, Ollama native, venv + pip install, cd frontend; npm install`
2. VRAM row: `OS overhead (native Windows) | ~0.5 GB`

Phases 0–11 in `context/` are authoritative Windows-native prompts including 3D animated frontend (Phase 8).
