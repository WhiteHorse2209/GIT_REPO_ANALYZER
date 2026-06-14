#!/usr/bin/env node

const axios = require("axios");
const chalk = require("chalk");
const ora = require("ora");
const boxen = require("boxen");
const Table = require("cli-table3");
const gradient = require("gradient-string");

function renderLanguageChart(languages) {

    const total = Object.values(languages).reduce((a, b) => a + b, 0);

    let result = "\nLanguages:\n";

    for (const lang in languages) {

        const percent = ((languages[lang] / total) * 100).toFixed(1);

        const bars = Math.round(percent / 5);

        const bar = "█".repeat(bars);

        result += `${chalk.cyan(lang.padEnd(10))} ${bar} ${percent}%\n`;
    }

    return result;
}

async function analyzeRepo(rawRepo) {
    let repo = rawRepo.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').trim();
    const parts = repo.split('/').filter(Boolean);
    if (parts.length >= 2) {
        repo = `${parts[0]}/${parts[1]}`;
    }

    if (!repo || !repo.includes("/")) {
        console.log(chalk.red("\n  ❌ Invalid format. Please provide a full GitHub URL or owner/repo\n"));
        return null;
    }

    const spinner = ora("Fetching GitHub data...").start();

    try {

        const repoRes = await axios.get(`https://api.github.com/repos/${repo}`);

        const data = repoRes.data;

        let contributorsCount = 0;
        let releasesCount = 0;
        let languages = {};

        let contributorsList = [];
        let releasesList = [];
        let issuesList = [];
        let recentCommits = [];

        try {
            const c = await axios.get(`https://api.github.com/repos/${repo}/contributors?per_page=100`);
            contributorsList = c.data.map(user => ({ login: user.login, contributions: user.contributions }));
            contributorsCount = contributorsList.length;
        } catch { }

        try {
            const r = await axios.get(`https://api.github.com/repos/${repo}/releases?per_page=20`);
            releasesList = r.data.map(rel => ({ name: rel.name, tag_name: rel.tag_name, published_at: rel.published_at }));
            releasesCount = releasesList.length;
        } catch { }

        try {
            const i = await axios.get(`https://api.github.com/repos/${repo}/issues?state=open&per_page=50`);
            issuesList = i.data.map(iss => ({ number: iss.number, title: iss.title, user: iss.user.login, state: iss.state }));
        } catch { }

        try {
            const l = await axios.get(`https://api.github.com/repos/${repo}/languages`);
            languages = l.data;
        } catch { }

        let commitsCount = 0;
        try {
            const cRes = await axios.get(`https://api.github.com/repos/${repo}/commits?per_page=1`);
            const l = cRes.headers.link;
            if (l) {
                const match = l.match(/page=(\d+)>; rel="last"/);
                if (match) commitsCount = parseInt(match[1]);
            } else {
                commitsCount = cRes.data.length;
            }

            const commitDataRes = await axios.get(`https://api.github.com/repos/${repo}/commits?per_page=100`);
            recentCommits = commitDataRes.data.map(c => ({
                sha: c.sha.substring(0, 7),
                author: c.commit.author ? c.commit.author.name : "Unknown",
                date: c.commit.author ? c.commit.author.date : "Unknown",
                message: c.commit.message
            }));
        } catch { }

        spinner.stop();

        const table = new Table({
            head: [chalk.blueBright("Metric"), chalk.blueBright("Value")],
            colWidths: [22, 50],
            style: {
                head: [], // disable default coloring
                border: []
            }
        });

        table.push(
            ["Repository", chalk.yellow(data.full_name)],
            ["Description", data.description || "None"],
            ["Stars ⭐", data.stargazers_count],
            ["Forks 🍴", data.forks_count],
            ["Watchers 👀", data.watchers_count],
            ["Open Issues 🐞", data.open_issues_count],
            ["Language 💻", data.language],
            ["Repo Size 📦", data.size + " KB"],
            ["Contributors 👨‍💻", contributorsCount],
            ["Releases 🚀", releasesCount],
            ["Commits 📝", commitsCount],
            ["Subscribers 👀", data.subscribers_count],
            ["Network 🌐", data.network_count],
            ["Created", new Date(data.created_at).toDateString()],
            ["Last Update", new Date(data.updated_at).toDateString()]
        );

        // Removed inline title in favor of top banner

        console.log("\n" + table.toString() + "\n");

        if (Object.keys(languages).length > 0) {

            const chart = renderLanguageChart(languages);

            console.log(
                boxen(chart, {
                    padding: { top: 0, bottom: 0, left: 2, right: 2 },
                    borderStyle: "round",
                    borderColor: "gray"
                })
            );
        }

        const metadata = {
            name: data.full_name,
            description: data.description,
            stars: data.stargazers_count,
            forks: data.forks_count,
            watchers: data.watchers_count,
            openIssuesCount: data.open_issues_count,
            primaryLanguage: data.language,
            sizeKB: data.size,
            totalContributorsApprox: contributorsCount,
            totalReleasesApprox: releasesCount,
            totalCommits: commitsCount,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            allLanguages: languages,
            topContributors: contributorsList,
            recentReleases: releasesList,
            recentOpenIssues: issuesList,
            recentCommits: recentCommits
        };

        return { repo: repo, metadata: metadata };

    } catch (err) {

        spinner.stop();

        console.log(chalk.red("\nGitHub API Error\n"));

        if (err.response) {

            console.log(chalk.yellow("Status:"), err.response.status);

            if (err.response.data && err.response.data.message) {
                console.log(chalk.red("Message:"), err.response.data.message);
            }

            if (err.response.status === 403) {

                console.log(chalk.red("\nAPI rate limit exceeded."));
                console.log(chalk.gray("Limit: 60 requests/hour for public API"));
                console.log(chalk.gray("Use a GitHub token to increase limit."));
            }

            if (err.response.status === 404) {

                console.log(chalk.red("\nRepository not found."));
                console.log(chalk.gray("Check owner/repo format."));
            }

        } else {

            console.log(chalk.red("Network error:"), err.message);
        }
        return null;
    }
}

const readline = require("readline");
const figlet = require("figlet");
const aiEngine = require("./ai-engine");

const repoArg = process.argv[2];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showBanner() {
    console.clear();
    const banner = figlet.textSync("GIT - REPO - ANALYZER", { font: "Standard" });
    console.log(chalk.blueBright(banner));

    console.log(chalk.bold.white("  Enterprise GitHub Intelligence Platform ") + chalk.gray("v1.0.0"));
    console.log(chalk.bold.green("  ● System Online & Ready\n"));

    console.log(boxen(
        chalk.white("Analyze public repositories and launch an AI instance to answer questions,\ngenerate architecture diagrams, and perform automated code reviews.\n\n") +
        chalk.blueBright("Global Install: ") + chalk.white("npm install -g github-repo-analyzer\n") +
        chalk.blueBright("Usage:          ") + chalk.white("GitHub URL") + chalk.gray(" or ") + chalk.white("owner/repo"),
        {
            padding: { top: 1, bottom: 1, left: 2, right: 2 },
            margin: { bottom: 1, left: 2 },
            borderStyle: "round",
            borderColor: "blue"
        }
    ));
}

async function startAILoop(repoInfo) {
    const repoString = repoInfo.repo;
    const metadata = repoInfo.metadata;

    console.log(chalk.bold.magenta("\n  🧠 Activating AI Intelligence for " + repoString + "...\n"));

    if (!process.env.GEMINI_API_KEY) {
        await new Promise(resolve => {
            rl.question(chalk.yellow("  🔑 Enter your Gemini API Key (or set GEMINI_API_KEY env var): "), (key) => {
                process.env.GEMINI_API_KEY = key.trim();
                resolve();
            });
        });
    }

    if (!aiEngine.initAI()) {
        console.log(chalk.red("  ❌ Failed to initialize AI. Missing API Key."));
        return;
    }

    const parts = repoString.split('/');
    const owner = parts[0];
    const name = parts[1];

    const repoPath = await aiEngine.downloadAndExtractRepo(owner, name);
    if (!repoPath) return;

    const context = aiEngine.buildContext(repoPath, metadata);

    console.log(boxen(
        chalk.green("AI is now awake and has fully ingested ") + chalk.bold(repoString) + chalk.green("!\n\n") +
        chalk.white("Commands:\n") +
        chalk.blueBright("  'arch'   ") + chalk.gray("- Generate Architecture Diagram\n") +
        chalk.blueBright("  'review' ") + chalk.gray("- Perform AI Code Review\n") +
        chalk.blueBright("  'impact' ") + chalk.gray("- Analyze impact of a code change\n") +
        chalk.blueBright("  'exit'   ") + chalk.gray("- Return to main menu\n\n") +
        chalk.white("Or simply type any question about the codebase!"),
        { padding: { top: 1, bottom: 1, left: 2, right: 2 }, margin: { left: 2, bottom: 1 }, borderStyle: "round", borderColor: "green" }
    ));

    return new Promise(resolve => {
        function chatLoop() {
            rl.question(chalk.green("  AI ❯ ") + chalk.white("Ask a question: "), async (input) => {
                const cmd = input.trim();
                if (cmd.toLowerCase() === 'exit') {
                    console.log(chalk.gray("  Exiting AI mode..."));
                    resolve();
                    return;
                }

                console.log("");
                if (cmd.toLowerCase() === 'arch') {
                    const diagram = await aiEngine.generateArchitecture(context);
                    if (diagram) console.log("\n" + chalk.cyan(diagram) + "\n");
                    chatLoop();
                } else if (cmd.toLowerCase() === 'review') {
                    const review = await aiEngine.runCodeReview(context);
                    if (review) console.log("\n" + chalk.cyan(review) + "\n");
                    chatLoop();
                } else if (cmd.toLowerCase() === 'impact') {
                    rl.question(chalk.yellow("  What change are you planning to make? "), async (changeDesc) => {
                        console.log("");
                        if (changeDesc.trim()) {
                            const impactReport = await aiEngine.analyzeImpact(context, changeDesc);
                            if (impactReport) console.log("\n" + chalk.cyan(impactReport) + "\n");
                        }
                        chatLoop();
                    });
                } else if (cmd) {
                    const answer = await aiEngine.askQuestion(context, cmd);
                    console.log("\n" + chalk.white(answer) + "\n");
                    chatLoop();
                } else {
                    chatLoop();
                }
            });
        }
        chatLoop();
    });
}

function promptAndAnalyze() {
    rl.question(chalk.cyanBright("  ❯ ") + chalk.bold.white("Enter GitHub URL ") + chalk.gray("(or owner/repo): "), async (answer) => {
        if (answer.trim()) {
            console.log("");
            const repoInfo = await analyzeRepo(answer.trim());
            if (repoInfo) {
                await startAILoop(repoInfo);
            }
            console.log("");
            promptAndAnalyze();
        } else {
            console.log(chalk.red("\n  ❌ Repository cannot be empty.\n"));
            promptAndAnalyze();
        }
    });
}

async function main() {
    if (!repoArg) {
        showBanner();
        promptAndAnalyze();
    } else {
        const repoInfo = await analyzeRepo(repoArg);
        if (repoInfo) {
            await startAILoop(repoInfo);
        }
        console.log("");
        promptAndAnalyze();
    }
}

main();
