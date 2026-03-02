import { GoogleGenAI } from '@google/genai';

export type SourceType = 'court_case' | 'enforcement_action' | 'guidance_page';

export interface CitationMetadata {
  caseName?: string;
  docketNumber?: string;
  court?: string;
  year?: string;
  agencyName?: string;
  title?: string;
  date?: string;
  url?: string;
  lastVisited?: string;
}

export type CitationModelId =
  | 'gemini-3.1-pro-preview-customtools'
  | 'gemini-3.1-pro-preview'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash';

export interface CitationResult {
  sourceType: SourceType;
  confidence: 'high' | 'medium' | 'low';
  sourceUrl: string;
  metadata: CitationMetadata;
  citation: string;
  explanation: string;
}


function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s.`)), ms)
    ),
  ]);
}

export async function generateCitation(
  input: string,
  typeHint: string = 'Auto',
  manualApiKey?: string,
  modelId: CitationModelId = 'gemini-3-flash-preview'
): Promise<CitationResult> {
  const apiKey = manualApiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing Gemini API key. Enter one in the API key field or configure VITE_GEMINI_API_KEY.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
You are an expert legal citation assistant. Your task is to analyze a rough description of a legal source, find the most authoritative actual source using Google Search, classify it, extract metadata, and generate a Bluebook-style citation.

Input description: "${input}"
${typeHint !== 'Auto' ? `User suggested source type: ${typeHint}` : ''}

Follow these steps:
1. Search for the official source (court docket, AG press release, official guidance page). Prefer official sources over news articles.
2. Classify the source into one of these categories:
   - 'court_case': A filed lawsuit, court order, or court docket.
   - 'enforcement_action': An Attorney General settlement, enforcement press release, or agency action without a formal court docket.
   - 'guidance_page': A government guidance webpage, reporting portal, or official informational page.
3. Extract the relevant metadata based on the classification.
   - For court_case: caseName, docketNumber, court, year.
   - For enforcement_action: agencyName, title, date, url.
   - For guidance_page: agencyName, title, url, lastVisited (use today's date).
4. Generate a Bluebook-style citation.
5. Explain your reasoning and confidence level.

Return the result as a JSON object matching the schema.
  `;

  const response = await withTimeout(ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `Return ONLY valid JSON with this shape: {"sourceType":"court_case|enforcement_action|guidance_page","confidence":"high|medium|low","sourceUrl":"...","metadata":{},"citation":"...","explanation":"..."}`,
    }
  }), 60000, 'Citation request');

  if (!response.text) {
    throw new Error("Failed to generate citation: Empty response");
  }

  const raw = response.text.trim();
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(cleaned) as CitationResult;
  } catch {
    throw new Error(`Model returned non-JSON output. Raw response: ${raw.slice(0, 280)}`);
  }
}
