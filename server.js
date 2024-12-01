require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const fetch = require('node-fetch'); // Ensure you're using the correct `node-fetch` version

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); 

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});



app.get("/proxy-audio", async (req, res) => {
    try {
        const text = req.query.text;
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(text)}`;

        const response = await fetch(ttsUrl);

        if (!response.ok) {
            throw new Error(`Google TTS request failed with status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        res.set({
            "Content-Type": "audio/mpeg",
            "Content-Length": audioBuffer.length,
        });

        res.send(audioBuffer);
    } catch (error) {
        console.error("Error proxying audio:", error);
        res.status(500).send("Audio fetch error");
    }
});




// Generate Chinese Learning Content Endpoint
app.post("/generate-chinese", async (req, res) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { 
                    role: "user", 
                    content: `Create an engaging Chinese sentence with 8-12 characters that tells a short story. Return the result in a JSON format with the following structure:
                    {
                      "chineseText": "The full Chinese sentence",
                      "fullTranslation": "The complete English translation of the sentence",
                      "characters": [
                        {
                          "character": "The Chinese character",
                          "contextMeaning": "The English meaning of the character in this context"
                        }
                      ]
                    }`
                }
            ],
            max_tokens: 300
        });

        // Parse JSON response
        const jsonResponse = JSON.parse(response.choices[0].message.content);

        // Add Google TTS audio URL for each character
        jsonResponse.characters.forEach(char => {
            char.audioUrl = `/proxy-audio?text=${encodeURIComponent(char.character)}`;

            //char.audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(char.character)}`;
        });

        res.json(jsonResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error generating Chinese content" });
    }
});



app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});