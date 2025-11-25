import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: "JSON_PARSE_ERROR", raw: text };
  }
}

export async function POST(req) {
  try {
    const { band, index = 1 } = await req.json();

    if (!band) {
      return Response.json(
        { error: "Missing band (1–5)" },
        { status: 400 }
      );
    }

    const prompt = `
You are a reading assessment item generator.

Generate ONE reading task for band ${band}, item ${index}.

Return STRICT JSON ONLY in this format:

{
  "band": ${band},
  "index": ${index},
  "text": "passage text",
  "question": "question text",
  "taskType": "mcq" | "tf" | "short",
  "options": ["A", "B", "C", "D"] or null,
  "correctAnswer": "string"
}

Band definitions:
1: Very simple, 1–2 sentences (20–40 words), literal questions, no inference.
2: 1–3 simple sentences, literal + basic relationship (time, cause).
3: 80–150 word paragraph, main idea + details, simple inference.
4: 150–250 words, 2–3 paragraphs, inference, tone.
5: 200–300 words, more analytical, attitude/opinion, inference.

Rules:
- text must be self-contained and simple (no external references).
- For "mcq": provide exactly 4 options, one clearly correct.
- For "tf": question must be answerable True/False.
- For "short": question expects a short free-text answer (1–2 sentences) based on the passage.
- "correctAnswer" must match the real answer exactly or be a good reference answer for "short".
- DO NOT include explanations, only the JSON.
`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return ONLY valid JSON as described." },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = safeParseJSON(content);

    return Response.json(parsed, { status: 200 });
  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
