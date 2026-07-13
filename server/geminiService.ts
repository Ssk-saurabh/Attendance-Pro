import { GoogleGenAI, Type } from '@google/genai';

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.5-flash',
];

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  return key;
}

export async function processWithGemini(fileBuffer: Buffer | null, mimeType: string, extractedText?: string, promptCustom?: string) {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const defaultPrompt = `
    You are an expert academic organizer and syllabus parser.
    Analyze the provided document (syllabus, timetable, or attendance record) and extract subjects and schedule.
    Today's date: ${new Date().toISOString().split('T')[0]}.

    Extract:
    1. All distinct academic subjects. For each:
       - name (full subject name)
       - code (subject code if visible, e.g. CS-301)
       - facultyName (professor/teacher name if visible)
       - credits (e.g. "4 Credits")
       - semester (e.g. "Semester 3")
       - minGoal (minimum attendance %, default 75)

    2. Weekly timetable slots. For each slot:
       - subjectName (matching a subject above)
       - dayOfWeek (integer: 1=Monday ... 7=Sunday)
       - period (integer starting from 1)

    3. Any attendance records already visible in the document (optional).

    Be accurate. Expand abbreviations to full names. Return valid JSON matching the schema.
  `;

  const prompt = promptCustom || defaultPrompt;

  let lastError: any = null;
  for (const modelName of MODELS_TO_TRY) {
    try {
      let contents: any;
      if (fileBuffer && mimeType.startsWith('image/')) {
        contents = {
          parts: [
            { inlineData: { mimeType, data: fileBuffer.toString('base64') } },
            { text: prompt },
          ],
        };
      } else {
        const textContent = extractedText ? `Extracted Document Text:\n${extractedText}\n\n${prompt}` : prompt;
        contents = {
          parts: [{ text: textContent }],
        };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name:        { type: Type.STRING },
                    code:        { type: Type.STRING },
                    facultyName: { type: Type.STRING },
                    credits:     { type: Type.STRING },
                    semester:    { type: Type.STRING },
                    minGoal:     { type: Type.NUMBER },
                  },
                  required: ['name', 'minGoal'],
                },
              },
              timetable: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subjectName: { type: Type.STRING },
                    dayOfWeek:   { type: Type.INTEGER },
                    period:      { type: Type.INTEGER },
                  },
                  required: ['subjectName', 'dayOfWeek', 'period'],
                },
              },
              attendance: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subjectName: { type: Type.STRING },
                    date:        { type: Type.STRING },
                    status:      { type: Type.STRING },
                    period:      { type: Type.INTEGER },
                  },
                  required: ['subjectName', 'date', 'status', 'period'],
                },
              },
            },
            required: ['subjects', 'timetable'],
          },
        },
      });

      const text = (response.text || '').trim();
      if (!text) continue;
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} failed:`, err?.message);
    }
  }

  throw new Error(lastError?.message || 'All Gemini models failed to process document.');
}
