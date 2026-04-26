/**
 * Forum seed - gercekci Turkce topic ve cevaplar uretir.
 *
 * Kullanim:
 *   npx tsx scripts/seed-forum-content.mjs
 *
 * Idempotent: ayni title varsa skip eder.
 *   - answer_count >= 3 ise skip
 *   - answer_count < 3 (orphan) ise cevaplari uretir
 *
 * Model chain: 2.5-flash primary, lite-latest fallback (kotalar farkli)
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model chain - 429 olunca sonraki modele gec
const MODEL_CHAIN = [
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
];

let currentModelIdx = 0;

function getActiveModel() {
  const name = MODEL_CHAIN[currentModelIdx];
  return { name, model: gemini.getGenerativeModel({ model: name }) };
}

// -----------------------------------------------------
// PERSONALAR
// -----------------------------------------------------

const PERSONAS = [
  { name: 'zeynep_k', desc: '32 yas anne, ev aletleri ve mutfak urunleri konusunda arastirmaci. Detayli yorum yazar, kullanim deneyimi paylasir.' },
  { name: 'ahmet_demir', desc: '28 yas yazilim muhendisi, teknoloji takipcisi. Specslere odaklanir, fiyat-performans karsilastirmasi yapar.' },
  { name: 'merve_yilmaz', desc: '25 yas, pazarlama uzmani. Cilt bakimi, makyaj ve moda konularinda bilgili. Marka bilinci yuksek.' },
  { name: 'mehmet_tekin', desc: '45 yas, klasik tarz. Beyaz esya ve elektronik konusunda deneyimli, 10+ yil kullandigi urunleri anlatir. Kalite odakli.' },
  { name: 'elif_sahin', desc: '22 yas universite ogrencisi. Butce kisitli, fiyat odakli kararlar. Pratik ve kisa cevaplar verir.' },
  { name: 'oguz_bilgin', desc: '38 yas baba, 2 cocuklu. Aile icin pratik ve dayanikli urunler arar. Garantiyi ve servis agini onemser.' },
  { name: 'ayse_kara', desc: '30 yas profesyonel kadin, hizli tuketici. Gorsel, tasarim ve premium hisse onem verir. Detaya girmez.' },
  { name: 'serkan_yildiz', desc: '50 yas, klasik beyefendi. Eski urunleri bilir, yeni teknolojiye karsi ihtiyatli yaklasir. Koklu markalari sever.' },
  { name: 'yasemin_oz', desc: '26 yas, fitness kocu. Spor, saglik ve beslenme cihazlari konusunda uzman. Pratik ozelliklere bakar.' },
  { name: 'hakan_demirci', desc: '35 yas PC gamer ve tech enthusiast. Performans, RGB, mekanik klavye, gaming kulaklik konusunda detayli.' },
];

// -----------------------------------------------------
// KATEGORILER
// -----------------------------------------------------

const CATEGORIES = [
  { slug: 'akilli-telefon', name: 'Akilli Telefon' },
  { slug: 'kulaklik', name: 'Kulaklik' },
  { slug: 'akilli-saat', name: 'Akilli Saat' },
  { slug: 'powerbank', name: 'Powerbank' },
  { slug: 'laptop', name: 'Laptop' },
  { slug: 'tablet', name: 'Tablet' },
  { slug: 'mouse', name: 'Mouse' },
  { slug: 'klavye', name: 'Klavye' },
  { slug: 'televizyon', name: 'Televizyon' },
  { slug: 'hoparlor', name: 'Hoparlor' },
  { slug: 'oyun-konsol', name: 'Oyun Konsolu' },
  { slug: 'buzdolabi', name: 'Buzdolabi' },
  { slug: 'camasir-makinesi', name: 'Camasir Makinesi' },
  { slug: 'bulasik-makinesi', name: 'Bulasik Makinesi' },
  { slug: 'ankastre-firin', name: 'Ankastre Firin' },
  { slug: 'robot-supurge', name: 'Robot Supurge' },
  { slug: 'kahve-makinesi', name: 'Kahve Makinesi' },
  { slug: 'mikrodalga', name: 'Mikrodalga' },
  { slug: 'blender', name: 'Blender' },
  { slug: 'klima', name: 'Klima' },
  { slug: 'drone', name: 'Drone' },
];

// -----------------------------------------------------
// PROMPT TEMPLATES
// -----------------------------------------------------

function topicPrompt(category, persona) {
  return `Sen "${persona.name}" adli kullanicisin. Profil: ${persona.desc}

"${category.name}" kategorisinde gercekci bir Turk forum sorusu yaz. Kullanicilar tavsiye, deneyim ve karsilastirma icin soru soruyorlar.

Kurallar:
- Turkce dogal konusma dili (Turkce karakterler kullan)
- Somut butce veya kullanim senaryosu (orn: 5000 TL, "gunluk kullanim icin", "spor yaparken")
- 1-3 marka adi gecebilir ama spesifik model verme
- 30-80 kelime arasinda body
- Baslik 8-15 kelime, soru formatinda

JSON formatinda don (markdown kullanma):
{
  "title": "...",
  "body": "..."
}`;
}

function answerPrompt(topic, persona) {
  return `Sen "${persona.name}" adli kullanicisin. Profil: ${persona.desc}

Asagidaki forum sorusuna senin perspektifinden cevap yaz.

SORU BASLIK: ${topic.title}
SORU ICERIK: ${topic.body}

Kurallar:
- Turkce dogal konusma dili
- Profilinin kisiligini yansit
- En az 1 spesifik urun/marka adi ver
- Pratik bir tavsiye + neden aciklamasi
- 40-100 kelime arasi
- Dogrudan cevap, "Selam, ben ..." gibi giris YOK

Sadece cevap metnini don (JSON degil, markdown degil):`;
}

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

function pickPersonas(count, exclude = null) {
  const pool = PERSONAS.filter(p => !exclude || p.name !== exclude.name);
  const result = [];
  const used = new Set();
  while (result.length < count && used.size < pool.length) {
    const p = pickRandom(pool);
    if (!used.has(p.name)) {
      used.add(p.name);
      result.push(p);
    }
  }
  return result;
}

async function callGemini(prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { name, model } = getActiveModel();
    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e) {
      const msg = e.message || '';
      const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('rate');

      if (isRateLimit && currentModelIdx < MODEL_CHAIN.length - 1) {
        currentModelIdx++;
        console.warn(`  [${name}] 429, geciliyor: ${MODEL_CHAIN[currentModelIdx]}`);
        await sleep(2000);
        continue;
      }

      if (attempt < retries) {
        const delay = (attempt + 1) * 5000;
        console.warn(`  [${name}] retry ${attempt + 1}/${retries}, ${delay}ms bekle`);
        await sleep(delay);
        continue;
      }

      throw e;
    }
  }
}

function parseTopicJson(text) {
  let clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
}

// -----------------------------------------------------
// MAIN
// -----------------------------------------------------

async function main() {
  console.log('Forum seed basliyor (model chain: ' + MODEL_CHAIN.join(' -> ') + ')...');
  console.log(`Hedef: ${CATEGORIES.length} kategori x 1 topic + 3-4 cevap\n`);

  let topicsCreated = 0;
  let topicsSkipped = 0;
  let topicsRepaired = 0;
  let answersCreated = 0;
  let failures = 0;

  for (const category of CATEGORIES) {
    console.log(`\n=== ${category.name} (${category.slug}) ===`);

    const topicPersona = pickRandom(PERSONAS);
    console.log(`  Topic yazari: ${topicPersona.name}`);

    let topicData;
    try {
      const raw = await callGemini(topicPrompt(category, topicPersona));
      topicData = parseTopicJson(raw);
      if (!topicData?.title || !topicData?.body) {
        console.warn(`  Topic JSON parse fail, atlaniyor`);
        failures++;
        continue;
      }
    } catch (e) {
      console.warn(`  Gemini fail: ${e.message?.slice(0, 100)}, atlaniyor`);
      failures++;
      continue;
    }

    console.log(`  Title: ${topicData.title.slice(0, 70)}...`);

    // Idempotency: title check
    const { data: existing } = await sb
      .from('topics')
      .select('id, answer_count')
      .eq('title', topicData.title)
      .maybeSingle();

    let topicIdToUse;
    let existingAnswerCount = 0;

    if (existing) {
      existingAnswerCount = existing.answer_count ?? 0;
      if (existingAnswerCount >= 3) {
        console.log(`  Skip (zaten ${existingAnswerCount} cevap var)`);
        topicsSkipped++;
        continue;
      }
      console.log(`  Orphan/eksik topic (${existingAnswerCount} cevap), tamir ediliyor`);
      topicIdToUse = existing.id;
      topicsRepaired++;
    } else {
      const topicVotes = randInt(5, 50);
      const { data: insertedTopic, error: topicErr } = await sb
        .from('topics')
        .insert({
          title: topicData.title,
          body: topicData.body,
          category: category.slug,
          user_name: topicPersona.name,
          user_id: null,
          votes: topicVotes,
          answer_count: 0,
          product_id: null,
          product_slug: null,
          product_title: null,
          product_brand: null,
          gender_filter: null,
        })
        .select('id')
        .single();

      if (topicErr) {
        console.warn(`  Topic insert fail: ${topicErr.message}`);
        failures++;
        continue;
      }
      topicsCreated++;
      topicIdToUse = insertedTopic.id;
      await sleep(4500);
    }

    // 3-4 cevap uret
    const answerCount = randInt(3, 4);
    const answerPersonas = pickPersonas(answerCount, topicPersona);
    let topicAnswerCount = 0;

    for (const ansPersona of answerPersonas) {
      try {
        const ansText = await callGemini(answerPrompt(topicData, ansPersona));
        if (!ansText || ansText.length < 30) continue;

        const ansVotes = randInt(2, 30);
        const { error: ansErr } = await sb
          .from('topic_answers')
          .insert({
            topic_id: topicIdToUse,
            body: ansText,
            user_name: ansPersona.name,
            user_id: null,
            votes: ansVotes,
            parent_id: null,
            gender: null,
          });

        if (ansErr) {
          console.warn(`    Cevap fail: ${ansErr.message}`);
          continue;
        }

        answersCreated++;
        topicAnswerCount++;
        console.log(`    + ${ansPersona.name} cevabi (${ansVotes} oy)`);
        await sleep(4500);
      } catch (e) {
        console.warn(`    Cevap Gemini fail: ${e.message?.slice(0, 100)}`);
      }
    }

    if (topicAnswerCount > 0) {
      await sb.from('topics')
        .update({ answer_count: existingAnswerCount + topicAnswerCount })
        .eq('id', topicIdToUse);
    }
  }

  console.log('\n=== SONUC ===');
  console.log(`Topics olusturuldu: ${topicsCreated}`);
  console.log(`Topics tamir (orphan): ${topicsRepaired}`);
  console.log(`Topics skip (zaten dolu): ${topicsSkipped}`);
  console.log(`Cevaplar olusturuldu: ${answersCreated}`);
  console.log(`Toplam yeni mesaj: ${topicsCreated + answersCreated}`);
  console.log(`Basarisiz: ${failures}`);
  console.log(`Son aktif model: ${MODEL_CHAIN[currentModelIdx]}`);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
