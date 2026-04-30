---
name: image-blast-project
description: Create, inspect, and manage an Image Blast project envelope under worlds/<slug>. Use before image-blast-uncover, image-blast-world, image-blast-3d, image-blast-sfx, or whenever the user asks about active project state.
argument-hint: [world-name or description] [optional instructions]
allowed-tools: Read Write Bash(node *)
---

Create or inspect an Image Blast project. Input: `$ARGUMENTS`.

## Instructions

1. Resolve the project slug:
   - If `$0` is an existing `worlds/<slug>` directory or a slug-like name, use it.
   - Otherwise derive a lowercase hyphenated slug from `$ARGUMENTS`.
   - If no usable input is provided, ask the user which project/world to use.
2. Run the project-state helper from the repo root:

```bash
node .claude/scripts/project/project-state.mjs --world "<slug>"
```

3. The helper creates and validates:

```text
worlds/<slug>/
  project.json
  image.json
  objects.json
  source/
  output/
    world/
    sfx/
    <object-slug>/
  scene/
```

Only `project.json` and directories are created automatically. `image.json` and `objects.json` are written by `/image-blast-uncover`.

4. Read the printed project state or `worlds/<slug>/project.json`.
5. Report:
   - project slug and display name
   - source file count
   - whether World Labs output exists
   - whether `image.json` exists
   - whether `objects.json` exists and object counts by status
   - whether world-level SFX exists
   - whether `scene/project.json` exists
6. Recommend next actions without performing them unless the user asked:
   - `/image-blast-uncover <slug>` for image analysis and object manifest creation
   - `/image-blast-world <slug> ...` for World Labs generation
   - `/image-blast-3d <slug>` for object generation
   - `/image-blast-sfx <slug> ...` for ambient, object-impact, or arbitrary sound effects
   - `/threejs-edit <slug> ...` for scene edits
