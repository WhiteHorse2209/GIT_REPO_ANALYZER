# 🛠️ GitHub Repo Analyzer

A simple CLI tool to analyze any GitHub repository with beautiful terminal charts, language stats, and repo details in a clean, colorful dashboard.

## ✨ Features

- **Quick Stats:** View stars, forks, watchers, open issues, and more.
- **Language Chart:** Automatically generates a percentage breakdown of programming languages used in the repository.
- **Beautiful UI:** Uses gradients, boxed tables, and spinners for a modern terminal experience.
- **No Setup Required:** Comes as a single executable file you can run directly from your Command Prompt!

## 📥 Download & Usage

1. **Download the tool:**
   Download the `github-repo-analyzer-win.exe` file from this repository (once released).
   
2. **Open Command Prompt:**
   Press `Windows Key + R`, type `cmd`, and press Enter.

3. **Run the tool:**
   Navigate to the folder where you downloaded the file, and run it by providing the `owner/repo` format of the GitHub repository you want to analyze.

   ```cmd
   github-repo-analyzer-win.exe <owner>/<repo>
   ```

**Example:**
```cmd
github-repo-analyzer-win.exe facebook/react
```

### ⚠️ Rate Limits
If you encounter a `403 API rate limit exceeded` error, this is because GitHub limits unauthenticated requests to 60 per hour. 

---

*Note: If you want to run it from source using Node.js instead of the pre-packaged executable, clone the repo, run `npm install`, and use `node analyze.js <owner>/<repo>`.*