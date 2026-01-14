# 🧠 Neural Interface Setup Guide

To activate the **AI Copilot** module, you need to provide it with a cognitive power source (OpenAI API Key).

## 1. Get an API Key

1.  Go to [platform.openai.com](https://platform.openai.com/).
2.  Sign up or Log in.
3.  Go to **API Keys** and create a temporary or permanent key.

## 2. Configure Environment

1.  Open the file named `.env.local` in your project root (create it if it doesn't exist).
2.  Add the following line:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
```

_(Replace the `sk-proj...` with your actual key)_

## 3. Reboot System

1.  Stop the current server (Ctrl+C).
2.  Run `npm run dev` again.
3.  Refresh the page.

## Usage

- **Voice**: Click the **Mic** icon on the AI panel and say "Create a folder named Project Alpha".
- **Text**: Type "Make a blue note that says Hello World".
