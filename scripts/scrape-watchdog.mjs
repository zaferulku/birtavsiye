#!/usr/bin/env node
/**
 * Scrape watchdog — 24 saat boyunca PTT + MM scraper proseslerini izler,
 * olurse yeniden baslatir.
 *
 * Pacing (kullanici karari 2026-05-02):
 *   - Ilk 4 saat:    her 10 dakikada bir tick
 *   - Sonraki 20 saat: her 30 dakikada bir tick
 *   - 24 saat sonra:    cikis (gerekirse cron ile yeniden baslatilir)
 *
 * Cagri:
 *   nohup node scripts/scrape-watchdog.mjs > /tmp/watchdog.log 2>&1 &
 *
 * Durdurmak icin: kill <PID>. State'i temizlemek icin scripts/watchdog-state.json sil.
 *
 * Kalici recovery (computer restart sonrasi): Windows Task Scheduler veya
 * cron ile bu script'i logon'da otomatik baslat. Bu sprint'te yapilmadi.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, openSync } from 'node:fs';

const STATE_FILE = './scripts/watchdog-state.json';
// Windows uyumlu path: /tmp Git Bash sandbox'inda var ama node fs'de C:\tmp yok.
// Proje icindeki logs/ dizinine yaz (persistent + cross-platform).
const PTT_LOG = './logs/ptt-scrape.log';
const MM_LOG = './logs/mm-scrape.log';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const FAST_INTERVAL_MS = 10 * 60 * 1000;   // ilk 4 saat
const SLOW_INTERVAL_MS = 30 * 60 * 1000;   // 4 saatten sonra surekli

function loadState() {
  if (!existsSync(STATE_FILE)) {
    return {
      startedAt: new Date().toISOString(),
      pttPid: null,
      mmPid: null,
      restarts: { ptt: 0, mm: 0 },
      lastTickAt: null,
    };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    // Corrupted state -> restart fresh
    return {
      startedAt: new Date().toISOString(),
      pttPid: null,
      mmPid: null,
      restarts: { ptt: 0, mm: 0 },
      lastTickAt: null,
    };
  }
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isProcAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0); // signal 0 = check only
    return true;
  } catch {
    return false;
  }
}

function startPtt() {
  const out = openSync(PTT_LOG, 'a');
  const err = openSync(PTT_LOG, 'a');
  const proc = spawn('node', ['--env-file=.env.local', 'scripts/scrape-pttavm-loop.mjs'], {
    detached: true,
    stdio: ['ignore', out, err],
  });
  proc.unref();
  log(`[ptt] started PID=${proc.pid}`);
  return proc.pid;
}

function startMm() {
  const out = openSync(MM_LOG, 'a');
  const err = openSync(MM_LOG, 'a');
  // Windows'ta npx tsx icin shell:true gerekiyor
  const proc = spawn('npx', ['tsx', '--env-file=.env.local', 'scripts/scrape-mediamarkt-by-category.mjs'], {
    detached: true,
    stdio: ['ignore', out, err],
    shell: true,
  });
  proc.unref();
  log(`[mm] started PID=${proc.pid}`);
  return proc.pid;
}

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

async function tick(state) {
  state.lastTickAt = new Date().toISOString();

  // PTT health check
  if (!isProcAlive(state.pttPid)) {
    log(`[ptt] DEAD (PID ${state.pttPid ?? 'null'}), restart #${state.restarts.ptt + 1}`);
    state.pttPid = startPtt();
    state.restarts.ptt++;
  } else {
    log(`[ptt] alive PID=${state.pttPid}`);
  }

  // MM health check
  if (!isProcAlive(state.mmPid)) {
    log(`[mm] DEAD (PID ${state.mmPid ?? 'null'}), restart #${state.restarts.mm + 1}`);
    state.mmPid = startMm();
    state.restarts.mm++;
  } else {
    log(`[mm] alive PID=${state.mmPid}`);
  }

  saveState(state);
}

async function main() {
  log(`watchdog start, state=${STATE_FILE}`);
  const state = loadState();

  const startMs = new Date(state.startedAt).getTime();
  log(`startedAt=${state.startedAt} (${state.restarts.ptt} ptt restart, ${state.restarts.mm} mm restart so far)`);

  // Sonsuz dongu — Windows Task Scheduler logon trigger'i bu surece restart
  // veriyor (computer shutdown/logout sonrasi), kendi 24h cikisi yok.
  while (true) {
    const elapsed = Date.now() - startMs;
    const interval = elapsed < FOUR_HOURS_MS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
    const phase = elapsed < FOUR_HOURS_MS ? 'fast (10dk)' : 'slow (30dk)';
    log(`tick interval=${phase} elapsed=${(elapsed/3600000).toFixed(1)}h`);

    await tick(state);

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

process.on('SIGTERM', () => { log('SIGTERM received, exit'); process.exit(0); });
process.on('SIGINT', () => { log('SIGINT received, exit'); process.exit(0); });

main().catch((err) => {
  log(`FATAL: ${err.message}`);
  log(err.stack);
  process.exit(1);
});
