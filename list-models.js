
const apiKey = 'AIzaSyCH1rZ54XzIv87zWVrsBnaFB_-doPGONps';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
  console.log("Listing Gemini Models...");
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
        const models = data.models
            .filter(m => m.name.includes('gemini') && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name);
        console.log("Available Gemini Models:", JSON.stringify(models, null, 2));
    } else {
        console.log("No models found or error:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
