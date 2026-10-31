# Mind Mirror AI

> *"Understand Your Patterns. Reflect. Take Your Next Step."*

**Mind Mirror AI** is an immersive, 3D web application designed for student personal wellness, self-reflection, and academic productivity.

Students frequently experience academic pressure, irregular sleep cycles, fluctuating energy, and overwhelming workloads without noticing the underlying relationships governing their day-to-day stamina. Mind Mirror AI helps students record daily mood, sleep, energy, stress, workload, and personal reflections, displaying evidence-supported mathematical observations, generating personalized reflections, and conversing naturally with their 3D AI companion, **Pluto**.

---

## 🌟 Key Features

### 1. 🌌 Full 3D Website Experience & Celestial Environment
- **Persistent 3D Celestial Background**: A Three.js interactive canvas featuring floating starfields, reactive nebula dust particles that shift with mouse parallax, and distant planetary orbital rings.
- **True Multi-Page Flow**: Not a single-page landing site; includes dedicated pages for:
  1. **Login & Student Registration Portal** (`/login`)
  2. **User Details & Student Profile** (`/profile`)
  3. **3D AI Companion Lounge with Pluto** (`/companion`)
  4. **Home Dashboard** (`/dashboard`)
  5. **Daily Pattern Check-in** (`/checkin`)
  6. **Personal Insights & Correlation Analytics** (`/insights`)
  7. **Action Planner & Pomodoro Station** (`/planner`)
  8. **7-Day Habit Challenge** (`/experiment`)
  9. **Privacy & API Settings** (`/settings`)

---

### 2. 🪐 Pluto — Your Human-like 3D AI Companion
- **Real-Time 3D Avatar**: Rendered in Three.js and React Three Fiber with ambient, directional cyan, and violet rim lighting.
- **Head Tracking & Natural Blinking**: The avatar's head tracks the user's cursor while eyes blink smoothly on an autonomous biological cadence.
- **Dynamic Lip-Sync & Visemes**: Mouth articulates in real-time in synchrony with speech output.
- **Truly Human-like Conversation**:
  - Pluto responds with genuine warmth, empathy, and conversational depth, avoiding sterile robotic checklists.
  - **Converses Naturally Further**: Pluto actively asks open-ended, perceptive follow-up questions to invite further dialogue (e.g. *"What part of that assignment is weighing on you the most?", "Did taking that walk clear your head or did your thoughts keep spinning?"*).
  - **Interactive Follow-up Chips**: Displays 2–3 suggested natural response buttons so you can continue conversing effortlessly with a single tap.
- **Multilingual Voice Interaction**:
  - Speech-to-Text (STT) via microphone in English, Spanish, French, German, Hindi, and Japanese.
  - Text-to-Speech (TTS) natural voice playback with audio visualizer waveforms.
- **Action Extraction**: Formulates actionable micro-steps from conversational reflections and adds them to your Action Planner with 1 click.

---

### 3. 🎓 Dedicated Login & User Details Pages
- **Login / Register Page (`src/views/LoginView.tsx`)**:
  - **1-Click Demo Student Access**: Pre-configured as *Alex Rivera (Cognitive Science & Computer Science, Junior at UC Berkeley)* for instant evaluation.
  - Custom registration supporting University/College, Major, Academic Year, and Target Sleep Hours.
- **User Details Page (`src/views/ProfileView.tsx`)**:
  - 3D Holographic Student ID Card.
  - Real-time wellness statistics: total check-ins, consistency streak, average sleep vs target, and academic pressure index.
  - Live edit profile modal with local persistence.
  - Switch Account / Sign Out support.

---

### 4. 📝 Daily Student Pattern Check-in
- **Mood Rating (1-5)**: Visual scale from *Drained* (1) to *Radiant* (5).
- **Sleep Duration Slider & Input**: Track nightly hours with cognitive restoration window indicators.
- **Energy Rating (1-5)**: 5-point physical & mental stamina scale.
- **Self-Reported Stress (1-10)**: Gradient spectrum from relaxed (*1-3*) to overwhelmed (*7-10*).
- **Academic Workload Level**: Low, Medium, or High.
- **Voice-Dictated Journal**: Hands-free reflection journal.
- **Academic Tasks & Deadlines**: Add upcoming assignments directly to today's log.
- **Instant AI Reflection**: Real-time personalized reflection and micro-action suggestions upon saving.

---

### 5. 📊 Personal Insights & Evidence-Based Analytics
- **Multi-Variable Trend Charts**: Recharts visualizations comparing Sleep, Energy, Stress, and Mood over 7, 14, 30 days, or all time.
- **Sleep vs. Energy Relationship Area Chart**: Visual proof of how nightly rest mirrors next-day energy reserve.
- **Workload vs. Stress Breakdown**: Compares average reported stress across Low, Medium, and High workloads.
- **Pearson Correlation Coefficients ($r$)**: Mathematical co-occurrence analyses.
- **Evidence Badges & Non-Causation Disclaimers**: Clear ethical notices emphasizing correlation is not medical causation.

---

### 6. 🧭 7-Day Guided Reflection Experiment & Action Planner
- **7-Day Guided Curriculum**: Day-by-day guided prompts to map personal baseline, sleep triggers, and focus rhythms.
- **Pomodoro Focus Station**: 25m focus sprints, 5m short breaks, 15m long breaks with audio chime notifications.
- **Confetti Celebrations**: Visual rewards upon completing micro-goals.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript + Vite 8 |
| **Styling & 3D Depth** | Tailwind CSS v4 with deep navy glassmorphism & 3D cards |
| **3D Graphics & Avatar** | Three.js + React Three Fiber (`@react-three/fiber`, `@react-three/drei`) |
| **Voice Interaction** | Multilingual Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) + Web Audio API |
| **Data Persistence** | IndexedDB via Dexie.js (`userProfile`, `checkIns`, `actionTasks`, `experimentProgress`, `settings`, `chatHistory`) |
| **Data Visualization** | Recharts (Responsive Multi-Line, Area, and Bar charts) |
| **AI Engine** | Google Gemini 2.5 Flash API + Built-in Local Pluto Mind Engine |
| **Testing** | Vitest unit test runner (10/10 tests passing) |

---

## 🚀 Running the Project

```bash
# 1. Navigate to project directory
cd "C:\Users\Poorvi R\.gemini\antigravity\scratch\mind-mirror-ai"

# 2. Start development server
npm run dev

# 3. Run unit tests
npm test

# 4. Production build
npm run build
```

Open your browser at **`http://localhost:5173`**.

---

*Built with ❤️ for student wellness, mindful self-reflection, and academic balance.*
