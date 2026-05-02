const mod = await import('../src/lib/search/queryParser');
const parseQuery = mod.parseQuery ?? mod.default?.parseQuery;
const r = parseQuery("spor çantası arıyorum", []);
console.log("--- 'spor çantası arıyorum' ---");
console.log(JSON.stringify(r, null, 2));
