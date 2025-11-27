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
You are an English listening comprehension examiner.

Each task includes:
- band (1–10)
- transcript
- question
- taskType
- options
- correctAnswer
- userAnswer

The student heard the audio. The transcript is only for your scoring.

Rules:
- For MCQ and best_response: exact correctness
- For short answers: semantic similarity
- Difficulty weights:
  Bands 1–2 = 1
  Bands 3–4 = 2
  Bands 5–7 = 3
  Bands 8–9 = 4
  Band 10   = 5

Compute:
scoreContribution = weight * (correct?1:0)
weightedScore = sum(scoreContribution)
maxWeightedScore = sum(weights)
performanceIndex = weightedScore / maxWeightedScore
overallScore = performanceIndex * 100
estimatedLevel = 1.1 + performanceIndex * (10.10 - 1.1)

Round estimatedLevel to one decimal.

Return JSON ONLY:
{
  "tasks": [
    { "index": number, "band": number, "isCorrect": boolean, "scoreContribution": number, "feedback": "short"}
  ],
  "overallScore": number,
  "estimatedLevel": number,
  "summary": "short"
}

Tasks:
${JSON.stringify(tasks, null, 2)}
`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: scoringPrompt }
      ]
    });

    const parsed = safeParseJSON(response.choices[0].message.content);
    return Response.json(parsed, { status: 200 });

  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
