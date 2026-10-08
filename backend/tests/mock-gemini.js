// Fake Gemini "generateContent" server used ONLY by the automated tests.
// It tests our plumbing (request format, JSON parsing, validation, fallbacks) - not the AI's quality.
// Magic words in the patient text trigger each failure mode.
const http = require("http");

const startMockGemini = (port, apiKey) => {
    let lastRequest = null;

    const reply = (res, status, body) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(typeof body === "string" ? body : JSON.stringify(body));
    };
    const answer = (obj, extraParts = []) => ({
        candidates: [{ content: { parts: [...extraParts, { text: JSON.stringify(obj) }] }, finishReason: "STOP" }]
    });

    const server = http.createServer((req, res) => {
        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", () => {
            const body = JSON.parse(raw || "{}");
            lastRequest = { url: req.url, headers: req.headers, body };
            if (req.headers["x-goog-api-key"] !== apiKey) return reply(res, 403, { error: "bad key" });

            const text = body.contents?.[0]?.parts?.[0]?.text || "";
            const allowed = body.generationConfig?.responseSchema?.properties?.specialty?.enum || [];

            if (text.startsWith("Statistics:")) { // admin insights
                const stats = JSON.parse(text.replace("Statistics:\n", ""));
                return reply(res, 200, answer({ summary: `There are ${stats.totalAppointments} appointments in total.`, highlights: ["h1", "h2", "h3", "h4", "h5"] }));
            }

            const t = text.toLowerCase();
            if (t.includes("mocktimeout")) return setTimeout(() => reply(res, 200, answer({})), 5000);
            if (t.includes("mock500")) return reply(res, 500, { error: "boom" });
            if (t.includes("mockbadjson")) return reply(res, 200, { candidates: [{ content: { parts: [{ text: "not json {" }] } }] });
            if (t.includes("mockblocked")) return reply(res, 200, { promptFeedback: { blockReason: "SAFETY" } });
            if (t.includes("mockinvented")) return reply(res, 200, answer({ isHealthRelated: true, specialty: "Astrologer", confidence: "certain", reason: "Stars.", needsUrgentCare: false }));
            if (t.includes("mockunsafe")) return reply(res, 200, answer({ isHealthRelated: true, specialty: "Dermatologist", confidence: "high", reason: "You have eczema, take 200mg of something.", needsUrgentCare: false }));
            if (t.includes("poem")) return reply(res, 200, answer({ isHealthRelated: false, specialty: allowed[0], confidence: "low", reason: "Not health related.", needsUrgentCare: false }));

            // simple stand-in for the real AI's language understanding
            const map = [
                [/acne|skin/, "Dermatologist", "medium", false],
                [/chest/, "Cardiologist", "medium", true],
                [/child|kid|baby/, "Pediatrician", "medium", false],
                [/knee|joint|back pain/, "Orthopedic", "medium", false]
            ];
            const hit = map.find(([re]) => re.test(t));
            const [, specialty, confidence, urgent] = hit || [null, "General Physician", "low", false];
            reply(res, 200, answer(
                { isHealthRelated: true, specialty, confidence, reason: `The concern you described may relate to what a ${specialty} can help with.`, needsUrgentCare: urgent },
                [{ thought: true, text: "internal reasoning that must be ignored" }]
            ));
        });
    });

    return new Promise((resolve) => server.listen(port, () => resolve({
        server,
        getLastRequest: () => lastRequest
    })));
};

module.exports = { startMockGemini };
