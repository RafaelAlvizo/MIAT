import { promises as fs } from "fs";
import path from "path";

export async function POST(req) {
  try {
    // CORRECT PATH for Vercel: /var/task/app/data/writing_prompts.json
    const filePath = path.join(process.cwd(), "app", "data", "writing_prompts.json");

    const fileData = await fs.readFile(filePath, "utf8");
    const prompts = JSON.parse(fileData);

    const allPrompts = [
      ...prompts.A,
      ...prompts.B,
      ...prompts.C
    ];

    const prompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];

    return Response.json({ prompt });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
