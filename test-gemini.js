
const apiKey = 'AIzaSyCH1rZ54XzIv87zWVrsBnaFB_-doPGONps';
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

async function testGemini() {
  console.log("Testing Gemini API...");
  console.log("URL:", url.replace(apiKey, 'HIDDEN_KEY'));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello, are you working?" }]
        }]
      })
    });

    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

testGemini();
