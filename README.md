# ⚡ FRC Battery Life Tracker

A free, mobile-first web app for FRC pit crews to track battery status across an entire event — no app store, no install, just open a link on any phone.

Built to answer the two most important pit questions at all times:
> **"Which battery should I grab next?"** and **"How long until the next one is ready?"**

---

## 📸 Screenshots

> *(Add screenshots here before posting to Chief Delphi)*

---

## ✨ Features

### Core Tracking
- **2–12 batteries** supported — set the count in Settings to match your pit
- **5 battery states**: Depleted → Charging → Cooling → Ready → In Bot
- **Smart "USE NEXT" recommendation** — automatically picks the best battery based on charge status, voltage, charge time, and cycle count
- **Progress bars** on every card for charging and cooling timers
- **Elapsed timers** — see exactly how long a battery has been charging, cooling, or in the bot
- **Cycle count** tracked per battery automatically

### Battery Detail Modal
- **Voltage input** with live health warnings (low, high, damaged thresholds)
- **Internal resistance (mΩ)** input with quality ratings (Excellent / Good / Fair / Poor)
- **Per-battery health summary** based on IR readings or cycle count
- **Custom labels** — rename any battery (e.g. "Blue Tape", "Worn One")
- **Notes field** — log issues, observations, or anything useful
- **Full event history log** — every status change with timestamps, last 50 events per battery

### Multi-Phone Live Sync *(optional)*
- Share a **Sync Code** (e.g. `FRC1234`) across multiple phones and they all stay in sync in real time via Firebase (~200ms latency)
- **Pit phone** handles all the button presses
- **Field phone / drive coach phone** gets a dedicated **Field View** — huge text, read-only, shows only "GRAB THIS BATTERY" and "IN BOT"
- Works completely **offline / local-only** if you don't set up Firebase — data is saved to the phone's localStorage

### Field View
- Activate with the `?field` URL parameter or the View Only toggle in Settings
- Shows **match number**, **team number**, and a large "GRAB THIS" card with the best next battery
- Charge progress bar visible from across the pit
- Live sync dot shows connection status at a glance
- Switch back to pit view with one tap

### Settings
- Team number display
- Battery count (2–12)
- Charge threshold (default 60 min — how long before a charging battery is considered "ready")
- Cool-down threshold (default 15 min)
- Sync code for multi-phone mode
- View-only toggle for field phones
- **Reset All** — wipes all battery data and starts fresh

---

## 📱 How to Use

### One Phone (No Setup)
1. Open the app link in any mobile browser
2. Tap a battery card to open its detail view
3. Use the action buttons to move it through the cycle:
   - **Start Charging** → battery goes on the charger
   - **Mark Ready** → fully charged, available to use
   - **Put in Bot** → installed in the robot (auto-removes previous in-bot battery)
   - **Remove → Cooling** → battery needs to cool before recharging
   - **Remove → Depleted** → battery is done, needs charging
4. The **USE NEXT** banner at the top always shows the best battery to grab

### Multiple Phones (Live Sync)
1. Set up Firebase (see below) and deploy the app
2. On every phone, open Settings and enter the same **Sync Code** (e.g. your team number)
3. All phones share the same battery data in real time
4. On the **field phone**, append `?field` to the URL for the large read-only view:
   ```
   https://your-app-url.com/?field
   ```

---

## 🔋 Battery Status Flow

```
DEPLETED ──► CHARGING ──► READY ──► IN BOT ──► COOLING ──► CHARGING
                │                               │
                └──── Cancel ──► DEPLETED       └──► DEPLETED (if worn out)
```

---

## 🚀 Self-Hosting / Running Locally

### Requirements
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node)

### Run Locally
```bash
git clone https://github.com/Joel-Trumpet-67/Battery-Life.git
cd Battery-Life
npm install
npm run dev
```
Then open `http://localhost:5173` in your browser.

### Build for Production
```bash
npm run build
```
The `dist/` folder contains the static site — host it anywhere (GitHub Pages, Netlify, Vercel, etc.).

---

## 🔥 Firebase Setup *(optional — for multi-phone live sync)*

Without Firebase the app works perfectly on a single phone using localStorage.
If you want live sync across multiple phones, you need a free Firebase project.

### Step 1 — Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → continue
3. Disable Google Analytics if you don't need it → **Create project**

### Step 2 — Enable Realtime Database
1. In the Firebase console, go to **Build → Realtime Database**
2. Click **Create Database**
3. Choose a location (pick the closest to your region)
4. Start in **Test mode** for now *(lock this down before a real event — see Security Rules below)*

### Step 3 — Get Your Config Values
1. Go to **Project Settings** (gear icon) → **General**
2. Under **Your apps**, click the **Web** icon (`</>`) to register a web app
3. Copy these three values from the config shown:
   - `apiKey`
   - `projectId`
   - The `databaseURL` is `https://<your-project-id>-default-rtdb.firebaseio.com`

### Step 4 — Add Environment Variables

**For local development** — create a `.env` file in the project root:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id-here
```

**For GitHub Pages** — add these as Repository Secrets:
1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Add three secrets with the same names as above
3. Push to `main` — the GitHub Actions workflow will pick them up automatically

### Step 5 — Database Security Rules *(before competition)*
In the Firebase console → Realtime Database → **Rules**, replace the default with:
```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['batteries'])"
      }
    }
  }
}
```
This allows any phone with your sync code to read/write, but prevents random writes to other paths.

---

## 🌐 Deploying to GitHub Pages

The repo includes a GitHub Actions workflow that automatically deploys to GitHub Pages on every push to `main`.

### One-Time Setup
1. Fork or push this repo to GitHub
2. Go to **Settings → Pages**
3. Under **Source**, select **GitHub Actions**
4. Add your Firebase secrets (see above) if using sync
5. Push a commit — the workflow will build and deploy automatically

Your app will be live at:
```
https://<your-github-username>.github.io/<repo-name>/
```

---

## 🗂 Project Structure

```
src/
├── App.jsx                        # Root component, top-level state
│
├── components/
│   ├── Header.jsx                 # Top bar (team, match number, settings)
│   ├── StatusBanner.jsx           # "IN BOT" + "USE NEXT" recommendation banner
│   ├── BatteryGrid.jsx            # Responsive grid of battery cards
│   ├── BatteryCard.jsx            # Individual battery card with progress bar
│   ├── BatteryModal.jsx           # Full detail modal (actions, readings, history)
│   ├── SettingsPanel.jsx          # Settings slide-up panel
│   └── FieldView.jsx              # Large read-only view for field phones
│
├── hooks/
│   ├── useBatteries.js            # Central battery state hook (composes below)
│   ├── useBatteriesSync.js        # Firebase listener + localStorage persistence
│   ├── useBatteriesActions.js     # All status-transition actions
│   └── useModals.js               # Modal open/close + browser back button
│
└── utils/
    ├── batteryLogic.js            # Barrel re-export (import from here)
    ├── batteryConstants.js        # STATUS, STATUS_LABEL, STATUS_COLOR, STATUS_BG
    ├── batteryFactory.js          # createBattery(), addHistory()
    ├── batteryRecommend.js        # getBestNextBattery(), getInBotBattery(), ETA
    ├── batteryHealth.js           # assessVoltage(), assessIR(), getBatteryHealth()
    ├── storage.js                 # localStorage read/write helpers
    └── formatting.js              # formatElapsed(), estimateChargePercent()
```

---

## 🧰 Tech Stack

| | |
|---|---|
| **Framework** | React 18 |
| **Build tool** | Vite 5 |
| **Sync** | Firebase Realtime Database |
| **Storage** | Browser localStorage (offline fallback) |
| **Hosting** | GitHub Pages (via GitHub Actions) |
| **Dependencies** | React, React DOM, Firebase — nothing else |

No UI framework, no TypeScript, no state management library. Kept intentionally simple so any FRC student who knows a bit of JavaScript can read and modify it.

---

## 🤝 Contributing

Pull requests are welcome. If you're on an FRC team and want a feature — open an issue or just send a PR.

Some ideas already planned (marked as `TODO [PERF-*]` in the code):
- Debounce Firebase writes to reduce database usage
- `React.memo` on BatteryCard to reduce unnecessary re-renders
- Move the 10s refresh tick into individual components instead of the root
- Faster deep-equality check for Firebase sync comparison

---

## 📄 License

MIT — free to use, modify, and redistribute. Credit appreciated but not required.

---

*Built for the FRC community. Good luck at your events! 🤖*
