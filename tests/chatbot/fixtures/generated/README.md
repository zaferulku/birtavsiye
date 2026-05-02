# Chatbot Intent Dataset

Bu klasor, chatbot konusma akisini test etmek icin uretilmis intent etiketli fixture setlerini icerir.

## Paketler

- Toplam senaryo: 1200
- Her senaryo: 5 kullanici sorgusu + 5 bot cevabi
- Dikeyler: telefon, kozmetik, beyaz_esya, moda
- Akis paketleri: daraltma, genisletme, reset

## Dosyalar

- Tum dataset: `tests/chatbot/fixtures/generated/all/chatbot_dialogs_intent_all_1200.jsonl`
- Dikey bazli dosyalar: `tests/chatbot/fixtures/generated/verticals/`
- Akis bazli dosyalar: `tests/chatbot/fixtures/generated/flows/`

## Alanlar

- `intent_label`: kullanici niyeti (`new_search`, `refine`, `broaden`, `reset`, `sort_only`)
- `expected_state`: temel kategori/marka/renk/fiyat durumu
- `expected_spec_filters`: kategoriye ozgu filtreler
- `expected_sort_mode`: siralama veya stok modu

## Uretim

```bash
node scripts/generate-chatbot-intent-datasets.mjs
```
