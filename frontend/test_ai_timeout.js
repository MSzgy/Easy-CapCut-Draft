fetch('http://127.0.0.1:2222/api/proxy/ai/enhance-script', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "A rainy afternoon in Beijing",
    provider: "gemini"
  })
}).then(res => res.json()).then(console.log).catch(console.error);
