#!/usr/bin/env node
/**
 * Knowledge Base Ingestion Script
 *
 * docs/knowledge/*.md dosyalarını tarar, chunk'lara böler, Gemini ile
 * embedding hesaplar, knowledge_chunks tablosuna yazar.
 *
 * Kullanım:
 *   node --env-file=.env.local scripts/ingest-knowledge.mjs
 *   node --env-file=.env.local scripts/ingest-knowledge.mjs --dry-run
 *   node --env-file=.env.local scripts/ingest-knowledge.mjs --file parfum_notalari.md
 *   node --env-file=.env.local scripts/ingest-knowledge.mjs --rebuild
 */

import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import { createHash } from "crypto";
import { join, basename } from "path";

const KB_DIR = "docs/knowledge";
const DRY_RUN = process.argv.includes("--dry-run");
const REBUILD = process.argv.includes("--rebuild");
const FILE_FILTER = getArg("--file");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const GEMINI_EMBED_DIM = 768;

const EMBED_RPM = 10;
const EMBED_DELAY_MS = Math.ceil(60_000 / EMBED_RPM);

const MIN_CHUNK_LENGTH = 50;
const MAX_CHUNK_LENGTH = 2000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1];
}

function parseMarkdown(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    return { frontmatter: {}, body: content };
  }

  const [, yamlBlock, body] = frontmatterMatch;
  const frontmatter = {};

  for (const line of yamlBlock.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      const [, key, value] = m;
      frontmatter[key.trim()] = value.trim();
    }
  }

  return { frontmatter, body };
}

function chunkBody(body) {
  const rawChunks = body
    .split(/\n---\n/)
    .map((c) => c.trim())
    .filter((c) => c.length >= MIN_CHUNK_LENGTH);

  const chunks = [];

  for (const raw of rawChunks) {
    if (raw.length > MAX_CHUNK_LENGTH && /\n## /.test(raw)) {
      const h2Sections = raw.split(/\n(?=## )/);
      for (const section of h2Sections) {
        const sub = section.trim();
        if (sub.length >= MIN_CHUNK_LENGTH) {
          chunks.push(extractChunkMetadata(sub));
        }
      }
    } else if (raw.length > MAX_CHUNK_LENGTH) {
      const paragraphs = raw.split(/\n\n+/);
      let current = "";
      for (const p of paragraphs) {
        if ((current + "\n\n" + p).length > MAX_CHUNK_LENGTH) {
          if (current.length >= MIN_CHUNK_LENGTH) {
            chunks.push(extractChunkMetadata(current));
          }
          current = p;
        } else {
          current = current ? current + "\n\n" + p : p;
        }
      }
      if (current.length >= MIN_CHUNK_LENGTH) {
        chunks.push(extractChunkMetadata(current));
      }
    } else {
      chunks.push(extractChunkMetadata(raw));
    }
  }

  return chunks;
}

function extractChunkMetadata(chunkText) {
  const titleMatch = chunkText.match(/^#+\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const keywordSet = new Set();

  const boldMatches = chunkText.matchAll(/\*\*([^*]+)\*\*/g);
  for (const m of boldMatches) {
    const kw = m[1].trim().toLowerCase();
    if (kw.length >= 3 && kw.length <= 40) {
      keywordSet.add(kw);
    }
  }

  const listMatches = chunkText.matchAll(/^[\*\-]\s+(.+)$/gm);
  for (const m of listMatches) {
    const text = m[1].trim();
    const firstToken = text.split(/[:,.\(]/)[0].trim().toLowerCase();
    if (firstToken.length >= 3 && firstToken.length <= 40) {
      keywordSet.add(firstToken);
    }
  }

  return {
    title,
    content: chunkText,
    keywords: [...keywordSet].slice(0, 20),
  };
}

async function embedText(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

  const body = {
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: GEMINI_EMBED_DIM,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini embedding failed: ${response.status} ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;

  if (!Array.isArray(values) || values.length !== GEMINI_EMBED_DIM) {
    throw new Error(`Unexpected embedding shape: length ${values?.length}`);
  }

  return values;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processFile(filePath) {
  const fileName = basename(filePath);
  const content = await readFile(filePath, "utf8");
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 16);

  if (!REBUILD) {
    const { data: existing } = await supabase
      .from("knowledge_chunks")
      .select("id", { count: "exact", head: true })
      .eq("source", fileName)
      .eq("source_hash", hash)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  [skip] ${fileName} unchanged (hash ${hash.slice(0, 8)})`);
      return { skipped: true };
    }
  }

  const { frontmatter, body } = parseMarkdown(content);
  const chunks = chunkBody(body);

  if (chunks.length === 0) {
    console.warn(`  [warn] ${fileName} produced 0 chunks`);
    return { chunks: 0 };
  }

  console.log(`  [file] ${fileName}: ${chunks.length} chunks`);

  if (DRY_RUN) {
    for (let i = 0; i < Math.min(3, chunks.length); i++) {
      const c = chunks[i];
      console.log(`     [${i}] "${c.title?.slice(0, 40) || "(untitled)"}" — ${c.content.length} chars — kw: ${c.keywords.slice(0, 5).join(", ")}`);
    }
    if (chunks.length > 3) console.log(`     ... and ${chunks.length - 3} more`);
    return { chunks: chunks.length, dryRun: true };
  }

  const { error: delError } = await supabase
    .from("knowledge_chunks")
    .delete()
    .eq("source", fileName);

  if (delError) {
    console.warn(`  [warn] Delete old chunks failed:`, delError.message);
  }

  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];

    try {
      if (i > 0) await sleep(EMBED_DELAY_MS);

      const embedding = await embedText(c.content);

      const row = {
        source: fileName,
        source_hash: hash,
        chunk_index: i,
        category_slug: frontmatter.category_slug || null,
        topic: frontmatter.topic || null,
        language: frontmatter.language || "tr",
        title: c.title,
        content: c.content,
        keywords: c.keywords.length > 0 ? c.keywords : null,
        embedding,
      };

      const { error } = await supabase.from("knowledge_chunks").insert(row);

      if (error) {
        console.error(`     [fail] chunk ${i}:`, error.message);
        failed++;
      } else {
        inserted++;
        process.stdout.write(".");
      }
    } catch (err) {
      console.error(`     [fail] chunk ${i} embedding:`, err.message);
      failed++;
    }
  }

  console.log("");
  return { chunks: chunks.length, inserted, failed };
}

async function main() {
  console.log(`\n[ingest] Knowledge Base Ingestion`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : REBUILD ? "REBUILD" : "INCREMENTAL"}`);
  console.log(`KB Dir: ${KB_DIR}`);
  if (FILE_FILTER) console.log(`File filter: ${FILE_FILTER}`);
  console.log("");

  let files;
  try {
    files = await readdir(KB_DIR);
  } catch (err) {
    console.error(`[fail] Cannot read ${KB_DIR}:`, err.message);
    process.exit(1);
  }

  files = files.filter((f) => f.endsWith(".md"));
  if (FILE_FILTER) {
    files = files.filter((f) => f.includes(FILE_FILTER));
  }

  if (files.length === 0) {
    console.log(`No markdown files to process in ${KB_DIR}.`);
    process.exit(0);
  }

  console.log(`Found ${files.length} markdown files:\n`);

  const stats = {
    processed: 0,
    skipped: 0,
    totalChunks: 0,
    totalInserted: 0,
    totalFailed: 0,
  };

  for (const file of files) {
    const filePath = join(KB_DIR, file);
    const result = await processFile(filePath);

    if (result.skipped) {
      stats.skipped++;
    } else {
      stats.processed++;
      stats.totalChunks += result.chunks || 0;
      stats.totalInserted += result.inserted || 0;
      stats.totalFailed += result.failed || 0;
    }
  }

  console.log(`\n=== Ingestion Report ===`);
  console.log(`Files processed:  ${stats.processed}`);
  console.log(`Files skipped:    ${stats.skipped} (unchanged)`);
  console.log(`Total chunks:     ${stats.totalChunks}`);
  console.log(`Inserted:         ${stats.totalInserted}`);
  console.log(`Failed:           ${stats.totalFailed}`);
  console.log("");

  if (stats.totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n[fatal]`, err);
  process.exit(1);
});
