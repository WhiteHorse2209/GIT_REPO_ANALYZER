# 🧠 Enterprise GitHub Intelligence Platform (Repo-Analyzer)

An advanced, AI-powered CLI tool designed to perform deep, interactive analysis of any public GitHub repository. This platform ingests source code and repository metadata to give you real-time insights, automatic architecture diagrams, code reviews, and impact analysis right from your terminal.

## ✨ Features

- **📊 Comprehensive Repo Metadata:** Instantly fetch repository statistics including stargazers, open issues, language distributions, top contributors, recent commits, and releases.
- **💬 Interactive AI Chat:** Ask questions directly about the repository's codebase. The AI ingests the source code and metadata (last 100 commits, issues, contributors) to provide highly contextual answers.
- **🏗️ Architecture Generation:** Type `arch` to automatically generate a Mermaid.js high-level architecture diagram based on the repository's source code.
- **🕵️ Automated Code Review:** Type `review` to perform an expert-level code review, identifying security flaws, performance bottlenecks, and bad practices.
- **⚡ Impact Analysis:** Type `impact` to perform a "what-if" impact analysis. Describe a change you plan to make, and the AI will warn you about affected files, potential bugs, and merge conflict risks.
- **🔄 Auto-Retry on High Demand:** Built-in intelligence to gracefully handle AI API rate limits and high demand periods.

## 📥 Installation

You can easily run this tool locally on your computer.

1. **Clone the repository:**
   ```bash
   git clone <your-github-repo-link>
   cd github-repo-analyzer
   ```

2. **Install dependencies:**
   Make sure you have [Node.js](https://nodejs.org/) installed, then run:
   ```bash
   npm install
   ```

3. **(Optional) Set up your API Key:**
   To use the AI features, you need a free Google Gemini API key. 
   - Get your key from [Google AI Studio](https://aistudio.google.com/).
   - Set it as an environment variable (or the tool will simply ask you for it when you run it!):
     - **Windows (Command Prompt):** `set GEMINI_API_KEY=your_key_here`
     - **Windows (PowerShell):** `$env:GEMINI_API_KEY="your_key_here"`
     - **Mac/Linux:** `export GEMINI_API_KEY="your_key_here"`

## 🚀 Usage

Run the tool from your terminal:

```bash
node analyze.js <owner>/<repo>
```

**Example:**
```bash
node analyze.js mrdoob/three.js
```
*You can also just run `node analyze.js` and the interactive prompt will ask you for a repository link!*

## 🤖 AI Commands

Once the AI ingests the repository, you can type the following commands into the prompt:

- `arch` : Generate an architecture diagram (Mermaid.js).
- `review` : Perform a full codebase code review.
- `impact` : Analyze the impact of a planned code change (checks for errors and merge conflicts).
- `<any question>` : Simply ask a question about how the code works!
- `exit` : Return to the main menu.

---

## ⚡ Quick Start (Run instantly!)

If you just want to run the tool without downloading the source code, you can use `npx` (comes pre-installed with Node.js) to download and execute it in one command:

```bash
npx github-repo-analyzer
```

*(You can also pass the repo directly: `npx github-repo-analyzer mrdoob/three.js`)*

Alternatively, install it globally on your machine so you can use it anywhere:

```bash
npm install -g github-repo-analyzer
github-repo-analyzer
```