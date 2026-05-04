---
name: image-blast-world
description: Generate the 3D static environment of a world.
argument-hint: [world-name] [optional image path or world prompt]
allowed-tools: Read Write Glob Bash(ls *) Bash(node .claude/scripts/project/project-state.mjs *) Bash(node .claude/scripts/world/generate-world.mjs *)
context: fork
agent: image-blast-world
---

Create or resume one World Labs world for project `$0`.

## Instructions

- If `$0` is missing, ask for the world slug.
- Use `ls -a` before reading generated state.
- Use an explicit image path or prompt from `$ARGUMENTS` when provided.
- Without an explicit image, the world helper uses the highest-index visible image in `worlds/$0/source/`.
- The helper resumes unfinished `operation.json`, strips base64 before writing JSON, polls World Labs, and writes `world.json`.

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

Run:

```bash
node .claude/scripts/world/generate-world.mjs --world "$0"
```

Only pass `--image` or `--prompt` when explicitly provided. For explicit regeneration, append `--regenerate`.

```bash
node .claude/scripts/project/project-state.mjs --world "$0"
```

Final response: report the source image used when relevant, the world output path, downloaded `.glb` and `.spz` paths if present, and any failure/resume metadata.
