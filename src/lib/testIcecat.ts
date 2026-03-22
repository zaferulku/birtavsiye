async function test() {
  const res = await fetch(
    "https://icecat.biz/api/products?api_key=c81be0d4-5ef9-4b93-884b-a1b183456ab1&Language=EN&Brand=Apple&ProductCode=MQDY3",
    { headers: { "Content-Type": "application/json" } }
  );
  const text = await res.text();
  console.log(text.slice(0, 800));
}

test();
