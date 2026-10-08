// AI service layer - the ONLY file that talks to the AI provider (Google Gemini).
// It knows nothing about doctors or appointments: it sends a prompt, asks for JSON that
// matches a schema, and returns the parsed object. Any failure becomes an AIUnavailableError,
// so callers can fall back gracefully and the rest of the app keeps working.

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

class AIUnavailableError extends Error {
    constructor(reason) {
        super("AI assistance is temporarily unavailable");
        this.reason = reason; // internal detail for server logs only - never sent to the client
    }
}

const isConfigured = () => Boolean(process.env.AI_API_KEY);

/**
 * Ask the AI for a JSON object.
 * @param {object} options
 * @param {string} options.systemPrompt  rules for the AI
 * @param {string} options.userPrompt    the actual request
 * @param {object} options.schema        Gemini response schema (OpenAPI-style) the answer must follow
 * @returns {Promise<object>} the parsed JSON answer
 */
const generateJson = async ({ systemPrompt, userPrompt, schema, temperature = 0.2, maxOutputTokens = 512 }) => {
    if (!isConfigured()) throw new AIUnavailableError("AI_API_KEY is not set");

    const model = process.env.AI_MODEL || DEFAULT_MODEL;
    const baseUrl = process.env.AI_API_BASE_URL || DEFAULT_BASE_URL; // override only used for testing
    const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 15000;

    let response;
    try {
        response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": process.env.AI_API_KEY // key stays on the server
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: {
                    temperature,
                    maxOutputTokens,
                    // Structured output: Gemini must answer with JSON matching this schema
                    responseMimeType: "application/json",
                    responseSchema: schema
                }
            }),
            signal: AbortSignal.timeout(timeoutMs)
        });
    } catch (err) {
        const reason = err.name === "TimeoutError" ? `timed out after ${timeoutMs}ms` : `network error: ${err.message}`;
        throw new AIUnavailableError(reason);
    }

    if (!response.ok) {
        // e.g. 400 bad request, 401/403 invalid key, 429 quota exceeded, 5xx provider outage
        throw new AIUnavailableError(`provider returned HTTP ${response.status}`);
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new AIUnavailableError("provider returned invalid JSON");
    }

    if (data.promptFeedback?.blockReason) {
        throw new AIUnavailableError(`prompt blocked: ${data.promptFeedback.blockReason}`);
    }
    const candidate = data.candidates?.[0];
    // Ignore any "thought" parts - only the final answer text is used
    const text = (candidate?.content?.parts || [])
        .filter((part) => !part.thought && typeof part.text === "string")
        .map((part) => part.text)
        .join("");
    if (!text) throw new AIUnavailableError(`empty answer (finishReason: ${candidate?.finishReason || "none"})`);

    try {
        return JSON.parse(text);
    } catch {
        throw new AIUnavailableError("answer was not valid JSON");
    }
};

module.exports = { generateJson, isConfigured, AIUnavailableError };
