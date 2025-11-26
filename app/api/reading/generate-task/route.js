import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

/* Safe JSON parsing */
function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return { error: "JSON_PARSE_ERROR", raw: text };
  }
}

/* Compute next band based on correctness */
function computeNextBand(prevBand, prevCorrect) {
  let band = Number(prevBand);

  if (!band || band < 1) band = 1;

  // Severe nonsense → drop to 1
  if (prevCorrect === "nonsense") return 1;

  // Correct → go up one band
  if (prevCorrect === true) {
    if (band < 10) band += 1;
    return band;
  }

  // Wrong → go down one band
  if (prevCorrect === false) {
    if (band > 1) band -= 1;
    return band;
  }

  // First task (prevCorrect undefined)
  return band;
}

export async function POST(req) {
  try {
    const { previousBand, previousCorrect, index = 1 } = await req.json();

    /** Compute next band based on scoring */
    const band = computeNextBand(previousBand, previousCorrect);

    /** --- PROMPT --- */

    const prompt = `
You are an advanced reading assessment generator for CEFR-like bands 1–10.

Generate ONE reading comprehension task for:

Band: ${band}
Item Index: ${index}

Return STRICT JSON ONLY in this exact structure:

{
  "band": ${band},
  "index": ${index},
  "text": "passage text here (must follow band difficulty)",
  "taskType": "mcq" | "tf" | "short",
  "question": "string",
  "options": ["A","B","C","D"] or null,
  "correctAnswer": "string"
}

BAND DIFFICULTY INSTRUCTIONS:
1–2: 20–60 words. Literal meaning. No inference.
3–4: 80–150 words. Main idea + detail. Basic inference.
5–6: 150–220 words. Multi-sentence logic, tone, intention.
7–8: 180–260 words. Multi-paragraph mini-texts. Attitude, implication.
9–10: 220–300 words. Analytical, abstract, academic-like reasoning.

RULES:
- "text" MUST be fully self-contained.
- "taskType":
  - For MCQ: MUST include exactly 4 distinct options.
  - For TF: "correctAnswer" must be "True" or "False".
  - For short: Answer must be a 1–2 sentence reference answer.
- No mention of bands, instructions, or meta-comments inside the JSON.
- DO NOT add explanations.
- Output ONLY valid JSON.
    `;

    /** ---- CALL DEEPSEEK ---- */
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return ONLY valid JSON. No markdown. No comments." },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = safeParseJSON(content);

    return Response.json(
      {
        nextBand: band,
        task: parsed
      },
      { status: 200 }
    );

  } catch (err) {
    return Response.json(
      { error: "GENERATION_FAILED", details: err.message },
      { status: 500 }
    );
  }
}
