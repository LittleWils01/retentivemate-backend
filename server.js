require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const { getMemory, saveMemory } = require("./storage");

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* =========================
   🤖 GEMINI SETUP
========================= */

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

/* =========================
   🧠 AI FUNCTION
========================= */

async function generateReply(message, memories = []) {

    const memoryContext =
        memories.length > 0
            ? memories.slice(-10).map(m => `- ${m.text}`).join("\n")
            : "No stored memories yet.";

    const prompt = `
You are RetentiveMate, an intelligent AI assistant with persistent memory.

RULES:
- Be natural, friendly, and conversational
- Never say "I will remember", "memory saved", or anything like that
- Use memory only when relevant
- Keep responses short and helpful

User memories:
${memoryContext}

User message:
${message}
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });

    return response.text;
}

/* =========================
   🧠 MEMORY SAVER (SILENT)
========================= */

function shouldSaveMemory(message) {
    const m = message.toLowerCase();

    return (
        m.includes("i am") ||
        m.includes("my name is") ||
        m.includes("i like") ||
        m.includes("i love") ||
        m.includes("my favorite") ||
        m.includes("i work") ||
        m.includes("i study") ||
        m.includes("i live") ||
        m.includes("my birthday is")
    );
}

/* =========================
   🚀 ROUTES
========================= */

// HEALTH CHECK
app.get("/", (req, res) => {
    res.send("🔥 RetentiveMate AI is running");
});

// TEST AI
app.post("/test-ai", async (req, res) => {
    try {
        const { message } = req.body;

        const reply = await generateReply(message, []);

        return res.json({ reply });

    } catch (err) {
        console.error("TEST AI ERROR:", err);
        return res.status(500).json({
            reply: "AI error occurred"
        });
    }
});

// MAIN CHAT ROUTE
app.post("/chat", async (req, res) => {
    try {
        const { userId, message } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                reply: "userId and message are required"
            });
        }

        // Load memory
        let memory = await getMemory(userId);

        // Build memory context (last 10 only)
        const memoryContext =
            memory.length > 0
                ? memory.slice(-10).map(m => `- ${m.text}`).join("\n")
                : "No stored memories yet.";

        // 🔥 STRICT AI PROMPT (IMPORTANT FIX)
        const prompt = `
You are RetentiveMate, a highly intelligent conversational AI.

You MUST behave like a real assistant.

RULES:
- You must ALWAYS respond to the user's message naturally.
- You MUST recognize greetings (hi, hello, how are you) and respond warmly.
- You MUST ask follow-up questions when appropriate.
- You MUST NOT say "noted", "I will remember", or anything about saving memory.
- You are NOT a storage bot. You are a conversational AI.

Conversation style:
- Friendly
- Natural
- Human-like
- Helpful

User memories:
${memoryContext}

User message:
${message}

Respond naturally:
`;

        // Call Gemini
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const reply = response.text;

        // 🧠 MEMORY SAVING (DO NOT AFFECT RESPONSE)
        const m = message.toLowerCase();

        const shouldSave =
            m.includes("i am") ||
            m.includes("my name is") ||
            m.includes("i like") ||
            m.includes("i love") ||
            m.includes("my favorite") ||
            m.includes("i live") ||
            m.includes("i work") ||
            m.includes("i study");

        if (shouldSave) {
            memory.push({
                text: message,
                timestamp: Date.now()
            });

            await saveMemory(userId, memory);
        }

        return res.json({
            reply,
            memory
        });

    } catch (err) {
        console.error("CHAT ERROR:", err);
        return res.status(500).json({
            reply: "Something went wrong"
        });
    }
});

/* =========================
   🚀 START SERVER
========================= */

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`🔥 RetentiveMate AI running at http://localhost:${PORT}`);
});