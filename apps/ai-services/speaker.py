"""Speaker verification endpoints.

Handles voice enrollment, status checks, profile deletion, and
speaker verification using resemblyzer voice embeddings.
"""

import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse
from resemblyzer import VoiceEncoder, preprocess_wav

router = APIRouter()

EMBEDDINGS_DIR = Path("/data/embeddings")
EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)

# Lazy-load the encoder so the module can be imported without GPU/model issues
_encoder = None


def _get_encoder() -> VoiceEncoder:
    global _encoder
    if _encoder is None:
        _encoder = VoiceEncoder()
    return _encoder


def _embedding_path(user_id: str) -> Path:
    """Return the path to a user's stored embedding."""
    return EMBEDDINGS_DIR / f"{user_id}.npy"


def _convert_to_wav(input_bytes: bytes, suffix: str = ".webm") -> str:
    """Convert arbitrary audio bytes to WAV 16 kHz mono via ffmpeg.

    Returns the path to the temporary WAV file (caller must clean up).
    """
    tmp_in = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_out = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    try:
        tmp_in.write(input_bytes)
        tmp_in.close()
        tmp_out.close()

        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", tmp_in.name,
                "-ar", "16000",
                "-ac", "1",
                "-f", "wav",
                tmp_out.name,
            ],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"ffmpeg failed: {result.stderr.decode(errors='replace')}"
            )
        return tmp_out.name
    finally:
        os.unlink(tmp_in.name)


def _embed_audio(audio_bytes: bytes, suffix: str = ".webm") -> np.ndarray:
    """Convert raw audio bytes to a 256-dim voice embedding."""
    wav_path = _convert_to_wav(audio_bytes, suffix=suffix)
    try:
        wav = preprocess_wav(wav_path)
        if len(wav) == 0:
            # Fallback: load raw WAV without VAD preprocessing (stdlib only)
            import wave as wave_mod
            print(f"[Speaker] preprocess_wav returned empty, falling back to raw WAV load")
            with wave_mod.open(wav_path, 'rb') as wf:
                frames = wf.readframes(wf.getnframes())
                wav = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                print(f"[Speaker] Raw WAV loaded: {len(wav)} samples, {wf.getnchannels()}ch, {wf.getframerate()}Hz")

            if len(wav) == 0:
                raise ValueError("Audio file produced empty waveform")

        encoder = _get_encoder()
        embedding = encoder.embed_utterance(wav)
        return embedding
    finally:
        os.unlink(wav_path)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


# ---------------------------------------------------------------------------
# 1. GET /speaker/status?user_id=...
# ---------------------------------------------------------------------------


@router.get("/speaker/status")
async def speaker_status(user_id: str = Query(...)):
    """Check whether a user has an enrolled voice profile."""
    enrolled = _embedding_path(user_id).exists()
    return {"enrolled": enrolled}


# ---------------------------------------------------------------------------
# 2. POST /speaker/enroll
# ---------------------------------------------------------------------------


@router.post("/speaker/enroll")
async def speaker_enroll(
    audio: UploadFile = File(...),
    user_id: str = Form(...),
):
    """Enroll a user's voice by storing their embedding."""
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        # Detect suffix from filename
        fname = audio.filename or "audio.webm"
        suffix = "." + fname.rsplit(".", 1)[-1] if "." in fname else ".webm"
        print(f"[Speaker] Enrolling user {user_id}, file={fname}, size={len(audio_bytes)}, suffix={suffix}")

        embedding = _embed_audio(audio_bytes, suffix=suffix)
        np.save(str(_embedding_path(user_id)), embedding)
        return {"success": True, "message": "Voice enrolled successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# 3. DELETE /speaker/enroll
# ---------------------------------------------------------------------------


@router.delete("/speaker/enroll")
async def speaker_delete(request: Request):
    """Remove a user's stored voice profile."""
    try:
        body = await request.json()
        user_id = body.get("user_id")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")

        path = _embedding_path(user_id)
        if path.exists():
            path.unlink()
        return {"success": True, "message": "Voice profile removed"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# 5. POST /speaker/diarize — Two-speaker diarization
# ---------------------------------------------------------------------------


@router.post("/speaker/diarize")
@router.post("/api/v1/speaker/diarize")
async def speaker_diarize(
    audio: UploadFile = File(...),
    user_id: str = Form(...),
):
    """Segment audio by speaker, filtering out the enrolled candidate.

    Uses sliding-window speaker embeddings to classify each segment as
    'candidate' or 'interviewer'. Returns per-segment speaker labels
    and whether the audio should be transcribed.

    If no enrollment exists, returns all audio as 'interviewer'.
    """
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        fname = audio.filename or "audio.webm"
        suffix = "." + fname.rsplit(".", 1)[-1] if "." in fname else ".webm"
        print(f"[Diarize] user={user_id}, file={fname}, size={len(audio_bytes)}")

        # Convert to WAV
        wav_path = _convert_to_wav(audio_bytes, suffix=suffix)
        try:
            wav = preprocess_wav(wav_path)
            if len(wav) == 0:
                import wave as wave_mod
                with wave_mod.open(wav_path, 'rb') as wf:
                    frames = wf.readframes(wf.getnframes())
                    wav = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        finally:
            os.unlink(wav_path)

        if len(wav) == 0:
            return {
                "should_transcribe": True,
                "segments": [],
                "interviewer_ratio": 1.0,
            }

        # Load enrolled embedding (if exists)
        path = _embedding_path(user_id)
        if not path.exists():
            return {
                "should_transcribe": True,
                "segments": [{"speaker": "interviewer", "start": 0.0, "end": round(len(wav) / 16000.0, 2)}],
                "interviewer_ratio": 1.0,
            }

        stored_embedding = np.load(str(path))
        encoder = _get_encoder()

        # Sliding window diarization
        sample_rate = 16000
        window_size = int(1.6 * sample_rate)   # 1.6 second windows
        hop_size = int(0.8 * sample_rate)       # 0.8 second hop (50% overlap)
        threshold = 0.70                         # slightly lower for segment-level

        segments = []
        total_windows = 0
        interviewer_windows = 0

        for start_sample in range(0, len(wav) - window_size // 2, hop_size):
            end_sample = min(start_sample + window_size, len(wav))
            window = wav[start_sample:end_sample]

            if len(window) < sample_rate * 0.3:
                continue

            window_embedding = encoder.embed_utterance(window)
            similarity = _cosine_similarity(stored_embedding, window_embedding)

            start_time = start_sample / sample_rate
            end_time = end_sample / sample_rate
            is_candidate = similarity > threshold

            total_windows += 1
            if not is_candidate:
                interviewer_windows += 1

            segments.append({
                "speaker": "candidate" if is_candidate else "interviewer",
                "start": round(start_time, 2),
                "end": round(end_time, 2),
                "similarity": round(float(similarity), 4),
            })

        # Merge consecutive same-speaker segments
        merged = []
        for seg in segments:
            if merged and merged[-1]["speaker"] == seg["speaker"]:
                merged[-1]["end"] = seg["end"]
            else:
                merged.append({
                    "speaker": seg["speaker"],
                    "start": seg["start"],
                    "end": seg["end"],
                })

        interviewer_ratio = interviewer_windows / max(total_windows, 1)
        should_transcribe = interviewer_ratio > 0.15

        print(f"[Diarize] {len(merged)} segments, interviewer={interviewer_ratio:.0%}, transcribe={should_transcribe}")
        return {
            "should_transcribe": should_transcribe,
            "segments": merged,
            "interviewer_ratio": round(interviewer_ratio, 4),
            "total_duration": round(len(wav) / sample_rate, 2),
        }

    except HTTPException:
        raise
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# 4. POST /api/v1/speaker/verify  (also mounted at /speaker/verify)
# ---------------------------------------------------------------------------


@router.post("/api/v1/speaker/verify")
@router.post("/speaker/verify")
async def speaker_verify(
    file: UploadFile = File(...),
    user_id: str = Form(...),
):
    """Compare an audio clip against the user's enrolled voice.

    Returns whether the audio should be transcribed:
    - similarity > 0.75  =>  it IS the user's voice  =>  should_transcribe = False
    - similarity <= 0.75 =>  different speaker       =>  should_transcribe = True

    If the user has no enrolled profile, always transcribe.
    """
    try:
        path = _embedding_path(user_id)
        if not path.exists():
            return {"should_transcribe": True, "similarity": 0.0}

        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        stored_embedding = np.load(str(path))
        fname = file.filename or "audio.webm"
        suffix = "." + fname.rsplit(".", 1)[-1] if "." in fname else ".webm"
        current_embedding = _embed_audio(audio_bytes, suffix=suffix)
        similarity = _cosine_similarity(stored_embedding, current_embedding)

        return {
            "should_transcribe": similarity <= 0.75,
            "similarity": round(similarity, 4),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
