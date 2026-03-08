# Goal Finder Frontend Integration Guide

This document explains how to integrate the goal extraction module with any frontend, not just the current single-file React demo.

## Overview

The module exposes two WebSocket endpoints:

- `ws://<backend-host>/ws/text`
- `ws://<backend-host>/ws/voice`

Both modes eventually return the same final structured goal object.

Use:

- `text` mode when the user types messages
- `voice` mode when the user speaks and expects spoken responses back

## Final Goal Shape

When the backend has enough information, it sends:

```json
{
  "type": "goal_complete",
  "goal": {
    "goal": "short specific goal title",
    "description": "2-3 sentences of exactly what to learn and what to skip",
    "level": "beginner",
    "time_per_day_minutes": 15,
    "context": "why they want this and their background"
  }
}
```

Your frontend should treat this as the end of the conversation and switch from conversation UI to a goal summary UI.

## Text Mode

### Endpoint

```text
ws://<backend-host>/ws/text
```

### What the frontend sends

Each user message is a JSON text frame:

```json
{
  "text": "I want to learn LLMs"
}
```

### What the backend sends

Intermediate Gemini replies:

```json
{
  "type": "message",
  "text": "Good target. Which part of LLMs do you want to get good at?"
}
```

Final response:

```json
{
  "type": "goal_complete",
  "goal": {
    "...": "..."
  }
}
```

### Frontend integration steps

1. Open a WebSocket connection to `/ws/text`.
2. When the user sends a message, send `{ "text": "..." }` as JSON.
3. Append outgoing user text to the UI immediately.
4. When a backend `message` arrives, render it as the assistant reply.
5. When `goal_complete` arrives, stop rendering chat and show the final goal card.
6. If the socket closes unexpectedly, show a reconnect or retry state.

### Minimal text-mode client logic

```js
const ws = new WebSocket("ws://localhost:8000/ws/text");

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);

  if (payload.type === "message") {
    // render assistant message
  }

  if (payload.type === "goal_complete") {
    // render final goal card
  }
};

function sendText(text) {
  ws.send(JSON.stringify({ text }));
}
```

## Voice Mode

### Endpoint

```text
ws://<backend-host>/ws/voice
```

### Audio format expected by backend

The frontend must send raw PCM audio as binary WebSocket frames:

- sample rate: `16000`
- encoding: `16-bit signed PCM`
- channel count: `1`
- endianness: `little-endian`

### Audio format returned by backend

The backend sends Gemini audio responses back as binary WebSocket frames:

- sample rate: `24000`
- encoding: `16-bit signed PCM`
- channel count: `1`
- endianness: `little-endian`

### Control message for turn handoff

Voice mode is turn-based. After the user finishes speaking, the frontend must send:

```json
{
  "type": "end_audio"
}
```

This tells the backend to send an explicit audio end signal to Gemini Live so Gemini knows it should respond.

Without this, the session can remain stuck in listening mode.

### What the frontend sends in voice mode

1. Binary PCM audio frames while the user is speaking
2. Then a text JSON frame:

```json
{
  "type": "end_audio"
}
```

### What the backend sends in voice mode

1. Binary PCM audio frames from Gemini while Gemini is speaking
2. Optional text JSON status/error frames:

```json
{
  "type": "message",
  "text": "Voice goal extraction failed: ..."
}
```

3. Final goal:

```json
{
  "type": "goal_complete",
  "goal": {
    "...": "..."
  }
}
```

## Voice Mode Frontend Responsibilities

Your frontend must do four things correctly:

1. Capture microphone audio
2. Convert it to `16000hz mono PCM16`
3. Send audio chunks as binary frames
4. Play binary PCM audio responses from the backend at `24000hz`

## Recommended Voice Interaction Flow

Use a turn-based UI, not open-ended continuous listening.

Recommended buttons:

1. `Start Conversation`
2. `Let Gemini Respond`
3. `Speak Again`
4. `End Session`

Recommended sequence:

1. User clicks `Start Conversation`
2. Frontend opens `/ws/voice`
3. Frontend requests microphone access
4. Frontend streams PCM audio while the user speaks
5. User clicks `Let Gemini Respond`
6. Frontend stops mic capture and sends `{ "type": "end_audio" }`
7. Frontend keeps the socket open
8. Backend returns Gemini audio as binary frames
9. Frontend plays those frames sequentially
10. If Gemini asks another question, enable `Speak Again`
11. Repeat until `goal_complete`

## Voice Playback Logic

Your frontend should:

1. Set:

```js
ws.binaryType = "arraybuffer";
```

2. Distinguish message types:

```js
if (event.data instanceof ArrayBuffer) {
  // audio from Gemini
}

if (typeof event.data === "string") {
  // JSON control message
}
```

3. Convert incoming audio:

```js
const int16 = new Int16Array(arrayBuffer);
const float32 = new Float32Array(int16.length);
for (let i = 0; i < int16.length; i += 1) {
  float32[i] = int16[i] / 32768.0;
}
```

4. Create an `AudioContext` at `24000hz`
5. Queue playback using a `nextStartTime` variable so chunks play in order

## Voice Capture Logic

For mic capture, your frontend should:

1. Use `getUserMedia`
2. Read microphone samples with `AudioWorklet` if possible
3. Fallback to `ScriptProcessor` if needed
4. Downsample from the browser audio context rate to `16000`
5. Convert to PCM16
6. Send binary chunks every `200ms` to `300ms`

## Error Handling

Your frontend should explicitly handle:

- microphone permission denied
- backend WebSocket connection failure
- backend error text frames
- unsupported frame types
- backend closing the socket unexpectedly

Recommended UI states:

- `idle`
- `connecting`
- `listening`
- `waiting_for_gemini`
- `speaking`
- `ready_for_next_turn`
- `goal_complete`
- `error`

## Suggested Architecture For Another Frontend

If you are integrating this into another app, keep the module isolated.

Recommended structure:

1. Create a `GoalFinderService`
2. Put all WebSocket handling inside that service
3. Expose callbacks or events:
   - `onAssistantMessage`
   - `onGoalComplete`
   - `onVoiceAudioChunk`
   - `onError`
   - `onStateChange`
4. Keep audio capture/playback separate from page components
5. Let page components only render state and trigger actions

This keeps the voice transport logic from leaking into your UI code.

## Example Service Boundaries

### Text service

- `connectText()`
- `sendTextMessage(text)`
- `disconnectText()`

### Voice service

- `connectVoice()`
- `startRecordingTurn()`
- `endRecordingTurn()`
- `disconnectVoice()`

## Backend Assumptions

The backend currently assumes:

- CORS is enabled
- Gemini API key is configured in `.env`
- text and voice are separate WebSocket sessions
- goal detection happens server-side
- the final structured output is sent only through `goal_complete`

## Testing Before Integration

Before wiring a new frontend:

1. Start the backend
2. Run `backend/test_module.py`
3. Run `backend/test_voice.py`
4. Confirm text and voice work without the browser
5. Only then wire the new frontend

This prevents frontend debugging from masking backend model/session problems.

## Common Failure Cases

### Text mode works, voice mode does not

Usually one of:

- wrong Live model name
- wrong Gemini API version for Live
- missing `end_audio` handoff
- microphone audio format mismatch
- binary audio not being decoded correctly for playback

### Voice stays in listening forever

Usually:

- frontend never sends `{ "type": "end_audio" }`
- backend never forwards `audio_stream_end=True`

### Audio arrives but nothing plays

Usually:

- `ws.binaryType` is not `arraybuffer`
- PCM decoding is wrong
- playback is not queued with `nextStartTime`
- browser audio context is suspended

## Integration Checklist

- Text UI can open `/ws/text`
- Text UI sends `{ "text": "..." }`
- Text UI handles `message`
- Text UI handles `goal_complete`
- Voice UI can open `/ws/voice`
- Voice UI sends binary PCM frames
- Voice UI sends `{ "type": "end_audio" }` after the user turn
- Voice UI handles binary Gemini audio
- Voice UI handles JSON text frames
- Voice UI handles `goal_complete`
- Goal card UI is shared between both modes

## Current Recommendation

If you are integrating into another frontend, do not copy the entire demo page.

Instead:

1. Reuse the backend WebSocket contract
2. Reimplement the UI in your app’s component system
3. Keep a dedicated voice transport layer
4. Keep the final goal card format identical

That gives you a cleaner integration and avoids coupling your app to the demo frontend implementation.
