const { getMemory, saveMemory } = require("../storage");

const {
    classifyMemory,
    generateSummary,
    getMemoryInsights
} = require("../utils/memoryClassifier");

async function chatHandler(req, res) {

    const { userId, message } = req.body;

    if (!userId || !message) {
        return res.json({
            reply: "User ID and message required",
            memory: []
        });
    }

    let memory = await getMemory(userId);
    const lower = message.toLowerCase();

    // WHO AM I
    if (
        lower.includes("who am i") ||
        lower.includes("what do you know about me") ||
        lower.includes("tell me about myself")
    ) {
        return res.json({
            reply: memory.length
                ? generateSummary(memory)
                : "I don't know anything about you yet.",
            memory
        });
    }

    // INSIGHTS
    if (lower.includes("insights") || lower.includes("what do you think about me")) {
        const insights = getMemoryInsights(memory);

        return res.json({
            reply: insights.join("\n"),
            memory
        });
    }

    // FORGET
    if (lower.startsWith("forget ")) {
        const keyword = lower.replace("forget ", "").trim();

        memory = memory.filter(m =>
            !m.text.toLowerCase().includes(keyword)
        );

        await saveMemory(userId, memory);

        return res.json({
            reply: `Forgot "${keyword}"`,
            memory
        });
    }

    // SEARCH
    if (lower.startsWith("do i") || lower.startsWith("am i")) {
        const keyword = lower.split(" ").slice(-1)[0];

        const results = memory.filter(m =>
            m.text.toLowerCase().includes(keyword)
        );

        return res.json({
            reply: results.length
                ? results.map((m, i) => `${i + 1}. ${m.text}`).join("\n")
                : "Nothing found.",
            memory
        });
    }

    // SAVE MEMORY
    const type = classifyMemory(message);

    if (type) {
        const memoryItem = {
            type,
            text: message,
            importance: type === "identity" ? 3 : type === "preference" ? 2 : 1,
            timestamp: Date.now()
        };

        memory.push(memoryItem);

        await saveMemory(userId, memory);

        return res.json({
            reply: `Saved as ${type}`,
            memory
        });
    }

    return res.json({
        reply: "Noted.",
        memory
    });
}

module.exports = { chatHandler };