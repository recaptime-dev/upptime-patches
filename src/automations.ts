import { readFile } from "fs-extra";
import { join } from "path";
import { Octokit } from "@octokit/rest";
import { config } from "dotenv";
config();

const createAutomatedIssue = async () => {
  const octokit = new Octokit({
    auth: process.env.AUTOMATION_TOKEN,
  });
  const searchResults = await octokit.search.repos({
    q: "topic:upptime",
    per_page: 100,
  });
  const numberOfPages = Math.floor(searchResults.data.total_count / 100);
  const body = await readFile(join(".", "src", "issue-template.md"), "utf8");
  for await (const page of Array.from(Array(numberOfPages)).map((_, i) => i + 1)) {
    const results = await octokit.search.repos({
      q: "topic:upptime",
      per_page: 100,
      page,
    });
    for await (const repository of results.data.items) {
      const owner = repository.owner.login;
      const repo = repository.name;
      try {
        await octokit.issues.create({
          owner,
          repo,
          title: "⚠️ Add `workflow` scope to your personal access token",
          body: body.replace("{{TEAM}}", owner),
          labels: ["bug", "upptime-automated"],
        });
        console.log("Created an issue in", owner, repo);
      } catch (error) {
        console.log("Got an error in creating this issue", error);
      }
    }
  }
};
createAutomatedIssue();
