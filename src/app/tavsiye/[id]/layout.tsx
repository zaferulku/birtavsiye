import { supabase } from "../../../lib/supabase";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const { data: topic } = await supabase
    .from("topics").select("title, body, category").eq("id", id).maybeSingle();

  if (!topic) return { title: "Tavsiye Bulunamadı" };

  const description = topic.body
    ? topic.body.slice(0, 155)
    : `${topic.category} kategorisinde kullanıcı tavsiyesi`;

  return {
    title: topic.title,
    description,
    openGraph: {
      title: topic.title,
      description,
      type: "article",
    },
  };
}

export default function TavsiyeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
