import listeningFragments from "../../../data/listening_fragments.json";

export async function POST(req) {
  try {
    const { band, index } = await req.json();

    if (!band) {
      return Response.json(
        { error: "Missing band (1.1–10.10)" },
        { status: 400 }
      );
    }

    const key = String(band);
    const items = listeningFragments[key];

    if (!items || items.length === 0) {
      return Response.json(
        { error: `No listening tasks found for band ${key}` },
        { status: 404 }
      );
    }

    // If index provided and valid → use it; otherwise random
    const chosenIndex =
      typeof index === "number" && index >= 0 && index < items.length
        ? index
        : Math.floor(Math.random() * items.length);

    const raw = items[chosenIndex];

    const normalizedTask = {
      id: raw.id,
      band: raw.band,
      audioUrl: raw.audio,          // "/audio/listening/1.1.mp3"
      transcript: raw.transcript,   // backend uses for scoring only
      question: raw.question,
      taskType: "mcq",              // unified format for frontend
      options: raw.options || [],
      correctAnswer: raw.answer
    };

    return Response.json(normalizedTask, { status: 200 });
  } catch (err) {
    console.error("Error in /api/listening/get-task:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
