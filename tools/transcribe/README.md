# tools/transcribe — video → text (OpenAI)

A small dev utility that extracts the audio from the challenge walkthrough video
and transcribes it with the OpenAI API, so the spoken requirements can be lifted
into `specs/`. It is **not** part of the app — it's a build-time helper.

## Prerequisites

- `ffmpeg` + `ffprobe` on PATH — macOS: `brew install ffmpeg`
- Python 3.10+
- An OpenAI API key with credit

## Setup

This is a **standalone** utility — keep its dependency out of the app's
environment. Two ways to run it, pick one:

**A. Zero-setup with [uv](https://docs.astral.sh/uv/)** (the script declares its
own deps via a PEP 723 header, so there's no venv to manage):

```bash
export OPENAI_API_KEY=sk-...
uv run tools/transcribe/transcribe.py
```

**B. Its own venv + pip** (portable, no extra tooling):

```bash
cd tools/transcribe
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=sk-...        # your key — never commit it (.env* is gitignored)
```

Either way, **do not** install this into the backend's venv — the app doesn't
depend on `openai`, and its `requirements.txt` should stay prod-only.

## Usage

From the repo root (default input is the challenge video):

```bash
python tools/transcribe/transcribe.py
# or point it at any file:
python tools/transcribe/transcribe.py "specs/raw_sources/Notetaking video.mp4"
```

Outputs are written next to the video:

- `Notetaking video.transcript.txt` — plain text (always)
- `Notetaking video.transcript.srt` / `.vtt` — timestamped captions
- `Notetaking video.transcript.json` — segments with start/end times

### Options

| Flag | Default | Notes |
|------|---------|-------|
| `--model` | `whisper-1` | `whisper-1` is the only model that returns timestamps. `gpt-4o-transcribe` / `gpt-4o-mini-transcribe` are higher-accuracy but **text-only**. |
| `--language` | auto | ISO-639-1 hint, e.g. `en`. |
| `--prompt` | – | Bias spelling of domain terms (e.g. `"notes app, CRUD, Django, Next.js"`). |
| `--out-dir` | next to video | Where to write the transcript files. |
| `--keep-audio` | off | Keep the extracted `.mp3`. |
| `--chunk-minutes` | 20 | Only used if the audio exceeds the 25 MB upload limit. |

### Getting the cleanest text for spec-writing

`whisper-1` gives you text **and** timestamps in one pass. If you want a
higher-accuracy plain-text pass as well:

```bash
python tools/transcribe/transcribe.py --model gpt-4o-transcribe \
  --prompt "notes-taking app, CRUD, Django, Next.js, Figma"
```

## Notes

- The API limit is 25 MB per upload; the utility compresses to mono 16 kHz mp3
  (a ~5-min video is only a few MB) and auto-chunks if you ever feed it something
  huge.
- Cost is a few cents for a short video. Check current pricing before large runs.
- The key is read from `$OPENAI_API_KEY` and never written to disk.
