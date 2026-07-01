const fs = require("fs");

const DB_FILE = "memory-db.json";

/**
 * Load database from file
 */
function loadDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {};
        return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    } catch (err) {
        console.error("DB Load Error:", err);
        return {};
    }
}

/**
 * Save database to file
 */
function saveDB(db) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (err) {
        console.error("DB Save Error:", err);
    }
}

/**
 * Get user memory
 */
async function getMemory(userId) {
    const db = loadDB();

    if (!db[userId]) {
        db[userId] = [];
        saveDB(db);
    }

    return db[userId];
}

/**
 * Save user memory
 */
async function saveMemory(userId, memoryArray) {
    const db = loadDB();

    db[userId] = memoryArray;

    saveDB(db);

    return true;
}

module.exports = {
    getMemory,
    saveMemory
};