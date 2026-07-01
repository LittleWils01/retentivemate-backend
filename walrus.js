const axios = require("axios");

// ⚠️ NOTE: This is a placeholder structure
// (We will replace URL with real Walrus endpoint when you deploy/test)

const WALRUS_URL = "https://walrus-storage-api.example.com";

async function saveMemory(userId, data) {
    try {
        const response = await axios.post(`${WALRUS_URL}/store`, {
            key: userId,
            value: data
        });

        return response.data;
    } catch (error) {
        console.error("Walrus Save Error:", error.message);
    }
}

async function getMemory(userId) {
    try {
        const response = await axios.get(`${WALRUS_URL}/retrieve/${userId}`);
        return response.data.value || [];
    } catch (error) {
        console.error("Walrus Get Error:", error.message);
        return [];
    }
}

module.exports = { saveMemory, getMemory };