import { promises as fs } from "fs";
import path from "path";

export async function POST(req) {
  try {
    const filePath = path.join(process.cwd(), "data", "writing_prompts.json");
    const fileData = await fs.readFile(filePath, "utf8");
    const prompts = JSON.parse(fileData);

    // Combine all tiers into a single flat list
    const allPrompts = [
      ...prompts.A,
      ...prompts.B,
      ...prompts.C
    ];

    // Randomly select one prompt
    const prompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];

    return Response.json({
      prompt
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
