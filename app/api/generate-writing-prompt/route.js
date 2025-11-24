import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

export async function POST(req) {
  try {
    const { taskType } = await req.json();

    if (!taskType) {
      return Response.json(
        { error: "Missing taskType" },
        { status: 400 }
      );
    }

    const basePrompt = {
      scr: `
Generate ONE short writing prompt (SCR).
Rules:
- 1–3 sentence response expected
- simple, universal, NOT level-based
- must NOT exceed 20 words
- examples:
  • "Describe a time you helped someone."
  • "Rewrite this sentence to sound more formal: 'I wanna go.'"
  • "Summarize this paragraph in one sentence."
Return JSON: { "prompt": "..." }`,
      
      paragraph: `
Generate ONE paragraph-writing prompt.
Rules:
- Response should be 100–150 words
- universal difficulty
- examples:
  • "Explain a scientific idea to a 10-year-old."
  • "Do you think cities should ban cars downtown? Explain."
Return JSON: { "prompt": "..." }`,

      essay: `
Generate ONE full essay-writing prompt.
Rules:
- Response should be 250–350 words
- universal difficulty
- examples:
  • "Does technology connect us or isolate us? Argue your position."
  • "Should school uniforms be mandatory? Explain with reasons."
Return JSON: { "prompt": "..." }`
    };

    if (!basePrompt[taskType]) {
      return Response.json({ error: "Invalid taskType" }, { status: 400 });
    }

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: basePrompt[taskType] }
      ]
    });

    return Response.json(JSON.parse(response.choices[0].message.content));

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
