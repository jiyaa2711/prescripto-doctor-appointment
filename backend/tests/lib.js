// Tiny test helpers (no test framework needed): an API client and a PASS/FAIL counter.
const createSuite = (title) => {
    let pass = 0, fail = 0;
    console.log(`\n=== ${title} ===`);
    return {
        check(label, condition, details = "") {
            condition ? pass++ : fail++;
            console.log(`${condition ? "PASS" : "FAIL"}  ${label}${condition ? "" : "  " + JSON.stringify(details).slice(0, 400)}`);
        },
        result: () => ({ title, pass, fail })
    };
};

const createClient = (baseUrl) => async (method, path, body, token) => {
    const res = await fetch(`${baseUrl}/api${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
};

const login = async (call, email, password) => (await call("POST", "/auth/login", { email, password })).body.token;

// next date (from tomorrow) that falls on one of the given weekdays, as YYYY-MM-DD
const nextWorkingDate = (days) => {
    const d = new Date();
    for (let i = 1; i < 14; i++) {
        d.setDate(d.getDate() + 1);
        if (days.includes(d.getDay())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
    }
};

module.exports = { createSuite, createClient, login, nextWorkingDate };
