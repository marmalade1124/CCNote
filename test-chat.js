// Native fetch used


async function testChat() {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });

    if (!response.ok) {
        console.error("HTTP Error:", response.status, response.statusText);
        const text = await response.text();
        console.error("Body:", text);
        return;
    }

    console.log("Status:", response.status);
    // console.log("Headers:", response.headers);
    
    const body = await response.text();
    console.log("Raw Response Body:\n", body);

  } catch (error) {
    console.error("Fetch Error:", error);
  }
}

testChat();
