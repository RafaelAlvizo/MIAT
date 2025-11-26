import passages from "../../data/reading_fragments.json";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const band = searchParams.get("band");
    const index = searchParams.get("index");

    if (!band || !index) {
      return Response.json(
        { error: "Missing band or index" },
        { status: 400 }
      );
    }

    const key = `${band}.${index}`;
    const fragment = passages[key];

    if (!fragment) {
      return Response.json(
        { error: "Fragment not found" },
        { status: 404 }
      );
    }

    return Response.json(fragment);
  } catch (err) {
    return Response.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
