import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ean = searchParams.get("ean");
  const brand = searchParams.get("brand");
  const productCode = searchParams.get("productCode");

  const username = process.env.ICECAT_USERNAME || "";
  const password = process.env.ICECAT_PASSWORD || "";

  let url = "";
  if (ean) {
    url = `https://live.icecat.biz/api?UserName=${username}&Language=EN&ean=${ean}`;
  } else if (brand && productCode) {
    url = `https://live.icecat.biz/api?UserName=${username}&Language=EN&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(productCode)}`;
  } else {
    return NextResponse.json({ error: "EAN veya Marka+Model gerekli" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Icecat API hatası: " + response.status }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
