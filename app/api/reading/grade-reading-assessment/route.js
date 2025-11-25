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
    const { tasks } = await req.json();

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return Response.json(
        { error: "Missing tasks array" },
        { status: 400 }
      );
    }

    const scoringPrompt = `
You are an English reading comprehension examiner.

You will receive a list of reading tasks with:
- band (1–5)
- text (the passage)
- question
- taskType ("mcq" | "tf" | "short")
- options (for mcq)
- correctAnswer
- userAnswer

Your job:
1) For each task, decide if the user's answer is correct.
2) For MCQ/TF, correctness is objective.
3) For "short", use semantic similarity: if meaning matches the correct answer, mark as correct.
4) Assign each task a score 0–100.
5) Compute overall reading score (0–100).
6) Estimate the student's reading level on a 1.1–10.10 scale using performance AND bands:
   - Band 1 → ~1.1–2.10
   - Band 2 → ~3.1–4.10
   - Band 3 → ~5.1–6.10
   - Band 4 → ~7.1–8.10
   - Band 5 → ~9.1–10.10

Return STRICT JSON ONLY:

{
  "tasks": [
    {
      "index": number,
      "band": number,
      "isCorrect": boolean,
      "score": number,
      "feedback": "short comment"
    }
  ],
  "overallScore": number,
  "estimatedLevel": number,
  "summary": "short global feedback"
}

Tasks:
${JSON.stringify(tasks, null, 2)}
`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return ONLY valid JSON in the required schema." },
        { role: "user", content: scoringPrompt }
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
