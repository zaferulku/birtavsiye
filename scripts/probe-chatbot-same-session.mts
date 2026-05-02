type HistoryItem = {
  role: "user" | "assistant";
  content: string;
  meta?: Record<string, unknown>;
};

const chatSessionId = `probe-same-session-${Date.now()}`;

const turns = [
  "telefon",
  "kirmizi olsun",
  "samsung olsun",
  "256 gb olsun",
  "en populer",
  "laptop",
  "oyun icin olsun",
  "siyah olsun",
  "kahve makinesi",
  "espresso olsun",
  "en ucuz",
  "kedi mamasi",
];

async function run(): Promise<void> {
  const routeMod = await import("../src/app/api/chat/route.ts");
  const POST = routeMod.POST as (req: Request) => Promise<Response>;
  const history: HistoryItem[] = [];

  for (const [index, message] of turns.entries()) {
    const request = new Request("http://local.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message,
        history,
        chatSessionId,
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    const reply = String(json.reply ?? "");
    const state = json.meta?.state ?? null;
    const suggestions = Array.isArray(json.suggestions)
      ? json.suggestions.map((s: { label?: string }) => s.label).filter(Boolean)
      : [];
    const products = Array.isArray(json.products) ? json.products.length : 0;

    console.log(`\n# TURN ${index + 1}`);
    console.log(`USER: ${message}`);
    console.log(`BOT: ${reply}`);
    console.log(
      JSON.stringify(
        {
          category: state?.category_slug ?? null,
          brand: state?.brand_filter ?? [],
          colors: state?.variant_color_patterns ?? [],
          storage: state?.variant_storage_patterns ?? [],
          price: {
            min: state?.price_min ?? null,
            max: state?.price_max ?? null,
          },
          intent_type: state?.intent_type ?? null,
          mergeAction: json.meta?.mergeAction ?? null,
          productCount: products,
          suggestionLabels: suggestions,
        },
        null,
        2
      )
    );

    history.push({ role: "user", content: message });
    history.push({
      role: "assistant",
      content: reply,
      meta: state ?? undefined,
    });
  }
}

run().catch((error) => {
  console.error("[probe-chatbot-same-session] failed:", error);
  process.exit(1);
});
