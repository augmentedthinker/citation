# Citation

Legal citation proof-of-concept app for quickly turning rough legal-source prompts into Bluebook-style citations.

## What it does
- Accepts a rough source description (e.g., lawsuit, AG action, guidance page)
- Uses Gemini + Google Search to find an authoritative source
- Classifies source type and extracts citation metadata
- Generates a citation and explanation
- Lets you manually edit fields and regenerate citation text

## Stack
- React + TypeScript + Vite
- Gemini API (`@google/genai`)

## Local run
1. Install deps
   ```bash
   npm install
   ```
2. Set API key (choose one)
   - In-app manual field (stored in browser localStorage), or
   - `.env.local` with:
   ```bash
   VITE_GEMINI_API_KEY=your_key_here
   ```
3. Start dev server
   ```bash
   npm run dev
   ```

## Notes
- This is a POC and may require legal review before production/legal-use deployment.
- Prefer official source links (court/agency) over media summaries.
