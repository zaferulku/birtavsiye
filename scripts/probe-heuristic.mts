const mod = await import('../src/lib/chatbot/intentTypes');
const { heuristicClassify } = mod;
console.log("'spor çantası arıyorum':", heuristicClassify("spor çantası arıyorum"));
console.log("'selam claude':", heuristicClassify("selam claude"));
console.log("'merhaba':", heuristicClassify("merhaba"));
