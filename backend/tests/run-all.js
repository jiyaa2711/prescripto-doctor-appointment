// Runs every API test against a SEPARATE test database, so your real data is never touched.
//   npm test             -> core + admin + AI (mock AI and "AI down") tests
//   npm test -- --live   -> also runs the live Gemini test (needs AI_API_KEY, uses a little quota)
//
// It starts its own servers on ports 5100-5102 (+ a mock Gemini on 5199) and stops them afterwards.
require("dotenv").config({ quiet: true, path: require("path").join(__dirname, "..", ".env") });

const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { startMockGemini } = require("./mock-gemini");

const BACKEND_DIR = path.join(__dirname, "..");
const TEST_DB = process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/doctor_booking_test";
const MOCK_KEY = "test-key";
const LIVE = process.argv.includes("--live");

// Start a backend server with extra environment variables; resolves when it is listening
const startServer = (port, env) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server.js"], {
        cwd: BACKEND_DIR,
        env: { ...process.env, PORT: String(port), MONGODB_URI: TEST_DB, ...env }
    });
    let log = "";
    const onData = (data) => {
        log += data;
        if (log.includes(`Server running on port ${port}`)) resolve({ child, getLog: () => log });
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => reject(new Error(`server on ${port} exited (${code}):\n${log}`)));
});

(async () => {
    console.log(`Test database: ${TEST_DB}`);
    // Fresh demo data in the TEST database
    const seed = spawnSync(process.execPath, ["seed/seed.js", "--reset", "--demo-appointments"], {
        cwd: BACKEND_DIR, env: { ...process.env, MONGODB_URI: TEST_DB }, encoding: "utf8"
    });
    if (seed.status !== 0) throw new Error(`seeding failed:\n${seed.stdout}${seed.stderr}`);

    const mock = await startMockGemini(5199, MOCK_KEY);
    const servers = {
        noKey: await startServer(5100, { AI_API_KEY: "", AI_RATE_LIMIT_PER_MINUTE: "10" }),
        mockAi: await startServer(5101, { AI_API_KEY: MOCK_KEY, AI_API_BASE_URL: "http://localhost:5199", AI_TIMEOUT_MS: "2000", AI_RATE_LIMIT_PER_MINUTE: "1000" })
    };
    if (LIVE) servers.live = await startServer(5102, { AI_RATE_LIMIT_PER_MINUTE: "1000" });

    const results = [];
    try {
        // admin first: it expects the exact freshly-seeded numbers
        results.push(await require("./admin.test")({ baseUrl: "http://localhost:5100" }));
        results.push(await require("./ai.test")({
            mockAiUrl: "http://localhost:5101", noKeyUrl: "http://localhost:5100",
            getLastAiRequest: mock.getLastRequest, mockApiKey: MOCK_KEY
        }));
        results.push(await require("./core.test")({ baseUrl: "http://localhost:5101" }));
        if (LIVE) results.push(await require("./ai-live.test")({ liveAiUrl: "http://localhost:5102" }));
    } finally {
        Object.values(servers).forEach((s) => s.child.kill());
        mock.server.close();
    }

    // Server logs: anything other than startup lines and expected "AI unavailable" warnings is suspicious
    const unexpected = Object.entries(servers).flatMap(([name, s]) => s.getLog().split("\n")
        .filter((line) => line.trim() && !/MongoDB connected|Server running|\[AI (doctor-finder|insights)\] unavailable/.test(line))
        .map((line) => `[${name}] ${line}`));

    console.log("\n=== Summary ===");
    results.forEach((r) => console.log(`${r.fail ? "FAIL" : "PASS"}  ${r.title}: ${r.pass} passed, ${r.fail} failed`));
    console.log(unexpected.length ? `Unexpected server log lines:\n${unexpected.join("\n")}` : "Server logs: no errors");
    const failed = results.reduce((n, r) => n + r.fail, 0) + unexpected.length;
    process.exit(failed ? 1 : 0);
})().catch((err) => {
    console.error("Test run failed:", err.message);
    process.exit(1);
});
