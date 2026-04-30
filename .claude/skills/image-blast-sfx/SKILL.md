---
name: image-blast-sfx
description: Generate world ambience loops, object impact sounds, or arbitrary sound effects with the FAL ElevenLabs SFX endpoint. Use when the user asks for SFX, ambient audio, looping scene sound, collision sounds, impact sounds, or object audio.
argument-hint: [world-name] [optional object-id or SFX prompt/instructions]
allowed-tools: Read Write Bash(node *) Glob
context: fork
agent: general-purpose
---

Generate sound effects for project `$0`. Additional object IDs, prompts, loop instructions, or count instructions may appear in `$ARGUMENTS`.

## Instructions

1. Require a project/world slug in `$0`. If missing, ask which `worlds/<world-name>/` directory to use.
2. Ensure the project envelope exists and read current state:

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

3. Before API calls, remind the user that this uses `FAL_KEY`, may incur FAL cost, and generates audio files. If the user directly invoked this skill, proceed.
4. Choose one mode:

**World ambience mode**

- Use when the user asks for ambient/world/scene/background audio.
- Read `worlds/$0/description.json` if it exists. If not, read `worlds/$0/image.json`, then `worlds/$0/project.json`, then `worlds/$0/output/world/world.json` as fallback context.
- Compose one concise prompt for a seamless looping ambient soundscape based on the world environment, atmosphere, visual style, lighting, weather, and mood.
- Output to `worlds/$0/output/sfx/`.
- Use `--loop --count 1 --kind world-ambience --prefix ambient-loop`.

**Object impact mode**

- Use when the user names an object or asks what an object sounds like when it hits, bumps, drops, scrapes, or knocks into something.
- Read `worlds/$0/objects.json` and, if present, `worlds/$0/output/<object-id>/object.json`.
- Compose one prompt for short non-looping impact sounds that match the object's material, mass, hollowness, fragility, and likely collision surfaces.
- Generate exactly 4 sounds.
- Output to `worlds/$0/output/<object-id>/sfx/`.
- Use `--count 4 --kind object-impact --prefix impact-<object-id>` and do not pass `--loop`.

**Arbitrary SFX mode**

- Use when the user gives a custom SFX request that is not tied to a specific object impact.
- Infer `count` from the request, clamped to 1-4. Default to 1.
- Infer loop/non-loop from the request. Default to non-looping unless the user asks for a loop, bed, ambience, drone, background, or seamless sound.
- Output to `worlds/$0/output/sfx/` unless the user clearly specifies an object, in which case output under that object's `sfx/` folder.
- Use `--kind arbitrary`.

5. Generate audio with:

```bash
node .claude/scripts/sfx/fal-elevenlabs-sfx.mjs \
  --prompt "<sound prompt>" \
  --output-dir "<target output dir>" \
  --prefix "<safe prefix>" \
  --count "<1-4>" \
  --kind "<world-ambience|object-impact|arbitrary>" \
  --duration-seconds "<optional 0.5-22>"
```

Add `--loop` only for looping sounds. Optional defaults are `--output-format mp3_44100_128` and `--prompt-influence 0.3`.

6. The helper writes audio files plus `sfx.json` in the output directory. Do not hand-edit generated audio metadata unless correcting paths after a manual file move.
7. Report:
   - generated file paths
   - whether each sound loops
   - manifest path
   - prompt used

## Prompt Guidance

- Avoid music unless the user asks for music.
- Avoid voices, dialogue, and recognizable copyrighted material unless explicitly requested and allowed.
- For loops, include "seamless loop, no obvious beginning or ending".
- For impacts, include "short, dry, non-musical, no reverb tail unless physically appropriate".
