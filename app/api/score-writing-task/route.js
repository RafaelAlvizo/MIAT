import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";

// DeepSeek client
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

/* -------------------------------------------------------
   SAFE JSON PARSER — NEVER CRASHES
-------------------------------------------------------- */
function safeParseJSON(text) {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (!match) return { error: "NO_JSON", raw: cleaned };

    return JSON.parse(match[0]);
  } catch (e) {
    return { error: "PARSE_ERROR", raw: text };
  }
}

/* -------------------------------------------------------
   CEFR-LIKE MAPPING (Your 1.1 → 10.10 scale)
-------------------------------------------------------- */
function mapToLevel(overall) {
  if (overall <= 2) return "1.1";
  if (overall <= 3) return "2.1";
  if (overall <= 4) return "3.1";
  if (overall <= 5) return "4.1";
  if (overall <= 6) return "5.1";
  if (overall <= 7) return "6.1";
  if (overall <= 8) return "7.1";
  if (overall <= 9) return "8.1";
  return "10.10";
}

/* -------------------------------------------------------
   API ROUTE — POST ONLY
-------------------------------------------------------- */
export async function POST(req) {
  try {
    const { taskType, content } = await req.json();

    if (!taskType || !content) {
      return Response.json(
        { error: "Missing taskType or content" },
        { status: 400 }
      );
    }

    if (taskType === "scr") return Response.json(await scoreSCR(content));
    if (taskType === "paragraph") return Response.json(await scoreParagraph(content));
    if (taskType === "essay") return Response.json(await scoreEssayCJ(content));

    return Response.json({ error: "Invalid taskType" }, { status: 400 });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

/* -------------------------------------------------------
   SHORT CONSTRUCTED RESPONSE (SCR)
-------------------------------------------------------- */
async function scoreSCR(text) {
  const prompt = `
You are an English writing examiner.

Score the student's short answer STRICTLY using this rubric:

{
  "grammar": 0–10,
  "clarity": 0–10,
  "coherence": 0–10,
  "completion": 0–10,
  "overall": 0–10
}

Rules:
- Be strict.
- Base the score ONLY on the student's writing.
- Return ONLY pure JSON. No comments.

Student Response:
"""${text}"""
`;

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return ONLY valid JSON." },
      { role: "user", content: prompt }
    ]
  });

  const result = safeParseJSON(response.choices[0].message.content);

  return {
    ...result,
    level: mapToLevel(result.overall ?? 0)
  };
}

/* -------------------------------------------------------
   PARAGRAPH SCORING
-------------------------------------------------------- */
async function scoreParagraph(text) {
  const prompt = `
You are an English examiner. Score this paragraph using:

{
  "organization": 0–10,
  "coherence": 0–10,
  "grammar": 0–10,
  "vocabulary": 0–10,
  "clarity": 0–10,
  "style": 0–10,
  "overall": 0–10
}

Rules:
- Be strict.
- Only evaluate what is written.
- Return ONLY JSON.

Paragraph:
"""${text}"""
`;

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return ONLY valid JSON." },
      { role: "user", content: prompt }
    ]
  });

  const result = safeParseJSON(response.choices[0].message.content);

  return {
    ...result,
    level: mapToLevel(result.overall ?? 0)
  };
}

/* -------------------------------------------------------
   ESSAY SCORING USING COMPARATIVE JUDGMENT (CJ)
-------------------------------------------------------- */
async function scoreEssayCJ(userEssay) {
  const anchor6 = await fs.readFile(path.join(process.cwd(), "data/anchors/anchor_6.txt"), "utf8");
  const anchor8 = await fs.readFile(path.join(process.cwd(), "data/anchors/anchor_8.txt"), "utf8");

  const pairs = [
    { level: 6, essay: anchor6 },
    { level: 8, essay: anchor8 }
  ];

  let wins = 0;

  for (const anchor of pairs) {
    const prompt = `
You are an examiner performing a comparative judgment.

Choose which essay is better:

Return ONLY:
"A"  (student is better)
"B"  (anchor essay is better)

Essay A (Student):
${userEssay}

Essay B (Anchor – Level ${anchor.level}):
${anchor.essay}
`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "Return ONLY 'A' or 'B'." },
        { role: "user", content: prompt }
      ]
    });

    const judgement = response.choices[0].message.content.trim();

    if (judgement === "A") wins++;
  }

  // Very simple band scale:
  const estimatedBand = wins === 0 ? 6 : wins === 1 ? 7 : 9;

  return {
    wins,
    estimatedBand,
    level: mapToLevel(estimatedBand)
  };
}
