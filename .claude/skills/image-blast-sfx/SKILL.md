---
name: image-blast-sfx
description: Generate a sound effect or ambient sound.
argument-hint: [world-name] [world ambience, object-id impact, or custom SFX prompt]
allowed-tools: Read Write Glob Bash(ls *) Bash(node .claude/scripts/project/project-state.mjs *) Bash(node .claude/scripts/sfx/fal-elevenlabs-sfx.mjs *)
context: fork
agent: image-blast-sfx
---

Generate an SFX for project `$0`.

## Instructions

- If `$0` is missing, ask for the world slug.
- If the SFX target is missing or ambiguous, ask for exactly one request.
- Use `ls -a` before reading generated state.
- Choose one mode:
  - World ambience: output to `worlds/$0/output/sfx/`, use `--loop --count 2 --kind world-ambience --prefix ambient-loop --duration-seconds 10`.
  - Object impact: resolve one object, output to `worlds/$0/output/<object-id>/sfx/`, use `--count 4 --kind object-impact --prefix impact-<object-id> --duration-seconds 1`. Do not use `--loop`.
  - Custom SFX: use the supplied prompt, output to `worlds/$0/output/sfx/` unless an object is clearly specified, use `--kind arbitrary`.
- Prompt structure:
  - Object impact: `impact one-shot of <object material description from object.json>`.
  - World ambience: `ambience loop of <description of only ambient qualities of scene from image.json>`.

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

Run:

```bash
node .claude/scripts/sfx/fal-elevenlabs-sfx.mjs \
  --prompt "<sound prompt>" \
  --output-dir "<target output dir>" \
  --prefix "<safe prefix>" \
  --count "<1-4>" \
  --kind "<world-ambience|object-impact|arbitrary>" \
  --duration-seconds "<optional 0.5-22>" \
  --loop "<for world ambience or explicit loop requests>"
```

Add `--loop` only for world ambience or explicit looping requests. Avoid music or voices unless explicitly requested.

Final response: report generated audio files, loop status, request metadata, and prompt used.
