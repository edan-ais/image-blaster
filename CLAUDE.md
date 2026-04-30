# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Compendium is a collection of Claude skills for generating and viewing 3D worlds using the World Labs API and Three.js. It has two main components:

1. **Claude Skills** (`.claude/skills/`) — invokable via `/skill-name`, use World Labs and FAL APIs plus agent image understanding to generate and process worlds
2. **React Viewer** (`app/`) — TypeScript + SparkJS + React Three Fibre app that loads and displays generated worlds

The two components share a **working directory** (`worlds/`) that is not tracked by git. The `input/` folder at the project root is a staging area for user-supplied files (also gitignored).

## Environment Setup

Copy `.env.example` to `.env` and fill in the keys:

```
WORLD_LABS_API_KEY=   # Required for /image-blast-world
FAL_KEY=              # Required for /image-blast-3d and /image-blast-sfx
```

## Commands

```bash
# From app/
bun install
bun dev           # start dev server (http://localhost:5173)
bun run build     # production build
bun test          # run tests
bun run typecheck # tsc --noEmit
```

## Architecture

### Working Directory Structure

All skills and the React app read/write from `worlds/` (gitignored):

```
worlds/
  <world-name>/
    project.json # project envelope and current state
    image.json   # rich image analysis from /image-blast-uncover
    objects.json # approved object queue for /image-blast-3d
    source/      # user-supplied input files (images, prompts, etc.)
    output/
      world/     # /image-blast-world output (world.json, operation.json)
      sfx/       # world-level ambience and arbitrary SFX
      <object>/  # generated object images, meshes, and object.json
        sfx/     # object-specific impact or interaction sounds
    scene/       # project.json — Three.js editor scene file for arbitrary objects
```

**`scene/project.json`** is the mechanism for arbitrary objects in a world. It uses the Three.js editor's native format (`metadata.type: "App"`, wrapping `THREE.ObjectLoader`-compatible `scene` and `camera` objects as plain JSON). Claude writes objects into it via the `threejs-edit` skill; the Three.js editor can open, modify, and save the same file directly. The React app loads it on world load using `THREE.ObjectLoader` and mounts the objects into the R3F scene. This is the shared contract between Claude and the editor.

### Claude Skills (`.claude/skills/`)

Skills are Claude Code skills per https://code.claude.com/docs/en/skills. Each skill lives at `.claude/skills/<skill-name>/SKILL.md` and is invokable as `/<skill-name>`. Shared world structure context is in `.claude/rules/project.md` (auto-loaded every session).

**`/image-blast-project [world-name or description]`** — Creates or inspects the canonical `worlds/<name>/` project envelope, writes `project.json`, reports state, and recommends next actions.

**`/image-blast-world [world-name] [description]`** — Ensures the project envelope exists, then calls the World Labs API (https://docs.worldlabs.ai/), polls until complete, and writes artifacts to `worlds/<name>/output/world/world.json`. Runs in a forked subagent so the 5-minute poll doesn't block conversation.

**`/threejs-edit [world-name] [instructions]`** — Reads and writes `worlds/<name>/scene/project.json` to add or modify Three.js objects in a world's scene.

**`/image-blast-uncover [world-name]`** — Scans images in `input/` and `worlds/<name>/source/`, uses agent image understanding to write rich scene analysis to `worlds/<name>/image.json`, and saves or updates the approved object manifest at `worlds/<name>/objects.json`.

**`/image-blast-3d [world-name]`** — Reads `worlds/<name>/objects.json` and generates or regenerates objects under `worlds/<name>/output/<object-id>/` using FAL-backed helper scripts for image isolation and Hunyuan 3D PBR mesh generation. It can also create a single object directly from a supplied image path and description.

**`/image-blast-sfx [world-name]`** — Generates world ambience loops, object impact sounds, or arbitrary sound effects using the FAL ElevenLabs SFX endpoint. World and arbitrary SFX are saved under `worlds/<name>/output/sfx/`; object sounds are saved under `worlds/<name>/output/<object-id>/sfx/`.

FAL API calls are implementation scripts under `.claude/scripts/asset-pipeline/` and `.claude/scripts/sfx/`, not standalone slash-command skills. The workflow skills document when and how Claude should call those scripts.

**`input/` staging** — Drop images or other assets into `input/` (gitignored), then ask Claude what to do with them. Claude will check this folder automatically when creating worlds or processing assets.

### React Viewer (`app/`)

Stack: TypeScript, Vite, React Three Fibre (https://r3f.docs.pmnd.rs/), SparkJS (https://sparkjs.dev/), Leva, Wouter (routing), Tailwind CSS.

SparkJS is available as a public npm package.

The app must be highly modular with strict separation of concerns. Each system lives in its own file/hook and has no knowledge of unrelated systems — character controller, audio, post-processing, loading/transition effects, and splat rendering are all independent modules that compose together at the scene level.

**Routing**: Use `wouter` (simplest React router, ~2kb). The active world is driven by the URL path: `/<world-name>`. The default route (`/`) loads the first available world. Navigating to a world slug updates the URL and triggers the world transition util.

**Mobile-first**: The app is designed mobile-first using Tailwind CSS for all breakpoints. The character controller must support touch input on mobile alongside keyboard/mouse on desktop.

Key behaviors:
- **World list sidebar** (right column): reads `worlds/` at runtime, shows thumbnail + slug per world; clicking a world navigates to `/<world-name>`
- **World loading**: a shared util handles all transitions — fade out current world (splat, audio, etc.), teleport character to origin, fade in new world using SparkJS reveal effects (https://sparkjs.dev/examples/#splat-reveal-effects)
- **Per-world rendering**: splat via SparkJS, environment map from panorama `.png`, invisible physics collider from `.glb`, scene objects from `scene/scene.json`
- **Audio**: any audio files in `worlds/<name>/output/` loop in the background while that world is active
- **Character controller**: use `@react-three/rapier` with a minimal out-of-the-box capsule controller. Mouse input must have motion smoothing applied. Touch input required for mobile.
- **Post-processing**: motion blur (required), bloom (minimal/subtle), chromatic aberration (minimal/subtle). Each effect is its own module.
- **Debug panel**: Leva panel (https://github.com/pmndrs/leva) exposes post-processing params, world load speed, etc.
- **Scene editor**: The Three.js editor (https://github.com/mrdoob/three.js/tree/master/editor) is used as a standalone tool for inspecting and editing world scenes. It is not embedded in the React app — it runs separately and edits `scene/scene.json` directly.

### Tests

Three areas to cover:
1. `.env` loads correctly and keys are accessible
2. React app can read world files that were included in the build (worlds are bundled as static assets via Vite config at build time, not read from the filesystem at runtime)
3. Each skill can read from `worlds/` and all skills load without error

## Key External APIs

- World Labs API docs: https://docs.worldlabs.ai/
- FAL model APIs: https://fal.ai/models
- FAL ElevenLabs sound effects endpoint: https://fal.ai/models/fal-ai/elevenlabs/sound-effects/v2
- SparkJS docs: https://sparkjs.dev/
- React Three Fibre docs: https://r3f.docs.pmnd.rs/
- Leva: https://github.com/pmndrs/leva
- Wouter: https://github.com/molefrog/wouter
- Three.js Editor: https://github.com/mrdoob/three.js/tree/master/editor
