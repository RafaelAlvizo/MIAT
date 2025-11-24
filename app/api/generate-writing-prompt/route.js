import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

export async function POST(req) {
  try {
    const { taskType } = await req.json();

    if (!taskType) {
      return Response.json({ error: "Missing taskType" }, { status: 400 });
    }

    const prompt = `
You are a writing prompt generator.
Generate ONE simple, universal writing prompt for this task type:

Task type: ${taskType}

Rules:
- DO NOT make prompts academic.
- DO NOT include specialized or advanced topics.
- DO NOT include complex instructions.
- Keep prompts simple and accessible for all English levels.
- Output STRICT JSON:

{
  "prompt": "string",
  "taskType": "${taskType}"
}

Prompt examples:

SCR (1–3 sentences):
- "Describe a time you solved a difficult problem."
- "Summarize this paragraph in one sentence."
- "Rewrite this sentence to make it more formal."

PARAGRAPH (100–150 words):
- "Describe a daily routine you have and why it matters."
- "Explain a challenge you overcame."

ESSAY (250–350 words):
- "Do you think technology helps people connect? Explain."
- "Should students have homework? Give reasons."

Return only JSON.
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
