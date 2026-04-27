/**
 * accessoryDetector smoke test.
 * Calistirma:
 *   npx tsx scripts/test-accessory-detector.mjs
 */
import { checkAccessory } from "../src/lib/accessoryDetector.mjs";

/** @type {Array<[string, string, boolean, string]>} */
const cases = [
  ["Philips 3200 LatteGo Tam Otomatik Espresso Makinesi", "kahve-makinesi", false, "ana urun"],
  ["Philips Kahve Makinesi Filtre Kagidi 100lu", "kahve-makinesi", true, "filtre"],
  ["Bialetti Moka Express 6 Cup", "kahve-makinesi", false, "moka pot"],
  ["Espresso Bardagi 80ml 6li Set", "kahve-makinesi", true, "bardak"],
  ["DeLonghi Magnifica Kirec Sokucu 2x100ml", "kahve-makinesi", true, "kirec sokucu"],
  ["Samsung Galaxy A15 128GB", "akilli-telefon", false, "telefon"],
  ["iPhone 15 Pro Silikon Kilif Siyah", "akilli-telefon", true, "kilif"],
  ["Apple 20W USB-C Guc Adaptoru", "akilli-telefon", true, "adaptor"],
  ["Samsung 55 inc QLED 4K Smart TV", "televizyon", false, "TV"],
  ["TV Duvar Aski Aparati 32-65 inc", "televizyon", true, "aski"],
];

let pass = 0, fail = 0;
for (const [title, cat, expected, label] of cases) {
  const r = checkAccessory(title, cat);
  const ok = r.isAccessory === expected;
  console.log(
    (ok ? "OK" : "FAIL") + " [" + label + "] " + title.slice(0, 50) +
    " -> isAccessory=" + r.isAccessory + " (" + (r.reason ?? "-") + ", " + r.confidence + ")",
  );
  ok ? pass++ : fail++;
}
console.log("\n" + pass + "/" + (pass + fail) + " gecti.");
process.exit(fail > 0 ? 1 : 0);
