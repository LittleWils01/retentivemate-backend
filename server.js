require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
});

// MemWal (safe optional import)
let MemWal;
try {
    MemWal = require("@mysten-incubation/memwal").MemWal;
} catch (e) {
    console.warn("MemWal not available, using fallback memory");
}

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
   🧠 MEMORY SYSTEM (MEMWAL + FALLBACK)
========================= */

const memwal = MemWal
    ? new MemWal({ namespace: "retentivemate-ai" })
    : null;

// fallback memory
const localMemory = {};

/* =========================
   MEMORY HELPERS
========================= */

async function loadMemory(userId) {
    if (memwal) {
        try {
            return (await memwal.get(userId)) || [];
        } catch (e) {
            console.error("MemWal load error:", e);
        }
    }

    return localMemory[userId] || [];
}

async function saveMemory(userId, memory) {
    if (memwal) {
        try {
            await memwal.set(userId, memory);
            return;
        } catch (e) {
            console.error("MemWal save error:", e);
        }
    }

    localMemory[userId] = memory;
}

/* =========================
   🧠 MEMORY RULE
========================= */

function shouldSaveMemory(message) {
    const m = message.toLowerCase();

    return (
        m.includes("i am") ||
        m.includes("my name is") ||
        m.includes("i like") ||
        m.includes("i love") ||
        m.includes("my favorite") ||
        m.includes("i live") ||
        m.includes("i work") ||
        m.includes("i study")
    );
}

/* =========================
   🤖 GEMINI ENGINE
========================= */

async function generateReply(message, memory) {

    const memoryContext = memory.length
        ? memory.slice(-10).map(m => `- ${m.text || m.message}`).join("\n")
        : "No stored memories yet.";

    const prompt = `
You are RetentiveMate, a smart conversational AI assistant.

RULES:
- Be natural and human-like
- Respond like ChatGPT
- Understand greetings (hi, hello)
- Ask questions when needed
- NEVER say "Noted" or "I will remember"

User memory:
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
   🚀 ROUTES
========================= */

app.get("/", (req, res) => {
    res.send("🔥 RetentiveMate AI is running");
});

app.post("/chat", async (req, res) => {
    try {
        const { userId, message } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                reply: "userId and message required"
            });
        }

        let memory = await loadMemory(userId);

        const reply = await generateReply(message, memory);

        if (shouldSaveMemory(message)) {
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
        console.error(err);
        return res.status(500).json({
            reply: "AI error occurred"
        });
    }
});

/* =========================
   🚀 START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🔥 RetentiveMate AI running on port ${PORT}`);
});