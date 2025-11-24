export async function POST(req) {
  try {
    const { scr, paragraph, essay } = await req.json();

    if (!scr || !paragraph || !essay) {
      return Response.json(
        { error: "Missing task results" },
        { status: 400 }
      );
    }

    // Weighted average:
    // SCR = 25%, Paragraph = 35%, Essay = 40%
    const scrAvg = average(Object.values(scr));
    const paraAvg = average(Object.values(paragraph));
    const essayBand = essay.estimatedBand * 10; // convert 5/7/9 into 50/70/90 for alignment

    const finalScore =
      scrAvg * 0.25 +
      paraAvg * 0.35 +
      essayBand * 0.40;

    const level = mapToCEFR(finalScore);

    return Response.json({
      finalScore,
      level
    });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// CUSTOM LEVEL LADDER: 1.1 to 10.10
function mapToCEFR(score) {
  if (score < 20) return "1.1";
  if (score < 30) return "2.3";
  if (score < 40) return "3.5";
  if (score < 50) return "4.6";
  if (score < 60) return "5.7";
  if (score < 70) return "6.8";
  if (score < 80) return "7.9";
  if (score < 90) return "8.4";
  if (score < 95) return "9.7";
  return "10.10";
}
