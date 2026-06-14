# DocuMind Next.js Frontend Application

The Next.js 15 frontend client for DocuMind. It features a modern, responsive user interface with real-time progress steps for PDF parsing, chat session management, markdown parsing for LLM answers, and dark/light theme options.

---

## 🛠️ Stack & Technologies

- **Framework**: Next.js 15 (App Router)
- **Library**: React 19 & TypeScript
- **Theme Manager**: `next-themes` (Dark/Light mode)
- **Styling**: Vanilla CSS utilizing css-variables for full design token control.
- **Icons**: Custom responsive SVGs.

---

## 🔒 Authentication State & Silent Renewal

1. **State Persistence**:
   - The user's active profile and JWT access token are stored in `localStorage` under keys `documind_user` and `documind_access_token`.
2. **Global Syncing**:
   - The auth status is listened to globally via the custom window event `documind-auth-changed` and storage changes, updating all pages and navigation bars immediately on login or logout.
3. **Silent Session Extension (Token Renewal)**:
   - A periodic check (every 10 seconds) runs in [page.tsx](file:///Users/adityabhagwat/Projects/DocuMind/frontend/src/app/page.tsx) to analyze the current token expiration.
   - If the active token is detected to expire in less than 10 minutes, the client silently requests a refreshed token from the backend `POST /auth/refresh` endpoint and updates local storage automatically. This keeps active users logged in indefinitely.

---

## 🗂️ Project Structure

```
frontend/
├── tsconfig.json          # TypeScript compilation options
├── package.json           # Node scripts and dependencies
│
├── public/                # Static public assets
│
└── src/
    ├── app/
    │   ├── layout.tsx     # Application root layout + context providers
    │   ├── page.tsx       # Landing page / active workspace toggle
    │   ├── globals.css    # Typography, design tokens & UI components
    │   ├── login/         # Independent /login fallback route
    │   ├── signup/        # Independent /signup fallback route
    │   ├── privacy/       # Privacy policy
    │   ├── terms/         # Terms of Service
    │   └── legal/         # Legal notice directory
    │
    ├── components/
    │   ├── ChatApp.tsx    # Core Q&A interface, session history & upload handling
    │   ├── Navbar.tsx     # Header bar with user menu & theme toggler
    │   ├── AuthModal.tsx  # In-app Login / Signup modal
    │   ├── AuthModalContext.tsx # Context managing the active auth modal state
    │   ├── Hero.tsx       # Main marketing landing block
    │   ├── Features.tsx   # Core product features grid
    │   ├── HowItWorks.tsx # Step-by-step visual onboarding guide
    │   └── FAQ.tsx        # Accordion-style product FAQs
    │
    └── lib/
        └── auth.ts        # JWT parser, token checks & auth API client
```

---

## 🎨 Customizing Design & Tokens

Theme variables and typography (inter, outfit, etc.) are declared inside `src/app/globals.css`. You can change the primary color and other UI metrics by adjusting variables inside theme rules:

```css
[data-theme="dark"] {
  --acc: oklch(0.57 0.24 280);    /* Primary purple accent */
  --bg-app: oklch(0.08 0.02 240); /* Main dark background */
}

[data-theme="light"] {
  --acc: oklch(0.60 0.22 270);
  --bg-app: oklch(0.98 0.01 240);
}
```

---

## 🏃 Running the Frontend

```bash
# Navigate to directory
cd frontend

# Install Node dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.
