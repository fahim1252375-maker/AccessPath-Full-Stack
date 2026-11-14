# AccessPath AI Transparency & Safety Disclosure

## 1. Where AI Is Used

AccessPath uses Google Gemini (`gemini-4-hydrogen` via the official `@google/genai` TypeScript SDK, executed strictly server-side in `backend/src/services/ai/geminiService.ts`) to assist with:

1. **Barrier Report Classification (`POST /api/v1/ai/classify-report`)** — Extracts structured category, suggested priority, accessibility impact summary, and language (`en`, `bn`, or `mixed`) from user text.
2. **Bilingual EN / বাংলা Translation (`POST /api/v1/ai/translate`)** — Translates barrier reports and descriptions between English and Bengali.
3. **Barrier Photo Inspection (`POST /api/v1/ai/analyze-image`)** — Inspects an uploaded PNG/JPEG/WEBP photo and suggests a barrier category and priority.
4. **Duplicate Detection (`POST /api/v1/ai/detect-duplicates`)** — Compares a proposed report against open campus reports to reduce duplicate submissions.
5. **Admin Report Summarization (`POST /api/v1/ai/summarize`)** — Summarizes recorded campus barrier patterns for moderators/administrators.
6. **Grounded Campus Accessibility Assistant (`POST /api/v1/ai/assistant`)** — Answers natural-language accessibility questions in English or বাংলা strictly using authorized campus data.

## 2. Hard Safety Guardrails

- **No Authoritative Map Mutation**: AI responses **never** directly modify `PathEdge`, `LocationNode`, or `Building` records. Every AI classification sets `requiresHumanVerification: true`.
- **No Invented Safe Paths**: If information is missing from verified campus records, the assistant explicitly states that the data is unavailable in verified records instead of guessing.
- **No Emergency Dispatch Claims**: The assistant explicitly clarifies that it does not contact emergency services; emergency routes require explicit campus safety admin approval (`adminApproved: true`).
- **Observability & Privacy**: Requests are logged in `aiInteractions` with feature name, provider (`gemini` or `mock`), latency, and short non-PII summaries (length/category), without sending user passwords or unnecessary PII to the model.
- **Deterministic Offline Fallback**: When `GEMINI_API_KEY` is not configured or `AI_PROVIDER=mock`, deterministic keyword/token logic executes locally and labels `provider: "mock"` transparently in the API response and UI.
