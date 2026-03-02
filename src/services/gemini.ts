import { GoogleGenAI, Type } from '@google/genai';

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
  | 'gemini-3-flash-preview'
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
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sourceType: { type: Type.STRING, enum: ['court_case', 'enforcement_action', 'guidance_page'] },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          sourceUrl: { type: Type.STRING, description: 'The URL of the most authoritative source found.' },
          metadata: {
            type: Type.OBJECT,
            properties: {
              caseName: { type: Type.STRING },
              docketNumber: { type: Type.STRING },
              court: { type: Type.STRING },
              year: { type: Type.STRING },
              agencyName: { type: Type.STRING },
              title: { type: Type.STRING },
              date: { type: Type.STRING },
              url: { type: Type.STRING },
              lastVisited: { type: Type.STRING },
            }
          },
          citation: { type: Type.STRING, description: 'The generated Bluebook-style citation.' },
          explanation: { type: Type.STRING, description: 'Explanation of source selection and any warnings (e.g., if a fallback source was used).' }
        },
        required: ['sourceType', 'confidence', 'sourceUrl', 'metadata', 'citation', 'explanation']
      }
    }
  }), 60000, 'Citation request');

  if (!response.text) {
    throw new Error("Failed to generate citation: Empty response");
  }

  return JSON.parse(response.text) as CitationResult;
}
