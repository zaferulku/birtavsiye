"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PriceRefresher({ productId }: { productId: string }) {
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/refresh-prices?productId=${productId}`)
      .then(() => router.refresh())
      .catch(() => {});
  }, [productId, router]);

  return null;
}
