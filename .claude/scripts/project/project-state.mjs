#!/usr/bin/env node
import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  one,
  parseArgs,
  pathExists,
  readJson,
  slugify,
  writeJson
} from "../asset-pipeline/fal-queue.mjs";

const PROJECT_DIRS = ["source", "output", "output/world", "output/sfx", "scene"];

async function readJsonIfExists(filePath) {
  return (await pathExists(filePath)) ? readJson(filePath) : undefined;
}

function displayNameFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function listFiles(dirPath) {
  if (!(await pathExists(dirPath))) return [];

  const files = [];
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function objectCounts(worldDir, objects) {
  const counts = { pending: 0, completed: 0, failed: 0 };
  for (const object of objects) {
    const objectId = object.id || slugify(object.name || "object");
    const objectDir = object.working_dir || path.join(worldDir, "output", objectId);
    const objectJson = await readJsonIfExists(path.join(objectDir, "object.json"));
    const status = objectJson?.object?.status || object.status || "pending";
    if (counts[status] === undefined) counts[status] = 0;
    counts[status] += 1;
  }
  return counts;
}

export async function ensureProjectState(options) {
  const { slug: rawSlug, description, displayName, write = true } = options;
  const slug = slugify(rawSlug || description || displayName || "");
  if (!slug) throw new Error("A project slug or description is required.");

  const worldDir = path.join("worlds", slug);
  for (const dir of PROJECT_DIRS) {
    await ensureDir(path.join(worldDir, dir));
  }

  const projectPath = path.join(worldDir, "project.json");
  const existingProject = await readJsonIfExists(projectPath);
  const imagePath = path.join(worldDir, "image.json");
  const objectsPath = path.join(worldDir, "objects.json");
  const worldJsonPath = path.join(worldDir, "output", "world", "world.json");
  const operationJsonPath = path.join(worldDir, "output", "world", "operation.json");
  const sfxPath = path.join(worldDir, "output", "sfx");
  const scenePath = path.join(worldDir, "scene", "project.json");

  const objectsFile = await readJsonIfExists(objectsPath);
  const objects = objectsFile?.objects || [];
  const sourceFiles = await listFiles(path.join(worldDir, "source"));
  const sfxFiles = await listFiles(sfxPath);
  const counts = await objectCounts(worldDir, objects);

  const project = {
    schema_version: 1,
    slug,
    display_name: displayName || existingProject?.display_name || displayNameFromSlug(slug),
    created_at: existingProject?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_files: sourceFiles,
    paths: {
      root: worldDir,
      source: path.join(worldDir, "source"),
      output: path.join(worldDir, "output"),
      world: path.join(worldDir, "output", "world"),
      sfx: sfxPath,
      scene: path.join(worldDir, "scene"),
      image: imagePath,
      objects: objectsPath
    },
    state: {
      has_world: await pathExists(worldJsonPath),
      has_world_operation: await pathExists(operationJsonPath),
      has_image: await pathExists(imagePath),
      has_objects: await pathExists(objectsPath),
      object_counts: counts,
      has_sfx: sfxFiles.length > 0,
      sfx_count: sfxFiles.length,
      has_scene: await pathExists(scenePath)
    }
  };

  if (write) await writeJson(projectPath, project);
  return project;
}

async function main() {
  const { flags, positionals } = parseArgs();
  const slug = one(flags, "world") || one(flags, "slug") || positionals[0];
  const description = one(flags, "description") || positionals.join(" ");
  const project = await ensureProjectState({
    slug,
    description,
    displayName: one(flags, "display-name"),
    write: one(flags, "write", "true") !== "false"
  });

  console.log(JSON.stringify(project, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
