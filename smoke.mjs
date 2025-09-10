// server/smoke.mjs
// Minimal smoke test that logs in first, then hits the 3 critical endpoints.

const BASE = process.env.API_BASE_URL || "http://localhost:5000";

// Adjust these ONLY if your login path/payload differ.
const LOGIN_PATH = process.env.LOGIN_PATH || "/api/login";
const EMAIL = process.env.DEMO_EMAIL || "demo@gmail.com";
const PASSWORD = process.env.DEMO_PASSWORD || "password";

// Your send endpoint still expects the Bearer token:
const TOKEN = process.env.EMAIL_API_TOKEN || "";

function must(ok, label) {
  if (!ok) { console.error("❌", label); process.exit(1); }
  console.log("✅", label);
}

// Build absolute URL
const url = (p) => BASE.replace(/\/$/, "") + p;

// Extract cookie(s) from response
function cookiesFrom(res) {
  // Node 18+ (undici) has getSetCookie; fallback to single header if needed
  const arr = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);
  return arr.join("; ");
}

(async () => {
  try {
    // 1) Login -> get session cookie
    let r = await fetch(url(LOGIN_PATH), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    const cookie = cookiesFrom(r);
    must(r.ok && cookie, `POST ${LOGIN_PATH} (${r.status}) [cookie acquired]`);

    const commonHeaders = { Cookie: cookie };

    // 2) GET /api/customers (session cookie)
    r = await fetch(url("/api/customers"), { headers: commonHeaders });
    must(r.ok, `GET /api/customers (${r.status})`);

    // 3) GET /email/template (session cookie)
    r = await fetch(url("/email/template"), { headers: commonHeaders });
    must(r.ok, `GET /email/template (${r.status})`);

    // 4) POST /email/send-all-token (token + cookie for good measure)
    r = await fetch(url("/email/send-all-token"), {
      method: "POST",
      headers: {
        ...commonHeaders,
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        to: [{ email: "test@example.com", name: "Test" }],
        subject: "Smoke",
        body: "<p>Smoke</p>",
        include_attachments: false,
      }),
    });
    const txt = await r.text();
    must(r.ok, `POST /email/send-all-token (${r.status}) ${txt.slice(0, 80)}`);
  } catch (e) {
    console.error("❌ Smoke crashed:", e);
    process.exit(1);
  }
})();
