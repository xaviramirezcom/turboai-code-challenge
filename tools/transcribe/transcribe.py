#!/usr/bin/env python3
"""Extract audio from a video and transcribe it with the OpenAI API.

Dev utility for the Turbo AI notes challenge: turns the walkthrough video into
text (plus timestamped SRT/VTT/JSON) so the requirements can be lifted into
`specs/`.

Quick start:
    export OPENAI_API_KEY=sk-...                       # your key — never commit it
    pip install -r requirements.txt                    # installs the openai SDK
    python transcribe.py "specs/raw_sources/Notetaking video.mp4"

Prerequisites:
    - ffmpeg + ffprobe on PATH   (macOS: `brew install ffmpeg`)
    - network access + a funded OpenAI API key in $OPENAI_API_KEY

Outputs (written next to the input by default):
    <name>.transcript.txt        always
    <name>.transcript.srt/.vtt/.json   when the model returns timestamps
                                       (whisper-1 only)

Zero-setup run (if you have uv): `uv run tools/transcribe/transcribe.py` — the
inline dependency block below lets uv build an ephemeral env automatically. The
plain `pip install -r requirements.txt` path works too.
"""

# /// script
# requires-python = ">=3.10"
# dependencies = ["openai>=1.30.0"]
# ///

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import NoReturn

# OpenAI caps uploads at 25 MB; stay comfortably under it.
MAX_UPLOAD_BYTES = 24 * 1024 * 1024
# Only whisper-1 returns segment timestamps (verbose_json). gpt-4o-* are text-only.
TIMESTAMP_MODELS = {"whisper-1"}
DEFAULT_VIDEO = "specs/raw_sources/Notetaking video.mp4"


@dataclass
class Segment:
    start: float
    end: float
    text: str


def die(msg: str) -> NoReturn:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        die(f"command failed: {' '.join(cmd)}\n{proc.stderr.strip()}")


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        die(f"'{name}' not found on PATH — install it (macOS: brew install ffmpeg).")


def extract_audio(video: Path, dest: Path) -> None:
    # Mono, 16 kHz, mp3: tiny and well within the upload limit, plenty for speech.
    run([
        "ffmpeg", "-y", "-i", str(video),
        "-vn", "-ac", "1", "-ar", "16000",
        "-c:a", "libmp3lame", "-b:a", "64k",
        str(dest),
    ])


def probe_duration(path: Path) -> float:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    try:
        return float(proc.stdout.strip())
    except ValueError:
        return 0.0


def split_audio(audio: Path, chunk_seconds: float, workdir: Path) -> list[tuple[Path, float]]:
    """Split an oversized audio file into <=chunk_seconds pieces, keeping each
    chunk's start offset (seconds) so timestamps can be re-based."""
    duration = probe_duration(audio)
    n = max(1, math.ceil(duration / chunk_seconds))
    chunks: list[tuple[Path, float]] = []
    for i in range(n):
        start = i * chunk_seconds
        out = workdir / f"chunk_{i:03d}.mp3"
        run(["ffmpeg", "-y", "-ss", str(start), "-t", str(chunk_seconds),
             "-i", str(audio), "-c", "copy", str(out)])
        if out.exists() and out.stat().st_size > 0:
            chunks.append((out, start))
    return chunks


def transcribe_file(client, audio: Path, model: str, language: str | None,
                    prompt: str | None) -> tuple[str, list[Segment]]:
    want_timestamps = model in TIMESTAMP_MODELS
    fmt = "verbose_json" if want_timestamps else "text"
    with audio.open("rb") as fh:
        kwargs: dict = {"model": model, "file": fh, "response_format": fmt}
        if language:
            kwargs["language"] = language
        if prompt:
            kwargs["prompt"] = prompt
        if want_timestamps:
            kwargs["timestamp_granularities"] = ["segment"]
        resp = client.audio.transcriptions.create(**kwargs)

    if fmt == "text":
        text = resp if isinstance(resp, str) else getattr(resp, "text", str(resp))
        return text, []

    data = resp.model_dump() if hasattr(resp, "model_dump") else dict(resp)
    segments = [
        Segment(float(s["start"]), float(s["end"]), (s.get("text") or "").strip())
        for s in (data.get("segments") or [])
    ]
    return data.get("text", ""), segments


def _timestamp(seconds: float, sep: str) -> str:
    ms = int(round(max(0.0, seconds) * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def to_srt(segments: list[Segment]) -> str:
    lines: list[str] = []
    for i, seg in enumerate(segments, 1):
        lines += [str(i),
                  f"{_timestamp(seg.start, ',')} --> {_timestamp(seg.end, ',')}",
                  seg.text, ""]
    return "\n".join(lines)


def to_vtt(segments: list[Segment]) -> str:
    lines = ["WEBVTT", ""]
    for seg in segments:
        lines += [f"{_timestamp(seg.start, '.')} --> {_timestamp(seg.end, '.')}",
                  seg.text, ""]
    return "\n".join(lines)


def build_client():
    if not os.environ.get("OPENAI_API_KEY"):
        die("OPENAI_API_KEY is not set. Run `export OPENAI_API_KEY=sk-...` and retry.")
    try:
        from openai import OpenAI
    except ImportError:
        die("The 'openai' package is missing. Run `pip install -r requirements.txt`.")
    return OpenAI()


def main() -> None:
    ap = argparse.ArgumentParser(description="Transcribe a video via the OpenAI API.")
    ap.add_argument("video", nargs="?", default=DEFAULT_VIDEO,
                    help=f"path to the video file (default: {DEFAULT_VIDEO})")
    ap.add_argument("--model", default="whisper-1",
                    help="whisper-1 (timestamps) | gpt-4o-transcribe | gpt-4o-mini-transcribe")
    ap.add_argument("--language", default=None, help="ISO-639-1 hint, e.g. en")
    ap.add_argument("--prompt", default=None,
                    help="context to bias spelling (e.g. product/domain terms)")
    ap.add_argument("--out-dir", default=None, help="output dir (default: next to the video)")
    ap.add_argument("--chunk-minutes", type=float, default=20.0,
                    help="chunk length if audio exceeds the 25 MB upload limit")
    ap.add_argument("--keep-audio", action="store_true", help="keep the extracted .mp3")
    args = ap.parse_args()

    video = Path(args.video)
    if not video.is_file():
        die(f"video not found: {video}")
    require_tool("ffmpeg")
    require_tool("ffprobe")
    client = build_client()

    out_dir = Path(args.out_dir) if args.out_dir else video.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = video.stem

    text_parts: list[str] = []
    segments: list[Segment] = []

    with tempfile.TemporaryDirectory() as tmp:
        tmpd = Path(tmp)
        audio = out_dir / f"{stem}.audio.mp3" if args.keep_audio else tmpd / "audio.mp3"
        print("→ extracting audio (mono 16 kHz mp3) via ffmpeg …")
        extract_audio(video, audio)
        size = audio.stat().st_size
        print(f"  audio: {size / 1_048_576:.1f} MB, {probe_duration(audio) / 60:.1f} min")

        if size <= MAX_UPLOAD_BYTES:
            print(f"→ transcribing with {args.model} …")
            text, segs = transcribe_file(client, audio, args.model, args.language, args.prompt)
            text_parts.append(text)
            segments.extend(segs)
        else:
            chunks = split_audio(audio, args.chunk_minutes * 60, tmpd)
            print(f"→ audio exceeds 25 MB — transcribing {len(chunks)} chunk(s) …")
            for idx, (chunk, offset) in enumerate(chunks, 1):
                print(f"  chunk {idx}/{len(chunks)} …")
                text, segs = transcribe_file(client, chunk, args.model, args.language, args.prompt)
                text_parts.append(text)
                segments.extend(Segment(s.start + offset, s.end + offset, s.text) for s in segs)

    full_text = "\n".join(p.strip() for p in text_parts if p.strip()).strip() + "\n"
    written: list[Path] = []

    txt = out_dir / f"{stem}.transcript.txt"
    txt.write_text(full_text, encoding="utf-8")
    written.append(txt)

    if segments:
        for suffix, content in (
            (".transcript.srt", to_srt(segments)),
            (".transcript.vtt", to_vtt(segments)),
            (".transcript.json", json.dumps([s.__dict__ for s in segments],
                                            indent=2, ensure_ascii=False)),
        ):
            path = out_dir / f"{stem}{suffix}"
            path.write_text(content, encoding="utf-8")
            written.append(path)
    else:
        print("  (model returned no timestamps — wrote plain text only)")

    print(f"✓ done — {len(full_text.split())} words")
    for path in written:
        print(f"  {path}")


if __name__ == "__main__":
    main()
