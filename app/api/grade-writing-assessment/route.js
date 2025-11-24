import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

// Utility for safe JSON parsing
function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: "JSON_PARSE_FAILED", raw: text };
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      scrResponses = [],
      paragraphResponse = "",
      essayResponse = "",
      scrPrompts = [],
      paragraphPrompt = "",
      essayPrompt = ""
    } = body;

    // Validate payload
    if (
      scrResponses.length !== 3 ||
      scrPrompts.length !== 3 ||
      !paragraphResponse ||
      !essayResponse
    ) {
      return Response.json(
        { error: "Missing or invalid responses" },
        { status: 400 }
      );
    }

    const scoringPrompt = `
You are an expert English writing examiner.

A student completed a 5-task writing assessment:
- 3 Short Constructed Responses (SCR)
- 1 Paragraph
- 1 Essay

You must evaluate all tasks and return STRICT JSON ONLY.

========================
STUDENT ANSWERS
========================
SCR 1 Prompt: ${scrPrompts[0]}
SCR 1 Response: ${scrResponses[0]}

SCR 2 Prompt: ${scrPrompts[1]}
SCR 2 Response: ${scrResponses[1]}

SCR 3 Prompt: ${scrPrompts[2]}
SCR 3 Response: ${scrResponses[2]}

Paragraph Prompt: ${paragraphPrompt}
Paragraph Response: ${paragraphResponse}

Essay Prompt: ${essayPrompt}
Essay Response: ${essayResponse}

========================
SCORING INSTRUCTIONS
========================
Score each section using a 0–100 scale.

For SCR (short responses), score:
- grammar
- clarity
- coherence
- task completion
AND compute an overall SCR score.

For the Paragraph, score:
- organization
- coherence
- grammar
- vocabulary
- clarity
AND compute an overall paragraph score.

For the Essay, score:
- argumentation
- evidence
- structure
- style & tone
- grammar
AND compute an overall essay score.

========================
FINAL WRITING LEVEL (1.1 – 10.10)
========================
Determine the final level using ALL answers combined.

Level rules:
- 1.0–3.0  → Beginner (A1–A2)
- 3.1–5.5  → Intermediate (B1)
- 5.6–7.9  → Upper-Intermediate (B2)
- 8.0–9.4  → Advanced (C1)
- 9.5–10.10→ Expert (C2)

Compute finalLevel using an average of:
SCR overall average + Paragraph score + Essay score.
Scale it into 1.1–10.10.

========================
RETURN STRICT JSON:
{
  "scr": {
    "scores": [ { "grammar": number, "clarity": number, "coherence": number, "completion": number, "overall": number }, ... ],
    "average": number
  },
  "paragraph": { "overall": number },
  "essay": { "overall": number },
  "finalLevel": number,
  "summary": "Short explanation of the student's writing ability"
}
ONLY return JSON. No text outside JSON.
`;

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: scoringPrompt }
      ]
    });

    const resultText = response.choices[0].message.content;
    const parsed = safeParseJSON(resultText);

    return Response.json(parsed, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
