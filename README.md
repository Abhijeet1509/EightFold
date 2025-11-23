For this assignment, I chose to build the Interview Practice Partner. My goal was to solve the biggest problem with most voice bots: latency. A real interview relies on quick back-and-forth, interruptions, and flow. If an AI takes 3 seconds to "think" before speaking, the illusion breaks.

This project is a Voice-First Technical Interviewer that assesses candidates on React, System Design, and Algorithms. It uses Google's Gemini Multimodal Live API to achieve sub-second response times, allowing for a natural conversation where users can even interrupt the AI.

Live Demo:https://interviewer-8m7ba066c-abhijeet1509s-projects.vercel.app

I decided to keep the architecture lean to prioritize performance. Instead of a complex microservices backend, I built a "thick client" using React 19 and Vite that connects directly to the AI model.

Model: Gemini 2.0 Flash (Exp)I chose this model because it was the most critical decision for performance.
Unlike standard LLMs that require a slow "Speech-to-Text -> LLM -> Text-to-Speech" pipeline, Gemini 2.0 supports native audio-to-audio streaming, which cuts latency down to approximately 500ms

Frontend: React 19 + TypeScriptI selected React 19 because its new concurrent features are essential for this app.
They allow the application to handle high-frequency state updates for the audio visualizer without freezing or lagging the user interface.

Audio: Web Audio APII used the native Web Audio API to build a custom audio processor. This was necessary to convert the browser's default audio stream (Float32) into the specific 16-bit PCM format that the Gemini API requires.

Hosting: VercelI chose Vercel for hosting to ensure instant deployment. It also simplifies the management of environment variables, which is crucial for securely handling the API keys in this architecture.

Design Decisions & Trade-offs

Per the assignment requirements, here is the reasoning behind my technical choices:

1. Solving the Latency Problem (The "Audio-to-Audio" Approach)
Initially, I considered using OpenAI Whisper for transcription and ElevenLabs for speech. However, testing showed a 3-5 second delay between the user finishing a sentence and the AI speaking. In an interview context, this silence is awkward. Decision: I switched to Gemini’s Live API over WebSocket. Result: The interaction feels like a phone call rather than a turn-based game.

2. Handling the "Chatty User" (Agentic Behavior)
One of the persona requirements was handling users who go off-topic. Challenge: If a user starts talking about their commute, a standard AI might ignore it or hallucinate. Solution: I engineered a "Contextual Bridge" into the system prompt. The AI is instructed to:

Acknowledge the user's tangent (proving it listened).

Use a transitional phrase.

Firmly pivot back to the technical question. This demonstrates agentic behavior—the bot controls the flow, not the user.

3. The "Noise Gate" Implementation
During testing, I noticed that background noise (breathing, typing) would accidentally trigger the AI to think I was speaking. Solution: I implemented a custom RMS (Root Mean Square) noise gate in the liveClient.ts. It calculates the volume of the input stream and only sends data to the API if it exceeds a specific threshold. This prevents the AI from interrupting the user unnecessarily.

4. Client-Side vs. Server-Side
Trade-off: To maximize speed for this hackathon, I implemented the WebSocket connection directly in the browser. Note: In a production environment, I would proxy this through a Node.js backend to hide the API key. For this demo, I prioritized the lowest possible latency.

Handling the Test Personas
I tested the bot against the specific user types mentioned in the problem statement:

The Confused User: If the user doesn't know what role to pick, the bot switches to "Career Counselor" mode to gauge interest before starting the interview.

The Efficient User: The system prompt includes a "Drift" mechanism. If the user answers quickly and correctly, the bot skips basics and moves to "Edge Case" questions (Drift Up).

The Edge Case (Capability Boundaries): I tested scenarios where the user makes requests beyond the bot's intended capabilities, such as asking "Write the code for a Binary Search Tree."

Behavior: Instead of hallucinating or reading out loud syntax, the bot strictly refuses: "I cannot generate code for you. Please walk me through your logic or pseudocode approach instead.".

Setup Instructions

### Prerequisites
* Node.js (v18+)
* Google Gemini API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Abhijeet1509/EightFold
    cd ai-interviewer
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    VITE_API_KEY=your_gemini_api_key_here
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```
    Open `http://localhost:5173` to start the interview.

---
Next Steps
If I had more time, I would:

Add Resume Parsing: Allow the user to upload a PDF so the AI can ask specific questions about their past projects.

Save Session Audio: Implement a feature to record the session and provide a playback link along with the feedback report.

*Submitted by Abhijeet Barsaiyan *
