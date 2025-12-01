import { promises as fs } from "fs";
import path from "path";

export async function POST(req) {
  try {
    const { tier } = await req.json();

    if (!tier) {
      return Response.json(
        { error: "Missing 'tier'. Use A, B, or C." },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "data", "writing_prompts.json");
    const fileData = await fs.readFile(filePath, "utf8");
    const prompts = JSON.parse(fileData);

    if (!prompts[tier]) {
      return Response.json(
        { error: "Invalid tier. Use A, B, or C." },
        { status: 404 }
      );
    }

    // get random prompt
    const list = prompts[tier];
    const prompt = list[Math.floor(Math.random() * list.length)];

    return Response.json({
      prompt,
      tier
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
