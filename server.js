const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const { getMemory, saveMemory } = require("./storage");

/* =========================
   🧠 HELPER FUNCTIONS
========================= */

// CLASSIFY MEMORY TYPE
function classifyMemory(msg) {
    const m = msg.toLowerCase();

    if (m.startsWith("i am") || m.includes("my name is")) return "identity";
    if (m.includes("i love") || m.includes("i like") || m.includes("my favorite")) return "preference";
    if (m.includes("i live") || m.includes("i work") || m.includes("i study")) return "lifestyle";

    return null;
}

// PROFILE SUMMARY
function generateSummary(memory) {

    const identity = memory.filter(m => m.type === "identity");
    const preference = memory.filter(m => m.type === "preference");
    const lifestyle = memory.filter(m => m.type === "lifestyle");

    let summary = "🧠 Your profile summary:\n\n";

    if (identity.length) {
        summary += `👤 Identity: ${identity.map(m => m.text).join(", ")}\n`;
    }

    if (preference.length) {
        summary += `❤️ Likes: ${preference.map(m => m.text).join(", ")}\n`;
    }

    if (lifestyle.length) {
        summary += `🏠 Lifestyle: ${lifestyle.map(m => m.text).join(", ")}\n`;
    }

    summary += "\n✨ You are a unique individual with stored preferences and habits.";

    return summary;
}

// INSIGHTS ENGINE
function getMemoryInsights(memory) {

    const preferences = memory.filter(m => m.type === "preference").length;
    const identity = memory.filter(m => m.type === "identity").length;
    const lifestyle = memory.filter(m => m.type === "lifestyle").length;

    let insights = [];

    if (preferences >= 2) {
        insights.push("❤️ You talk a lot about your preferences and likes.");
    }

    if (identity >= 1) {
        insights.push("👤 I know your identity details.");
    }

    if (lifestyle >= 2) {
        insights.push("🏠 You’ve shared lifestyle information about yourself.");
    }

    if (preferences === 0 && identity === 0 && lifestyle === 0) {
        insights.push("🧠 I’m still learning about you.");
    }

    return insights;
}

/* =========================
   🚀 ROUTES
========================= */

// HOME
app.get("/", (req, res) => {
    res.send("🤖 RetentiveMate AI is running");
});

// CHAT ROUTE
app.post("/chat", async (req, res) => {

    const { userId, message } = req.body;

    if (!userId || !message) {
        return res.json({
            reply: "User ID and message required",
            memory: []
        });
    }

    let memory = await getMemory(userId);
    const lower = message.toLowerCase();

    /* -------------------------
       🧠 WHO AM I / SUMMARY
    --------------------------*/
    if (
        lower.includes("who am i") ||
        lower.includes("what do you know about me") ||
        lower.includes("tell me about myself")
    ) {
        if (memory.length === 0) {
            return res.json({
                reply: "I don't know anything about you yet. Tell me about yourself!",
                memory
            });
        }

        return res.json({
            reply: generateSummary(memory),
            memory
        });
    }

    /* -------------------------
       🧠 INSIGHTS
    --------------------------*/
    if (
        lower.includes("insights") ||
        lower.includes("what do you think about me")
    ) {
        const insights = getMemoryInsights(memory);

        return res.json({
            reply: `🧠 Here’s what I’ve noticed about you:\n\n${insights.join("\n")}`,
            memory
        });
    }

    /* -------------------------
       🗑️ FORGET MEMORY
    --------------------------*/
    if (lower.startsWith("forget ")) {
        const keyword = lower.replace("forget ", "").trim();

        memory = memory.filter(m =>
            !m.text.toLowerCase().includes(keyword)
        );

        await saveMemory(userId, memory);

        return res.json({
            reply: `🗑️ I’ve forgotten anything related to "${keyword}".`,
            memory
        });
    }

    /* -------------------------
       🔍 SEARCH MEMORY
    --------------------------*/
    if (lower.startsWith("do i") || lower.startsWith("am i")) {

        const keyword = lower.split(" ").slice(-1)[0];

        const results = memory.filter(m =>
            m.text.toLowerCase().includes(keyword)
        );

        if (results.length === 0) {
            return res.json({
                reply: "I couldn't find anything about that.",
                memory
            });
        }

        return res.json({
            reply: `🔍 Here's what I found:\n\n` +
                results.map((m, i) => `${i + 1}. ${m.text}`).join("\n"),
            memory
        });
    }

    /* -------------------------
       💾 SAVE MEMORY
    --------------------------*/
    const type = classifyMemory(message);

    if (type) {

        const memoryItem = {
            type,
            text: message,
            importance:
                type === "identity" ? 3 :
                type === "preference" ? 2 : 1,
            timestamp: Date.now()
        };

        memory.push(memoryItem);

        await saveMemory(userId, memory);

        return res.json({
            reply: `✅ Got it. I've saved your ${type} info.`,
            memory
        });
    }

    /* -------------------------
       🤖 DEFAULT RESPONSE
    --------------------------*/
    return res.json({
        reply: "👍 Noted. If it's important, I'll remember it.",
        memory
    });
});

/* =========================
   🚀 START SERVER
========================= */

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`🔥 RetentiveMate AI running at http://localhost:${PORT}`);
});