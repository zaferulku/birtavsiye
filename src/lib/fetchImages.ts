import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY!;

// Ürün adına göre manuel arama sorguları
const searchQueries: Record<string, string> = {
  "OnePlus 13 256GB": "oneplus smartphone",
  "Dell XPS 15 2024": "dell laptop",
  "iPhone 16 Pro 256GB": "apple iphone",
  "iPhone 15 Pro 256GB": "apple iphone",
  "Samsung Galaxy S24 Ultra": "samsung galaxy phone",
  "Xiaomi 14 Pro 512GB": "xiaomi smartphone",
  "Samsung Galaxy Buds 3": "samsung earbuds wireless",
};

async function fetchImageForProduct(query: string): Promise<string | null> {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
  );
  const data = await res.json();
  return data.results?.[0]?.urls?.regular || null;
}

async function updateProductImages() {
  const { data: products } = await supabase
    .from("products")
    .select("id, title, brand")
    .is("image_url", null);

  if (!products || products.length === 0) {
    console.log("Tum urunlerin resmi var!");
    return;
  }

  console.log(products.length + " urun icin resim aranıyor...");

  for (const product of products) {
    const query = searchQueries[product.title] || product.brand + " " + product.title;
    const imageUrl = await fetchImageForProduct(query);
    
    if (imageUrl) {
      await supabase.from("products").update({ image_url: imageUrl }).eq("id", product.id);
      console.log("OK: " + product.title);
    } else {
      console.log("Resim bulunamadi: " + product.title);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("Tamamlandi!");
}

updateProductImages();
