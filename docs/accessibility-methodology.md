# AccessPath Accessibility Methodology

## 1. Design Principles (WCAG 2.2 AA Targets & Inclusive UX)

AccessPath is engineered to reduce physical, sensory, and cognitive friction for students, visitors, volunteers, and campus accessibility staff:

1. **Keyboard & Focus Accessibility**: Skip-to-main-content link (`#main-content`), logical heading landmarks, ARIA live announcements (`LiveAnnouncer`), keyboard-navigable route planner controls, and visible focus outlines.
2. **Adaptive Display Modes**:
   - **High-Contrast Mode** (`data-high-contrast="true"`): Increases surface, text, border, and focus contrast.
   - **Font Size Scaling** (`data-font-size="normal|large|xl"`): Scales root typography from `16px` up to `20px`.
   - **Reduced Motion Mode** (`data-reduced-motion="true"`): Disables animations and transitions, honoring both manual preference and `prefers-reduced-motion`.
   - **Low-Bandwidth / Text-First Map Mode**: Disables map tile requests and renders structured, screen-reader-friendly accessible route steps and campus node tables.
3. **Voice & Audio Assistance**: Browser Web Speech API (`window.speechSynthesis` / `SpeechRecognition`) provides read-aloud step guidance and hands-free voice reporting fallback when supported by the user's browser.
4. **Bilingual EN / বাংলা Support**: Full UI switching (`i18next`) plus bilingual barrier report submission and AI-assisted translation.

## 2. Verification & Truthfulness Standards

- **No Automatic Accessibility Assumptions**: Unknown or unverified segments (`verificationStatus: 'unverified' | 'unknown' | 'disputed'`) are excluded by default under strict accessibility profiles (`wheelchairMode`, `stepFreeMode`, `limitedMobilityMode`, `rampRequired`, `elevatorRequired`, `stairsAvoidance`).
- **Distinguishing Demo Seed Data**: Synthetic demo campus records carry explicit `isDemoData: true` flags and visible `DEMO CAMPUS — SYNTHETIC DATA` notices.
- **No Unverified Compliance Claims**: AccessPath targets WCAG 2.2 AA practices in its interface and provides structured campus verification workflows, without claiming formal third-party WCAG or ADA/DDA legal certification.
