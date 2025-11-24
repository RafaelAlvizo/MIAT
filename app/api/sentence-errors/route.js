import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text) {
      return Response.json({ error: "Missing text" }, { status: 400 });
    }

    const prompt = `
You are an English grammar and writing expert.

Analyze the student's writing and produce sentence-level corrections.

Return STRICT JSON:

{
  "sentences": [
    {
      "original": "string",
      "corrected": "string",
      "errors": ["list of errors"],
      "severity": "low | medium | high"
    }
  ],
  "summary": {
    "totalErrors": number,
    "mainIssues": ["list of dominant problems"]
  }
}

Student writing:
"""${text}"""

Return ONLY valid JSON.
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
