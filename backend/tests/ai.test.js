// AI Doctor Finder + AI insights, tested against the MOCK Gemini server and a server with NO AI key.
const { createSuite, createClient, login } = require("./lib");

module.exports = async ({ mockAiUrl, noKeyUrl, getLastAiRequest, mockApiKey }) => {
    const { check, result } = createSuite("AI Doctor Finder (mock AI + AI-down server)");
    const mock = createClient(mockAiUrl);
    const noKey = createClient(noKeyUrl);
    const find = (call, message) => call("POST", "/ai/doctor-finder", { message });

    // ---- input validation ----
    check("empty message -> 400", (await find(mock, "")).status === 400);
    check("too long message -> 400", (await find(mock, "x".repeat(501))).status === 400);
    check("object instead of string -> 400", (await mock("POST", "/ai/doctor-finder", { message: { $ne: 1 } })).status === 400);

    // ---- the 5 required inputs ----
    const dbDoctors = (await mock("GET", "/doctors")).body.doctors;
    const dbIds = new Set(dbDoctors.map((d) => d._id));
    const cases = [
        ["I have acne and skin irritation.", "Dermatologist", false],
        ["I have chest pain.", "Cardiologist", true],
        ["I need a doctor for my child.", "Pediatrician", false],
        ["I have knee pain.", "Orthopedic", false],
        ["I have fever and weakness.", "General Physician", false]
    ];
    for (const [message, expected, urgent] of cases) {
        const { status, body: b } = await find(mock, message);
        check(`"${message}" -> ${b.specialty}, urgent=${b.needsUrgentCare}`, status === 200 && b.aiAvailable && b.specialty === expected && b.needsUrgentCare === urgent, b);
        check("   doctors are real MongoDB records of that specialty", b.doctors.length > 0 && b.doctors.every((d) => dbIds.has(d._id) && d.specialty === expected), b.doctors);
        check("   disclaimer + cautious wording, no private doctor fields", b.disclaimer && /may be an appropriate starting point/.test(b.message) && b.doctors.every((d) => !d.email && !d.user), b);
    }

    // ---- what the backend sent to the AI ----
    const sent = getLastAiRequest();
    const enumSent = [...sent.body.generationConfig.responseSchema.properties.specialty.enum].sort();
    const dbSpecialties = [...new Set(dbDoctors.map((d) => d.specialty))].sort();
    check("AI may only choose specialties that exist in MongoDB", JSON.stringify(enumSent) === JSON.stringify(dbSpecialties), enumSent);
    check("structured JSON output is requested", sent.body.generationConfig.responseMimeType === "application/json");
    check("API key only in a header (not in URL or body)", sent.headers["x-goog-api-key"] === mockApiKey && !sent.url.includes(mockApiKey) && !JSON.stringify(sent.body).includes(mockApiKey));
    check("system prompt forbids diagnosis", /never diagnose/i.test(sent.body.systemInstruction.parts[0].text));
    check("model taken from AI_MODEL", sent.url.includes(process.env.AI_MODEL || "gemini-3.5-flash-lite"), sent.url);

    // ---- AI misbehaving ----
    let r = await find(mock, "mockinvented something");
    check("invented specialty replaced (General Physician, confidence low)", r.body.specialty === "General Physician" && r.body.confidence === "low", r.body);
    r = await find(mock, "mockunsafe rash");
    check("diagnosis/dosage in AI reason replaced by neutral text", !/eczema|200mg/i.test(r.body.reason) && r.body.reason.includes("Dermatologist"), r.body.reason);
    r = await find(mock, "write me a poem about cats");
    check("non-health message -> no doctors, polite message", r.body.specialty === null && r.body.doctors.length === 0 && r.body.aiAvailable, r.body);
    r = await find(mock, "skin rash");
    check("AI 'thought' parts are ignored", r.body.specialty === "Dermatologist", r.body);

    // ---- AI failures -> graceful fallback ----
    for (const [label, message] of [["timeout", "mocktimeout headache"], ["HTTP 500", "mock500 headache"], ["invalid JSON", "mockbadjson headache"], ["safety block", "mockblocked headache"]]) {
        const started = Date.now();
        r = await find(mock, message);
        check(`AI ${label} -> 200 with aiAvailable:false (${Date.now() - started} ms)`,
            r.status === 200 && r.body.aiAvailable === false && /temporarily unavailable/.test(r.body.message) && r.body.doctors.length === 0, r.body);
    }
    r = await find(noKey, "I have acne");
    check("no AI key configured -> graceful fallback", r.status === 200 && r.body.aiAvailable === false, r.body);
    r = await find(noKey, "I have chest pain and can't breathe");
    check("emergency advice shown even when AI is down", r.body.needsUrgentCare === true && Boolean(r.body.urgentMessage), r.body);
    r = await find(noKey, "I have food poisoning");
    check("'food poisoning' is not treated as an emergency", r.body.needsUrgentCare === false, r.body);
    r = await noKey("GET", "/doctors?specialty=Dermatologist");
    check("normal doctor search works while AI is down", r.status === 200 && r.body.count > 0, r.body);
    check("responses contain no secrets or stack traces", !JSON.stringify(r.body).match(/stack|AI_API_KEY/));

    // ---- admin AI insights ----
    const admin = await login(mock, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    const patient = await login(mock, "aarav.shah@patient.test", process.env.SEED_PATIENT_PASSWORD);
    check("patient cannot use AI insights -> 403", (await mock("POST", "/admin/ai-insights", null, patient)).status === 403);
    r = await mock("POST", "/admin/ai-insights", null, admin);
    check("admin AI insights works (highlights capped at 4)", r.body.aiAvailable && r.body.insights.summary && r.body.insights.highlights.length === 4, r.body);
    const statsSent = getLastAiRequest().body.contents[0].parts[0].text;
    check("insights prompt contains no personal data", !/@|patient\.test|Aarav|Priya|9000000/i.test(statsSent), statsSent.slice(0, 300));
    r = await noKey("POST", "/admin/ai-insights", null, admin);
    check("insights without AI -> graceful message", r.status === 200 && r.body.aiAvailable === false, r.body);

    // ---- rate limit (no-key server runs with the default 10 requests/minute) ----
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await find(noKey, "I have a headache")).status);
    check("rate limit returns 429 after 10 requests/minute", statuses.includes(429) && statuses.filter((s) => s === 200).length <= 10, statuses);
    r = await find(noKey, "I have a headache");
    check("429 has a friendly JSON message", r.status === 429 && Boolean(r.body.message), r.body);

    return result();
};
