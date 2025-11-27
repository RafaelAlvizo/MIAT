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

You will receive a list of reading tasks. Each task includes:
- band (1–5)
- text
- question
- taskType ("mcq" | "tf" | "short")
- options (for mcq)
- correctAnswer
- userAnswer

Your job:

1) Determine correctness for each task:
   - MCQ/TF: exact match (“A” = “A”).
   - Short answer: evaluate semantic similarity. If meaning matches the correct answer, mark correct.

2) Apply difficulty weighting:
   Each band has a weight equal to its band number:
     - Band 1 = 1
     - Band 2 = 2
     - Band 3 = 3
     - Band 4 = 4
     - Band 5 = 5

3) Score each task:
   scoreContribution = weight * (1 if correct, 0 if wrong)
   Also provide feedback.

4) Compute totals:
   weightedScore = sum of scoreContributions
   maxWeightedScore = sum of all weights
   performanceIndex = weightedScore / maxWeightedScore   // between 0 and 1

5) Convert to final reading level (1.1–10.10 scale):
   estimatedLevel = 1.1 + performanceIndex * (10.10 - 1.1)
   Round to one decimal place.

6) overallScore = performanceIndex * 100 (0–100)

Return STRICT JSON ONLY:

{
  "tasks": [
    {
      "index": number,
      "band": number,
      "isCorrect": boolean,
      "scoreContribution": number,
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
