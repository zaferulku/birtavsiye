#!/usr/bin/env node
/**
 * Chatbot dialog eval runner — Paket Ç (conversationState) regression suite.
 *
 * JSONL'den dialog'ları okur, her turn'ü /api/chat'e POST eder,
 * meta.state / mergeAction / products.length'i expected ile karşılaştırır.
 * Pass/fail rapor üretir + tests/chatbot/eval-report-{ISO}.json yazar.
 *
 * Kullanim:
 *   node scripts/eval-chatbot-dialogs.mjs --input <jsonl>
 *   node scripts/eval-chatbot-dialogs.mjs --input <jsonl> --limit 5
 *   node scripts/eval-chatbot-dialogs.mjs --input <jsonl> --scenario filter_remove
 *   node scripts/eval-chatbot-dialogs.mjs --input <jsonl> --category akilli-telefon
 *   node scripts/eval-chatbot-dialogs.mjs --input <jsonl> --url https://birtavsiye.net/api/chat
 *
 * Ön-koşul:
 *   - localhost:3000 ayakta (npm run dev)
 *   - Paket Ç: src/lib/chatbot/conversationState.ts var, /api/chat
 *     response'unda meta.state + meta.mergeAction dönüyor
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (idx === -1) return null;
  const eq = args[idx].indexOf("=");
  if (eq !== -1) return args[idx].slice(eq + 1);
  return args[idx + 1] ?? null;
}

const inputPath = getArg("input") || "tests/chatbot/fixtures/chatbot_dialogs_200.jsonl";
const url = getArg("url") || "http://localhost:3000/api/chat";
const limit = parseInt(getArg("limit") || "0", 10);
const filterScenario = getArg("scenario");
const filterCategory = getArg("category");
const turnTimeoutMs = parseInt(getArg("timeout") || "30000", 10);

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  console.error("JSONL dosyasını tests/chatbot/fixtures/chatbot_dialogs_200.jsonl yoluna koy ya da --input ile yol ver.");
  process.exit(2);
}

const raw = fs.readFileSync(inputPath, "utf8");
const lines = raw.split("\n").filter((l) => l.trim().length > 0);

let dialogs = [];
for (let i = 0; i < lines.length; i++) {
  try {
    dialogs.push(JSON.parse(lines[i]));
  } catch (e) {
    console.error(`Parse error line ${i + 1}: ${e.message}`);
  }
}

console.log(`Loaded ${dialogs.length} dialogs from ${inputPath}`);

if (filterScenario) {
  const before = dialogs.length;
  dialogs = dialogs.filter((d) => d.scenario_type === filterScenario);
  console.log(`Scenario filter '${filterScenario}': ${before} → ${dialogs.length}`);
}
if (filterCategory) {
  const before = dialogs.length;
  dialogs = dialogs.filter((d) => d.category_slug === filterCategory);
  console.log(`Category filter '${filterCategory}': ${before} → ${dialogs.length}`);
}
if (limit > 0) {
  dialogs = dialogs.slice(0, limit);
  console.log(`Limit ${limit} applied → ${dialogs.length}`);
}

if (dialogs.length === 0) {
  console.error("No dialogs to run after filters.");
  process.exit(2);
}

console.log(`Target URL: ${url}`);
console.log(`Turn timeout: ${turnTimeoutMs}ms`);

function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  if (!ak.every((k, i) => k === bk[i])) return false;
  return ak.every((k) => deepEqual(a[k], b[k]));
}

// Internal Paket Ç counters/helpers that should not be part of regression spec.
const IGNORE_STATE_FIELDS = ["turn_count_in_category", "last_set_dimensions"];

// variant_color_patterns appears two ways:
//   intentParser output (state):  ["beyaz", "kırmızı"]              (raw)
//   smart_search RPC layer:       ["%Beyaz%", "%Kırmızı%"]           (LIKE wildcards)
// Until the architectural split is enforced (state ham, RPC wildcards),
// the eval normalizes both sides to the raw lowercase form.
function normalizeColorPatterns(patterns) {
  if (!Array.isArray(patterns)) return [];
  return patterns
    .map((p) => String(p).toLowerCase().replace(/^%+|%+$/g, "").trim())
    .filter((p) => p.length > 0)
    .sort();
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x === b[i]);
}

// Subset semantics: every key declared in `expected` must match in `actual`.
// Keys present in `actual` but absent in `expected` are tolerated — this lets
// older fixtures (no intent_type field) coexist with newer ones (with it).
// IGNORE_STATE_FIELDS are stripped from both sides regardless.
function compareState(expected, actual) {
  if (expected == null) return true;
  if (actual == null) return false;
  const exp = { ...expected };
  const act = { ...actual };
  for (const f of IGNORE_STATE_FIELDS) {
    delete exp[f];
    delete act[f];
  }
  for (const k of Object.keys(exp)) {
    if (k === "variant_color_patterns") {
      if (!arraysEqual(normalizeColorPatterns(exp[k]), normalizeColorPatterns(act[k]))) {
        return false;
      }
      continue;
    }
    if (!deepEqual(exp[k], act[k])) return false;
  }
  return true;
}

// Diff for human-readable failure reports. Mirrors compareState semantics:
// only surfaces keys from `expected` (plus the same key from actual) and
// hides IGNORE_STATE_FIELDS, so the diff doesn't drown in internal noise.
function diffObj(expected, actual) {
  const out = {};
  if (expected == null) return out;
  for (const k of Object.keys(expected)) {
    if (IGNORE_STATE_FIELDS.includes(k)) continue;
    if (k === "variant_color_patterns") {
      const e = normalizeColorPatterns(expected[k]);
      const a = normalizeColorPatterns(actual?.[k]);
      if (!arraysEqual(e, a)) {
        out[k] = { expected: expected[k], actual: actual?.[k] };
      }
      continue;
    }
    if (!deepEqual(expected[k], actual?.[k])) {
      out[k] = { expected: expected[k], actual: actual?.[k] };
    }
  }
  return out;
}

// Body shape matches /api/chat route contract:
//   { message: string, history: Array<{role,content,meta?}>, chatSessionId: string }
// Each assistant entry in `history` MUST carry meta.state so Paket Ç
// (rebuildStateFromHistory) can rehydrate conversationState across turns —
// otherwise the bot evaluates each turn statelessly and the regression suite
// loses its point.
async function postChat(message, history, chatSessionId, abortMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), abortMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, chatSessionId }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: body.slice(0, 300) };
    }
    const json = await res.json();
    return { ok: true, json };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: e.message || String(e) };
  }
}

const stats = {
  total: 0,
  pass: 0,
  fail: 0,
  byScenario: {},
  byCategory: {},
  fails: [],
};

const startTime = Date.now();

for (const dialog of dialogs) {
  const sc = dialog.scenario_type || "unknown";
  const cat = dialog.category_slug || "unknown";
  if (!stats.byScenario[sc]) stats.byScenario[sc] = { total: 0, pass: 0, fail: 0 };
  if (!stats.byCategory[cat]) stats.byCategory[cat] = { total: 0, pass: 0, fail: 0 };

  let history = [];
  let dialogPass = true;
  const chatSessionId = `eval-${dialog.id}-${startTime}`;

  for (let ti = 0; ti < dialog.turns.length; ti++) {
    const turn = dialog.turns[ti];
    if (turn.role !== "user") continue;

    const userMsg = turn.msg;

    // Skip proactive bot turns (is_proactive_suggestion: true) when looking up
    // the next expected-bot turn — they have no preceding user input.
    let nextBotIdx = ti + 1;
    while (
      dialog.turns[nextBotIdx] &&
      dialog.turns[nextBotIdx].role === "bot" &&
      dialog.turns[nextBotIdx].is_proactive_suggestion === true
    ) {
      nextBotIdx++;
    }
    const nextBot = dialog.turns[nextBotIdx];
    const hasExpected = nextBot && nextBot.role === "bot" &&
      (nextBot.expected_state !== undefined ||
        nextBot.expected_action !== undefined ||
        nextBot.expected_intent_type !== undefined ||
        nextBot.expected_short_response !== undefined ||
        nextBot.expected_product_count_min !== undefined);

    const result = await postChat(userMsg, history, chatSessionId, turnTimeoutMs);

    if (!result.ok) {
      dialogPass = false;
      if (stats.fails.length < 10) {
        stats.fails.push({
          dialog_id: dialog.id,
          scenario: sc,
          category: cat,
          turn_index: ti,
          reason: "request_failed",
          detail: result.error || `HTTP ${result.status}: ${result.body}`,
        });
      }
      break;
    }

    const j = result.json;
    const actualState = j.meta?.state ?? null;
    const actualAction = j.meta?.mergeAction ?? null;
    const productCount = Array.isArray(j.products) ? j.products.length : 0;

    if (hasExpected) {
      const stateOk = nextBot.expected_state === undefined ||
        compareState(nextBot.expected_state, actualState);
      const actionOk = nextBot.expected_action === undefined ||
        actualAction === nextBot.expected_action;
      const intentOk = nextBot.expected_intent_type === undefined ||
        (actualState?.intent_type ?? null) === nextBot.expected_intent_type;
      const replyText = typeof j.reply === "string" ? j.reply : "";
      const SHORT_RESP_MAX_LEN = 120;
      const shortOk = nextBot.expected_short_response === undefined ||
        nextBot.expected_short_response !== true ||
        replyText.length <= SHORT_RESP_MAX_LEN;
      const countMin = nextBot.expected_product_count_min ?? 0;
      const countMax = nextBot.expected_product_count_max ?? Number.POSITIVE_INFINITY;
      const countOk = productCount >= countMin && productCount <= countMax;

      if (!stateOk || !actionOk || !intentOk || !shortOk || !countOk) {
        dialogPass = false;
        if (stats.fails.length < 10) {
          stats.fails.push({
            dialog_id: dialog.id,
            scenario: sc,
            category: cat,
            turn_index: ti,
            stateOk,
            actionOk,
            intentOk,
            shortOk,
            countOk,
            state_diff: stateOk ? null : diffObj(nextBot.expected_state, actualState),
            expected_action: nextBot.expected_action,
            actual_action: actualAction,
            expected_intent_type: nextBot.expected_intent_type,
            actual_intent_type: actualState?.intent_type ?? null,
            expected_short_response: nextBot.expected_short_response,
            actual_reply_len: replyText.length,
            expected_count: [countMin, Number.isFinite(countMax) ? countMax : null],
            actual_count: productCount,
            bot_msg: replyText.slice(0, 150),
          });
        }
        break;
      }
    }

    // Persist the round-trip so the next turn carries full state context.
    // assistant.meta is REQUIRED — Paket Ç rebuildStateFromHistory walks
    // history backwards looking for `m.meta.category_slug` (TOP-LEVEL on
    // meta, NOT meta.state). Production useChatStore.getHistoryForBackend
    // already unwraps response.meta.state into history's `meta:` field;
    // we must mirror that here.
    history.push({ role: "user", content: userMsg });
    history.push({
      role: "assistant",
      content: j.reply ?? "",
      meta: actualState ?? undefined,
    });
  }

  stats.total++;
  stats.byScenario[sc].total++;
  stats.byCategory[cat].total++;
  if (dialogPass) {
    stats.pass++;
    stats.byScenario[sc].pass++;
    stats.byCategory[cat].pass++;
  } else {
    stats.fail++;
    stats.byScenario[sc].fail++;
    stats.byCategory[cat].fail++;
  }

  if (stats.total % 10 === 0) {
    console.log(`  progress: ${stats.total}/${dialogs.length}  pass=${stats.pass} fail=${stats.fail}`);
  }
}

const elapsed = Math.round((Date.now() - startTime) / 1000);
const passRate = stats.total > 0 ? (stats.pass / stats.total) * 100 : 0;

console.log(`\n=== EVAL DONE in ${elapsed}s ===`);
console.log(`Total: ${stats.total}, Pass: ${stats.pass}, Fail: ${stats.fail}, Rate: ${passRate.toFixed(1)}%`);

console.log("\n=== Per scenario (sorted by fail count) ===");
const scEntries = Object.entries(stats.byScenario).sort(([, a], [, b]) => b.fail - a.fail);
for (const [sc, s] of scEntries) {
  const r = s.total > 0 ? (s.pass / s.total) * 100 : 0;
  console.log(`  ${sc.padEnd(28)} ${s.pass}/${s.total} (${r.toFixed(0)}%)`);
}

console.log("\n=== Per category (top 15 by fail count) ===");
const catEntries = Object.entries(stats.byCategory)
  .filter(([, s]) => s.fail > 0)
  .sort(([, a], [, b]) => b.fail - a.fail)
  .slice(0, 15);
if (catEntries.length === 0) {
  console.log("  (no fails)");
}
for (const [c, s] of catEntries) {
  const r = s.total > 0 ? (s.pass / s.total) * 100 : 0;
  console.log(`  ${c.padEnd(28)} ${s.pass}/${s.total} (${r.toFixed(0)}%)`);
}

if (stats.fails.length > 0) {
  console.log("\n=== First fails (max 10) ===");
  for (const f of stats.fails) {
    console.log(`  dialog ${f.dialog_id} turn ${f.turn_index} [${f.scenario}/${f.category}]`);
    if (f.reason === "request_failed") {
      console.log(`    request_failed: ${f.detail}`);
    } else {
      if (!f.actionOk) console.log(`    action: expected=${f.expected_action} actual=${f.actual_action}`);
      if (f.intentOk === false) console.log(`    intent: expected=${f.expected_intent_type} actual=${f.actual_intent_type}`);
      if (f.shortOk === false) console.log(`    short_resp: expected=true actual_len=${f.actual_reply_len} (max 120)`);
      if (!f.countOk) console.log(`    count: expected=[${f.expected_count.join(",")}] actual=${f.actual_count}`);
      if (f.state_diff) console.log(`    state_diff: ${JSON.stringify(f.state_diff).slice(0, 250)}`);
      if (f.bot_msg) console.log(`    bot: "${f.bot_msg}"`);
    }
  }
}

const reportDir = path.dirname(inputPath).replace(/[\\/]fixtures$/, "");
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(
  reportDir,
  `eval-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      startedAt: new Date(startTime).toISOString(),
      elapsedSec: elapsed,
      url,
      inputPath,
      filters: { scenario: filterScenario, category: filterCategory, limit },
      stats,
    },
    null,
    2,
  ),
);
console.log(`\nReport: ${reportPath}`);

process.exit(stats.fail === 0 ? 0 : 1);
