import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

  console.log('1. Navigate to homepage');
  await page.goto(BASE, { waitUntil: 'networkidle' });

  console.log('2. Look for ChatBar input');
  const input = page.locator('input[aria-label*="Mesaj"], input[placeholder*="Herhangi"]').first();
  const inputVisible = await input.isVisible().catch(() => false);
  console.log(`   ChatBar visible: ${inputVisible}`);
  if (!inputVisible) {
    console.log('FAIL: ChatBar input not found');
    console.log('Console logs:\n' + logs.join('\n'));
    await browser.close();
    process.exit(1);
  }

  console.log('3. Type message & submit');
  await input.fill('siyah iphone 15');
  await input.press('Enter');

  console.log('4. Wait for /ara navigation');
  await page.waitForURL(/\/ara/, { timeout: 10_000 });
  console.log(`   Arrived at: ${page.url()}`);

  console.log('5. Check ChatPanel visibility after navigation');
  await page.waitForTimeout(1000);

  const panelSelector = '[role="dialog"], [aria-label*="sohbet" i], [data-chat-panel], .chat-panel, aside:has-text("Çevrimiçi"), aside:has-text("Yazıyor")';
  const panel = page.locator(panelSelector).first();
  const panelVisible = await panel.isVisible().catch(() => false);
  console.log(`   Panel visible via selector: ${panelVisible}`);

  const anyAside = await page.locator('aside, [role="complementary"]').count();
  console.log(`   Aside/complementary elements: ${anyAside}`);

  const storeSnapshot = await page.evaluate(() => {
    try {
      const raw = sessionStorage.getItem('birtavsiye-chat');
      if (!raw) return { stored: false };
      const parsed = JSON.parse(raw);
      return {
        stored: true,
        panelState: parsed?.state?.panelState,
        messageCount: parsed?.state?.messages?.length,
        chatSessionId: (parsed?.state?.chatSessionId || '').slice(0, 20) + '...',
      };
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log('6. sessionStorage snapshot:', JSON.stringify(storeSnapshot));

  const pageText = await page.textContent('body');
  const hasTyping = pageText.includes('Yazıyor') || pageText.includes('yaziyor');
  const hasPanelTitle = pageText.includes('birtavsiye') || pageText.includes('Çevrimiçi');
  console.log(`7. "Yazıyor..." indicator on page: ${hasTyping}`);
  console.log(`   Panel title text on page: ${hasPanelTitle}`);

  console.log('\n=== Console errors / warnings ===');
  const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  if (errors.length === 0) console.log('(none)');
  else errors.forEach((l) => console.log(l));

  const verdict = storeSnapshot.panelState === 'open' || panelVisible;
  console.log('\n=== VERDICT ===');
  console.log(verdict ? 'PASS: ChatPanel persists "open" state after router.push' : 'FAIL: Panel state not open after navigation');

  await browser.close();
  process.exit(verdict ? 0 : 2);
}

main().catch((e) => {
  console.error('TEST CRASHED:', e);
  process.exit(3);
});
