import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

export async function POST(req) {
  try {
    const { taskType, index } = await req.json();

    if (!taskType) {
      return Response.json({ error: "Missing taskType" }, { status: 400 });
    }

    // Default index if not provided
    const n = index || 1;

    const prompt = `
You are a test item generator for writing assessments.

Generate one writing prompt.

Task type: ${taskType}
Item number: ${n}

Rules:
SCR (1–3 sentences):
  - item 1 => personal narrative
  - item 2 => explanation or “rewrite”
  - item 3 => summary or transformation
Paragraph:
  - universal topic, general audience
Essay:
  - argumentative or discussion-type

Return ONLY JSON:
{
  "prompt": "string",
  "taskType": "${taskType}",
  "index": ${n}
}
`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only JSON. No text outside JSON." },
        { role: "user", content: prompt }
      ]
    });

    return Response.json(JSON.parse(response.choices[0].message.content));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
