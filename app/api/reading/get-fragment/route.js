import { promises as fs } from "fs";
import path from "path";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const band = searchParams.get("band");
    const index = searchParams.get("index");

    if (!band || !index) {
      return Response.json({ error: "Missing band or index" }, { status: 400 });
    }

    // Absolute path inside Vercel's filesystem
    const filePath = path.join(process.cwd(), "app", "data", "reading_fragments.json");

    // Read and parse JSON
    const fileContent = await fs.readFile(filePath, "utf8");
    const passages = JSON.parse(fileContent);

    const key = `${band}.${index}`;
    const fragment = passages[key];

    if (!fragment) {
      return Response.json({ error: "Fragment not found" }, { status: 404 });
    }

    return Response.json(fragment);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
