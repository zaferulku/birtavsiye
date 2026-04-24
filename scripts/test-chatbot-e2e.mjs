import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) passed++; else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    await testPanelOpensAfterPush(browser);
    await testSingleWordNotVague(browser);
    await testSessionIdInBody(browser);
    await testLifecycle(browser);
  } finally {
    await browser.close();
  }

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

async function testPanelOpensAfterPush(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const input = page.locator('input[aria-label*="Mesaj"]').first();
    await input.fill('iPhone 15');
    await input.press('Enter');
    await page.waitForURL(/\/sonuclar/, { timeout: 10_000 });

    const panelState = await page.evaluate(() => {
      const raw = sessionStorage.getItem('birtavsiye-chat');
      if (!raw) return null;
      return JSON.parse(raw)?.state?.panelState;
    });

    record('TEST 1: ChatPanel /sonuclar\'da açılıyor', panelState === 'open', `panelState=${panelState}`);
  } catch (e) {
    record('TEST 1: ChatPanel /sonuclar\'da açılıyor', false, String(e.message));
  } finally {
    await ctx.close();
  }
}

async function testSingleWordNotVague(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const input = page.locator('input[aria-label*="Mesaj"]').first();
    await input.fill('telefon');
    await input.press('Enter');
    await page.waitForURL(/\/sonuclar/, { timeout: 10_000 });

    // Poll up to 30s for assistant response
    let replyFound = false;
    for (let i = 0; i < 30; i++) {
      const has = await page.evaluate(() => {
        const raw = sessionStorage.getItem('birtavsiye-chat');
        if (!raw) return false;
        const msgs = JSON.parse(raw)?.state?.messages ?? [];
        return msgs.some((m) => m.role === 'assistant');
      });
      if (has) { replyFound = true; break; }
      await page.waitForTimeout(1000);
    }
    if (!replyFound) {
      record('TEST 2: "telefon" vague olarak işaretlenmiyor', false, 'assistant reply never arrived (30s)');
      return;
    }

    const replyText = await page.evaluate(() => {
      const raw = sessionStorage.getItem('birtavsiye-chat');
      if (!raw) return '';
      const msgs = JSON.parse(raw)?.state?.messages ?? [];
      const assistant = msgs.filter((m) => m.role === 'assistant').pop();
      return assistant?.content ?? '';
    });

    const looksVague = /biraz daha detay verir misin|biraz da(ha)? açıklar/i.test(replyText);
    const hasCategoryHint = /telefon|marka|model|iphone|samsung|xiaomi/i.test(replyText);
    const ok = replyText.length > 0 && !looksVague && hasCategoryHint;
    record(
      'TEST 2: "telefon" vague olarak işaretlenmiyor',
      ok,
      `reply="${replyText.slice(0, 120).replace(/\n/g, ' ')}"`
    );
  } catch (e) {
    record('TEST 2: "telefon" vague olarak işaretlenmiyor', false, String(e.message));
  } finally {
    await ctx.close();
  }
}

async function testSessionIdInBody(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    let capturedBody = null;
    page.on('request', (req) => {
      if (req.url().includes('/api/chat') && req.method() === 'POST') {
        try {
          capturedBody = JSON.parse(req.postData() || '{}');
        } catch { /* noop */ }
      }
    });

    await page.goto(BASE, { waitUntil: 'networkidle' });
    const input = page.locator('input[aria-label*="Mesaj"]').first();
    await input.fill('iPhone');
    await input.press('Enter');
    await page.waitForURL(/\/sonuclar/, { timeout: 10_000 });
    await page.waitForTimeout(2500);

    const ok =
      capturedBody &&
      typeof capturedBody.chatSessionId === 'string' &&
      capturedBody.chatSessionId.startsWith('sess_') &&
      Array.isArray(capturedBody.history);
    record(
      'TEST 4: /api/chat body chatSessionId + history içeriyor',
      !!ok,
      capturedBody
        ? `chatSessionId=${(capturedBody.chatSessionId || '').slice(0, 24)}..., historyLen=${(capturedBody.history || []).length}`
        : 'request not captured'
    );
  } catch (e) {
    record('TEST 4: /api/chat body chatSessionId + history içeriyor', false, String(e.message));
  } finally {
    await ctx.close();
  }
}

async function testLifecycle(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const input = page.locator('input[aria-label*="Mesaj"]').first();
    await input.fill('iPhone 15');
    await input.press('Enter');
    await page.waitForURL(/\/sonuclar/, { timeout: 10_000 });
    await page.waitForTimeout(1500);

    const minimizeButton = page.locator('button[aria-label*="üçült" i], button[title*="üçült" i]').first();
    if ((await minimizeButton.count()) > 0) {
      await minimizeButton.click();
      await page.waitForTimeout(500);

      const stateAfterMin = await page.evaluate(() => {
        const raw = sessionStorage.getItem('birtavsiye-chat');
        const parsed = JSON.parse(raw);
        return {
          panelState: parsed?.state?.panelState,
          messageCount: parsed?.state?.messages?.length,
        };
      });
      const minimizePreserves = stateAfterMin.panelState === 'minimized' && stateAfterMin.messageCount > 0;
      record('TEST 5a: Küçült → mesajlar korunur', minimizePreserves, JSON.stringify(stateAfterMin));
    } else {
      record('TEST 5a: Küçült butonu bulunamadı', false, 'minimize button not found');
    }

    const reopenButton = page.locator('button[aria-label*="sohbet" i]').first();
    if ((await reopenButton.count()) > 0) {
      await reopenButton.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    const closeButton = page.locator('button[aria-label*="apat" i]').first();
    if ((await closeButton.count()) > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);

      const stateAfterClose = await page.evaluate(() => {
        const raw = sessionStorage.getItem('birtavsiye-chat');
        const parsed = JSON.parse(raw);
        return {
          panelState: parsed?.state?.panelState,
          messageCount: parsed?.state?.messages?.length,
        };
      });
      const closeWipes = stateAfterClose.panelState === 'closed' && (stateAfterClose.messageCount ?? 0) === 0;
      record('TEST 5b: Kapat → mesajlar silinir', closeWipes, JSON.stringify(stateAfterClose));
    } else {
      record('TEST 5b: Kapat butonu bulunamadı', false, 'close button not found');
    }
  } catch (e) {
    record('TEST 5: Lifecycle', false, String(e.message));
  } finally {
    await ctx.close();
  }
}

main().catch((e) => {
  console.error('TEST CRASHED:', e);
  process.exit(3);
});
