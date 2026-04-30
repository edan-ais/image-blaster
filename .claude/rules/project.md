# Project: Compendium

## First-time setup

1. Copy `.env.example` to `.env` at the project root and fill in the required keys:
   - `WORLD_LABS_API_KEY` — required for `/image-blast-world`
   - `FAL_KEY` — required for `/image-blast-3d` image/mesh generation and `/image-blast-sfx` sound generation
2. From `app/`: run `bun install`
3. `worlds/` and `input/` are gitignored — create them if missing: `mkdir -p worlds input`

## Skills

Invokable as slash commands. Full instructions in `.claude/skills/<name>/SKILL.md`.

- `/image-blast-project [world-name or description]` — creates or inspects the canonical project envelope, writes `project.json`, and reports current state
- `/image-blast-world [world-name] [description]` — generates a world via World Labs API using `worlds/<world>/source/` as the stable source-image location
- `/threejs-edit [world-name] [instructions]` — add/modify/remove Three.js objects in a world's scene
- `/image-blast-uncover [world-name]` — deeply analyzes `input/` and `worlds/<world>/source/` images with agent image understanding, writes `image.json`, and saves or updates the approved object manifest
- `/image-blast-3d [world-name]` — reads the approved object manifest and generates or regenerates isolated object images and PBR meshes using FAL-backed helper scripts; can also create one object directly from a supplied image path
- `/image-blast-sfx [world-name]` — generates world ambience loops, object impact sounds, or arbitrary sound effects using the FAL ElevenLabs SFX endpoint

## Working directory structure

```
worlds/
  <world-slug>/
    project.json  Project envelope and current state, written by /image-blast-project.
    image.json    Rich image analysis, written by /image-blast-uncover.
    objects.json  Approved object queue, consumed by /image-blast-3d.
    source/       User-supplied input (images, prompts). Used as the stable source location.
    output/
      world/      World Labs API output: world.json, operation.json
      sfx/        World-level ambience and arbitrary sound effects: audio files plus sfx.json
      <object>/   Object pipeline output: object.json plus generated images and meshes.
        sfx/      Object-specific impact or interaction sounds.
    scene/        project.json — Three.js editor App-format scene file

input/         Staging area for files before they're associated with a world (gitignored)
```

`<world-slug>` is lowercase and hyphenated (e.g. `snowy-mountain-cabin`).

## Key files

- `worlds/<slug>/project.json` — centralized project state written by `/image-blast-project`.
- `worlds/<slug>/output/world/world.json` — World Labs world object. Required for the React app to load the world.
- `worlds/<slug>/scene/project.json` — Three.js editor scene. Written by `/threejs-edit`, loaded by the React app.
- `worlds/<slug>/image.json` — rich image analysis written by `/image-blast-uncover`.
- `worlds/<slug>/objects.json` — approved object manifest written by `/image-blast-uncover`, consumed by `/image-blast-3d`.
- `worlds/<slug>/output/sfx/sfx.json` — world-level or arbitrary SFX manifest written by `/image-blast-sfx`.
- `worlds/<slug>/output/<object>/sfx/sfx.json` — object-specific SFX manifest written by `/image-blast-sfx`.

## `input/` staging

Drop images, audio, or other files into `input/`, then tell Claude what to do with them. `/image-blast-project` owns moving or copying staged files into a stable project location when needed. After use, files belong under `worlds/<slug>/source/` or `worlds/<slug>/output/`.
