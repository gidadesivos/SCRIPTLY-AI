const API_KEY = '<REMOVED_FOR_SECURITY>'
const response = await fetch('https://api.groq.com/openai/v1/models', {
  headers: { Authorization: `Bearer ${API_KEY}` }
})

console.log(response.status)
console.log(await response.text())
