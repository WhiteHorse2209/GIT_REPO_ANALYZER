const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const ignore = require('ignore');
const ora = require('ora');
const chalk = require('chalk');
const { GoogleGenAI } = require('@google/genai');

require('dotenv').config();

let ai = null;

function initAI(apiKey) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
        return false;
    }
    ai = new GoogleGenAI({ apiKey: key });
    return true;
}

// 1. Fetch repo zip
async function downloadAndExtractRepo(owner, repo) {
    const spinner = ora(`Downloading ${owner}/${repo} source code...`).start();
    try {
        // First get default branch
        const repoData = await axios.get(`https://api.github.com/repos/${owner}/${repo}`);
        const defaultBranch = repoData.data.default_branch;
        
        const cacheDir = path.join(process.cwd(), '.repo-cache', `${owner}-${repo}`);
        if (fs.existsSync(cacheDir)) {
            spinner.succeed(`Using cached repository: ${owner}/${repo}`);
        } else {
            fs.mkdirSync(cacheDir, { recursive: true });
            const zipPath = path.join(cacheDir, 'repo.zip');
            
            const response = await axios({
                url: `https://github.com/${owner}/${repo}/archive/refs/heads/${defaultBranch}.zip`,
                method: 'GET',
                responseType: 'stream'
            });
            
            const writer = fs.createWriteStream(zipPath);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            spinner.text = "Extracting files...";
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(cacheDir, true);
            
            fs.unlinkSync(zipPath); // remove zip to save space
            spinner.succeed("Repository downloaded and extracted successfully.");
        }
        
        // Find the root folder extracted (usually owner-repo-branch)
        const extractedDirs = fs.readdirSync(cacheDir);
        let actualCodeDir = cacheDir;
        if (extractedDirs.length === 1 && fs.statSync(path.join(cacheDir, extractedDirs[0])).isDirectory()) {
            actualCodeDir = path.join(cacheDir, extractedDirs[0]);
        }

        return actualCodeDir;
        
    } catch (e) {
        spinner.fail("Failed to download repository.");
        console.error(chalk.red(e.message));
        return null;
    }
}

// 2. Build Context String
function buildContext(repoPath, metadata) {
    const spinner = ora("Building codebase context for AI...").start();
    
    const ig = ignore().add([
        'node_modules', '.git', 'dist', 'build', '.repo-cache',
        '*.png', '*.jpg', '*.jpeg', '*.gif', '*.zip', '*.tar', '*.gz', '*.mp4', '*.ico', '*.svg',
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        '*.pdf', '*.doc', '*.docx', '*.csv', '*.xlsx', '*.min.js'
    ]);

    // Try to load .gitignore if exists
    const gitignorePath = path.join(repoPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        try {
            ig.add(fs.readFileSync(gitignorePath, 'utf8'));
        } catch (e) {}
    }

    let allText = metadata ? `\n\n--- REPOSITORY METADATA ---\n${JSON.stringify(metadata, null, 2)}\n\n` : "";
    let fileCount = 0;

    function walkSync(currentDirPath) {
        const files = fs.readdirSync(currentDirPath);
        for (const name of files) {
            const filePath = path.join(currentDirPath, name);
            const stat = fs.statSync(filePath);
            
            // To properly match ignore, use relative path and force posix separators
            const relativePath = path.relative(repoPath, filePath).split(path.sep).join('/');
            
            if (ig.ignores(relativePath) || relativePath.includes('node_modules')) {
                continue;
            }

            if (stat.isFile()) {
                // only read if size < 1MB to avoid massive bin files
                if (stat.size < 1000000) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        // Simple check to ensure it's not binary
                        if (!content.includes('\x00')) {
                            allText += `\n\n--- FILE: ${relativePath} ---\n\n`;
                            allText += content;
                            fileCount++;
                        }
                    } catch (e) {
                        // ignore unreadable files
                    }
                }
            } else if (stat.isDirectory()) {
                walkSync(filePath);
            }
        }
    }

    walkSync(repoPath);
    spinner.succeed(`Context built with ${fileCount} files.`);
    return allText;
}

// 3. AI Tasks
async function callGeminiWithRetry(contents, spinner, maxRetries = 3) {
    const originalText = spinner ? spinner.text : "";
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents
            });
            return response.text;
        } catch (e) {
            const errorMsg = e.message || "";
            if (errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("UNAVAILABLE")) {
                if (attempt < maxRetries) {
                    if (spinner) {
                        spinner.text = `High demand. Retrying in 3 seconds... (Attempt ${attempt}/${maxRetries})`;
                    }
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    if (spinner) {
                        spinner.text = originalText;
                    }
                    continue;
                }
            }
            throw e;
        }
    }
}

async function generateArchitecture(context) {
    const spinner = ora("AI is generating architecture diagram...").start();
    try {
        const text = await callGeminiWithRetry(`Analyze the following codebase and generate a high-level Mermaid.js architecture diagram. ONLY output the valid mermaid code inside a markdown block. Do not write any other explanation.\n\nCodebase Context:\n${context.substring(0, 500000)}`, spinner);
        spinner.succeed("Architecture diagram generated!");
        return text;
    } catch (e) {
        spinner.fail("Failed to generate architecture.");
        console.error(chalk.red(e.message));
        return null;
    }
}

async function runCodeReview(context) {
    const spinner = ora("AI is performing code review...").start();
    try {
        const text = await callGeminiWithRetry(`You are an expert senior software engineer. Perform a code review on the following codebase. Identify security flaws, performance bottlenecks, and bad practices. Provide a concise, structured markdown report. If no major issues, say so.\n\nCodebase Context:\n${context.substring(0, 500000)}`, spinner);
        spinner.succeed("Code review complete!");
        return text;
    } catch (e) {
        spinner.fail("Failed to perform code review.");
        return null;
    }
}

async function askQuestion(context, question) {
    const spinner = ora("AI is thinking...").start();
    try {
        const text = await callGeminiWithRetry(`You are a helpful expert developer assisting the user with their codebase. Answer the user's question accurately based on the codebase context.\n\nCodebase Context:\n${context.substring(0, 500000)}\n\nQuestion: ${question}`, spinner);
        spinner.stop();
        return text;
    } catch (e) {
        spinner.fail("Failed to get answer.");
        return chalk.red(e.message);
    }
}

async function analyzeImpact(context, changeDescription) {
    const spinner = ora("AI is analyzing change impact...").start();
    try {
        const text = await callGeminiWithRetry(`You are an expert software architect. The user is planning to make the following change to the codebase:
"${changeDescription}"

Based on the entire codebase context and repository metadata (including recent commits and contributors), provide a detailed "Impact Analysis Report" including:
1. **Affected Areas:** Files, modules, and functions that depend on the changed code and will be impacted.
2. **Potential Errors:** Bugs, performance issues, or side-effects that might occur if this isn't handled carefully.
3. **Merge Conflict Risk:** Based on the recent commits metadata, identify if other contributors are actively working on these files and if merge conflicts are likely.

Provide a concise, structured markdown report.\n\nCodebase Context:\n${context.substring(0, 500000)}`, spinner);
        spinner.succeed("Impact analysis complete!");
        return text;
    } catch (e) {
        spinner.fail("Failed to perform impact analysis.");
        return null;
    }
}

module.exports = {
    initAI,
    downloadAndExtractRepo,
    buildContext,
    generateArchitecture,
    runCodeReview,
    askQuestion,
    analyzeImpact
};
