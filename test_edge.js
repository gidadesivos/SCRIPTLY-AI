const anon = process.env.SUPABASE_ANON_KEY;
fetch("https://hsncbjxsbbtcpdmvbptc.supabase.co/functions/v1/ai-generate", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${anon}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    operation: "listModels",
    workspaceId: "f784d1bc-867c-474d-93cc-0e19cfb09dfd",
    provider: "groq"
  })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
});
