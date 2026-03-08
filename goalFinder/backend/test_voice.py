import argparse
import asyncio
import json
import math
import time
import wave
from pathlib import Path

from websockets.asyncio.client import connect


WS_URL = "ws://127.0.0.1:8000/ws/voice"
DEFAULT_WAV_PATH = Path(__file__).resolve().parent / "test_audio.wav"
CHUNK_MS = 250
SAMPLE_RATE = 16000
BYTES_PER_SAMPLE = 2
CHANNELS = 1
TIMEOUT_SECONDS = 60


def load_wav_pcm(path: Path) -> bytes:
    with wave.open(str(path), "rb") as wav_file:
        if wav_file.getframerate() != SAMPLE_RATE:
            raise ValueError(f"{path} must be {SAMPLE_RATE}hz.")
        if wav_file.getsampwidth() != BYTES_PER_SAMPLE:
            raise ValueError(f"{path} must be 16-bit PCM.")
        if wav_file.getnchannels() != CHANNELS:
            raise ValueError(f"{path} must be mono.")
        return wav_file.readframes(wav_file.getnframes())


def generate_sine_pcm(duration_seconds: float = 4.0, frequency_hz: float = 440.0) -> bytes:
    frame_count = int(duration_seconds * SAMPLE_RATE)
    samples = bytearray()

    for i in range(frame_count):
        sample = int(0.2 * 32767 * math.sin(2 * math.pi * frequency_hz * i / SAMPLE_RATE))
        samples.extend(sample.to_bytes(2, byteorder="little", signed=True))

    return bytes(samples)


async def send_audio_chunks(websocket, pcm_bytes: bytes) -> None:
    chunk_size = int(SAMPLE_RATE * (CHUNK_MS / 1000) * BYTES_PER_SAMPLE)

    for offset in range(0, len(pcm_bytes), chunk_size):
        chunk = pcm_bytes[offset : offset + chunk_size]
        await websocket.send(chunk)
        await asyncio.sleep(CHUNK_MS / 1000)


async def receive_until_done(websocket) -> None:
    deadline = time.monotonic() + TIMEOUT_SECONDS

    while time.monotonic() < deadline:
        timeout = deadline - time.monotonic()
        message = await asyncio.wait_for(websocket.recv(), timeout=timeout)

        if isinstance(message, bytes):
            print("audio chunk received")
            continue

        payload = json.loads(message)
        print(f"text frame: {payload}")

        if payload.get("type") == "message":
            text = payload.get("text", "")
            if text.startswith("Voice goal extraction failed:") or text.startswith("Unable to start voice goal extraction:"):
                print("Voice endpoint returned an error and closed the session.")
                return

        if payload.get("type") == "goal_complete":
            print("Goal JSON:")
            print(json.dumps(payload["goal"], indent=2))
            return

    print(f"Timed out after {TIMEOUT_SECONDS} seconds without goal_complete.")


async def run_voice_test(audio_source: str) -> None:
    wav_path = Path(audio_source)
    if audio_source != "sine" and wav_path.exists():
        print(f"Using WAV file: {wav_path}")
        pcm_bytes = load_wav_pcm(wav_path)
    elif DEFAULT_WAV_PATH.exists() and audio_source == "auto":
        print(f"Using WAV file: {DEFAULT_WAV_PATH}")
        pcm_bytes = load_wav_pcm(DEFAULT_WAV_PATH)
    else:
        print("Using generated sine wave PCM.")
        pcm_bytes = generate_sine_pcm()

    print(f"Connecting to {WS_URL}")
    async with connect(WS_URL, open_timeout=10, close_timeout=5, max_size=None) as websocket:
        sender = asyncio.create_task(send_audio_chunks(websocket, pcm_bytes))
        receiver = asyncio.create_task(receive_until_done(websocket))

        done, pending = await asyncio.wait(
            {sender, receiver},
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
        await asyncio.gather(*done, return_exceptions=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Debug the /ws/voice endpoint.")
    parser.add_argument(
        "--audio",
        default="auto",
        help='Path to a 16-bit PCM mono 16000hz WAV file, or "sine" to generate fake PCM.',
    )
    args = parser.parse_args()
    asyncio.run(run_voice_test(args.audio))
