import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

export async function POST(req) {
  try {
    const { taskType, level } = await req.json();

    if (!taskType || !level) {
      return Response.json(
        { error: "Missing taskType or level" },
        { status: 400 }
      );
    }

    const prompt = `
You are a Writing Task Generator for an English assessment platform.

Generate ONE writing prompt for:

Task type: ${taskType}
Difficulty (1.1–10.10): ${level}

Rules:
- The prompt must match the difficulty level.
- Output STRICT JSON with:
{
  "prompt": "string",
  "taskType": "${taskType}",
  "level": "${level}"
}

Task definitions:
SCR → 1–3 sentences (micro-task)
PARAGRAPH → 100–150 words
ESSAY → 250–350 words

Only return JSON.
`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: prompt }
      ]
    });

    return Response.json(JSON.parse(response.choices[0].message.content));

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
