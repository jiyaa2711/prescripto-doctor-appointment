// Admin "AI Insights": the AI writes a short summary of ALREADY-AGGREGATED numbers.
// Only counts are sent - no names, emails, phone numbers or individual appointments.
const { generateJson } = require("./aiService");

const SYSTEM_PROMPT = `
You are an analytics assistant for the admin of a doctor appointment booking website.
You receive aggregated, anonymous appointment statistics as JSON.
Write a short, factual summary for the admin:
- "summary": 2-3 sentences about overall appointment volume and status mix.
- "highlights": 2-4 short bullet points (max 120 characters each) about popular specialties,
  cancellation rate and the booking trend over the last 14 days.
Only use numbers that are present in the data (you may compute simple percentages). Do not invent data,
do not speculate about individual patients, and do not give medical advice.
`.trim();

const SCHEMA = {
    type: "OBJECT",
    properties: {
        summary: { type: "STRING" },
        highlights: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["summary", "highlights"]
};

// stats = output of buildAppointmentStats() + doctor/patient totals (numbers only)
const generateInsights = async (stats) => {
    const answer = await generateJson({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Statistics:\n${JSON.stringify(stats)}`,
        schema: SCHEMA,
        temperature: 0.3
    });

    return {
        summary: String(answer.summary || "").slice(0, 600),
        highlights: (Array.isArray(answer.highlights) ? answer.highlights : [])
            .filter((h) => typeof h === "string" && h.trim())
            .slice(0, 4)
            .map((h) => h.trim().slice(0, 160))
    };
};

module.exports = { generateInsights };
