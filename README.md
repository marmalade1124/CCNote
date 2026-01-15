# ⚡ CCNote - Cyberpunk Collaborative Canvas

<div align="center">

**A futuristic, AI-powered collaborative canvas for visual note-taking and brainstorming.**

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![AI SDK](https://img.shields.io/badge/AI_SDK-6-FF6B6B)](https://sdk.vercel.ai/)

</div>

---

## 🚀 Features

### 🧠 Neural Interface (AI Assistant)

An AI-powered chat companion ("Beepo") that can help you:

#### ⚡ Local Knowledge (Works Offline / AI Toggle OFF)

- **Navigation**: "Zoom in", "Zoom out", "Reset view"
- **Creation**: "Create note [text]" (or typed directly)
- **Stats**: "How many notes?", "How many connections?"
- **Pathfinding**: "Path from [Start] to [End]" (Finds shortest path)
- **Orphan Detection**: "Show orphans" (Finds unconnected nodes)
- **Tag Aggregation**: "List tags", "Show items with #todo"
- **Type Filtering**: "List images", "Show sticky notes"
- **Search**: "Find [keyword]", "Where is [topic]?"
- **Connections**: "What is connected to [Node Name]?"

#### ☁️ Cloud Intelligence (AI Toggle ON)

- **Deep Analysis**: Complex reasoning about your canvas content.
- **Creative Writing**: Generating stories, code, or ideas based on your notes.
- **General Knowledge**: Answering broad questions beyond your local data.

---

### 🎨 Infinite Canvas Editor

- **Freeform Node Creation**: Create text, markdown, and media nodes anywhere
- **Drag & Drop**: Intuitive node positioning and resizing
- **Connections**: Link nodes together with visual connections
- **Rich Text**: Full markdown support with syntax highlighting

### ⌨️ Command Palette

Quick access to all features via `Ctrl+K`:

- Fast node creation
- Canvas navigation
- AI commands
- System settings

### 📊 Graph View

Visualize your notes as an interconnected knowledge graph:

- See relationships between nodes
- Navigate complex information structures
- Zoom and pan through your knowledge base

### ⏱️ Pomodoro Timer

Built-in productivity timer:

- Customizable work/break intervals
- Audio notifications
- Session tracking

### 🎮 Typing Defense Game

A fun mini-game to practice typing while taking breaks:

- Defend against incoming words
- Track your WPM
- Cyberpunk-themed visuals

### 🔐 Authentication

- Secure login system
- User profiles
- Persistent canvas state

---

## 🛠️ Tech Stack

| Category           | Technology                                                            |
| ------------------ | --------------------------------------------------------------------- |
| **Framework**      | [Next.js 16](https://nextjs.org/) with App Router & Turbopack         |
| **UI Library**     | [React 19](https://react.dev/)                                        |
| **Styling**        | [Tailwind CSS 4](https://tailwindcss.com/)                            |
| **Animations**     | [Framer Motion 12](https://www.framer.com/motion/)                    |
| **AI Integration** | [Vercel AI SDK 6](https://sdk.vercel.ai/) with Google Gemini          |
| **Database**       | [Supabase](https://supabase.com/)                                     |
| **Language**       | [TypeScript 5](https://www.typescriptlang.org/)                       |
| **Markdown**       | [react-markdown](https://github.com/remarkjs/react-markdown) with GFM |

---

## 📦 Installation

### Prerequisites

- Node.js 20+
- npm or yarn
- Google AI API Key (for Neural Interface)
- Supabase Project (optional, for persistence)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/marmalade1124/CCNote.git
   cd CCNote
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # AI Configuration (Required for Neural Interface)
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

   # Supabase Configuration (Optional)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🎮 Usage

### Quick Start

1. Navigate to the dashboard
2. Click anywhere on the canvas to create a new node
3. Use `Ctrl+K` to open the command palette
4. Chat with the Neural Interface (bottom-right corner) for AI assistance

### Voice Commands

Click the microphone icon in the Neural Interface to use voice commands:

- "Create a note about..."
- "Link this to..."
- "What's on my canvas?"

### Keyboard Shortcuts

| Shortcut | Action               |
| -------- | -------------------- |
| `Ctrl+K` | Open Command Palette |
| `Ctrl+N` | New Node             |
| `Delete` | Delete Selected Node |
| `Ctrl+Z` | Undo                 |

---

## 🏗️ Project Structure

```
CCNote/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/chat/        # AI chat API endpoint
│   │   ├── dashboard/       # Main canvas page
│   │   └── page.tsx         # Landing/Login page
│   ├── components/          # React components
│   │   ├── CanvasEditor.tsx # Main canvas component
│   │   ├── NeuralInterface.tsx # AI chat panel
│   │   ├── CommandPalette.tsx
│   │   ├── GraphView.tsx
│   │   ├── PomodoroTimer.tsx
│   │   └── ...
│   ├── context/             # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── docs/                    # Documentation & screenshots
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai/) for seamless AI integration
- [Google Gemini](https://ai.google.dev/) for the AI model
- [Framer Motion](https://www.framer.com/motion/) for beautiful animations
- The cyberpunk aesthetic that inspired this project ⚡

---

<div align="center">

**Built with 💚 by [marmalade1124](https://github.com/marmalade1124)**

</div>
