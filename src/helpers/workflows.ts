import { getOctokit } from "./github";
import { getConfig } from "./config";
import {
  GRAPHS_CI_SCHEDULE,
  RESPONSE_TIME_CI_SCHEDULE,
  STATIC_SITE_CI_SCHEDULE,
  SUMMARY_CI_SCHEDULE,
  UPDATE_TEMPLATE_CI_SCHEDULE,
  UPDATES_CI_SCHEDULE,
  UPTIME_CI_SCHEDULE,
} from "./constants";

let release: string | undefined = undefined;
const getUptimeMonitorVersion = async () => {
  if (release) return release;
  const octokit = await getOctokit();
  const releases = await octokit.repos.listReleases({
    owner: "upptime",
    repo: "uptime-monitor",
    per_page: 1,
  });
  release = releases.data[0].tag_name;
  return release;
};

const introComment = async () => `# This file was generated by upptime/uptime-monitor@${await getUptimeMonitorVersion()}
#
# ===============================
# Do not edit this file directly!
# ===============================
#
# Your changes will be overwritten when the template updates (daily)
# Instead, change your .upptimerc.yml configuration: https://upptime.js.org/docs`;

export const graphsCiWorkflow = async () => {
  const config = await getConfig();
  const workflowSchedule = config.workflowSchedule || {};

  return `${introComment()}

name: Graphs CI
on:
  schedule:
    - cron: "${workflowSchedule.graphs || GRAPHS_CI_SCHEDULE}"
  repository_dispatch:
    types: [graphs]
  workflow_dispatch:
jobs:
  release:
    name: Generate graphs
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2.3.3
        with:
          ref: \${{ github.head_ref }}
          token: \${{ secrets.GH_PAT }}
      - name: Generate graphs
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "graphs"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
`;
};

export const responseTimeCiWorkflow = async () => {
  const config = await getConfig();
  const workflowSchedule = config.workflowSchedule || {};

  return `${introComment()}

name: Response Time CI
on:
  schedule:
    - cron: "${workflowSchedule.responseTime || RESPONSE_TIME_CI_SCHEDULE}"
  repository_dispatch:
    types: [response_time]
  workflow_dispatch:
jobs:
  release:
    name: Check status
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2.3.3
        with:
          ref: \${{ github.head_ref }}
          token: \${{ secrets.GH_PAT }}
      - name: Update response time
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "response-time"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
          SECRETS_CONTEXT: \${{ toJson(secrets) }}
`;
};

export const setupCiWorkflow = async () => {
  const config = await getConfig();
  const workflowSchedule = config.workflowSchedule || {};

  return `${introComment()}

name: Setup CI
on:
  push:
    paths:
      - ".upptimerc.yml"
  repository_dispatch:
    types: [setup]
  workflow_dispatch:
jobs:
  release:
    name: Setup Upptime
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2.3.3
        with:
          ref: \${{ github.head_ref }}
          token: \${{ secrets.GH_PAT }}
      - name: Update template
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "update-template"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
      - name: Update response time
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "response-time"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
          SECRETS_CONTEXT: \${{ toJson(secrets) }}
      - name: Update summary in README
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "readme"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
      - name: Generate graphs
        uses: benc-uk/workflow-dispatch@v1
        with:
          workflow: Graphs CI
          token: \${{ secrets.GH_PAT }}
      - name: Generate site
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "site"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
      - uses: maxheld83/ghpages@v0.3.0
        name: GitHub Pages Deploy
        env:
          BUILD_DIR: "site/status-page/__sapper__/export/"
          GH_PAT: \${{ secrets.GH_PAT }}
`;
};

export const siteCiWorkflow = async () => {
  const config = await getConfig();
  const workflowSchedule = config.workflowSchedule || {};

  return `${introComment()}

name: Static Site CI
on:
  schedule:
    - cron: "${workflowSchedule.staticSite || STATIC_SITE_CI_SCHEDULE}"
  workflow_dispatch:
jobs:
  release:
    name: Build and deploy site
    runs-on: ubuntu-18.04
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    steps:
      - name: Checkout
        uses: actions/checkout@v2.3.3
        with:
          ref: \${{ github.head_ref }}
          token: \${{ secrets.GH_PAT }}
      - name: Generate site
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "site"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
      - uses: maxheld83/ghpages@v0.3.0
        name: GitHub Pages Deploy
        env:
          BUILD_DIR: "site/status-page/__sapper__/export/"
          GH_PAT: \${{ secrets.GH_PAT }}
`;
};

export const summaryCiWorkflow = async () => {
  const config = await getConfig();
  const workflowSchedule = config.workflowSchedule || {};

  return `${introComment()}

name: Summary CI
on:
  schedule:
    - cron: "${workflowSchedule.summary || SUMMARY_CI_SCHEDULE}"
  repository_dispatch:
    types: [summary]
  workflow_dispatch:
jobs:
  release:
    name: Generate README
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2.3.3
        with:
          ref: \${{ github.head_ref }}
          token: \${{ secrets.GH_PAT }}
      - name: Update summary in README
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "readme"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
      - name: Run readme-repos-list
        uses: koj-co/readme-repos-list@master
        with:
          token: \${{ secrets.GH_PAT }}
          query: "topic:upptime"
          size: 30
          max: 1000
          one-per-owner: true
`;
};

export const updateTemplateCiWorkflow = async () => {
  const config = await getConfig();
  const workflowSchedule = config.workflowSchedule || {};

  return `${introComment()}

name: Update Template CI
on:
  schedule:
    - cron: "${workflowSchedule.updateTemplate || UPDATE_TEMPLATE_CI_SCHEDULE}"
  repository_dispatch:
    types: [update_template]
  workflow_dispatch:
jobs:
  release:
    name: Build
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2.3.3
        with:
          ref: \${{ github.head_ref }}
          token: \${{ secrets.GH_PAT }}
      - name: Update template
        uses: upptime/uptime-monitor@master
        with:
          command: "update-template"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
`;
};

export const updatesCiWorkflow = async () => {
  const config = await getConfig();
  const workflowSchedule = config.workflowSchedule || {};

  return `${introComment()}

name: Updates CI
on:
  schedule:
    - cron: "${workflowSchedule.updates || UPDATES_CI_SCHEDULE}"
  workflow_dispatch:
jobs:
  release:
    name: Deploy updates
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2.3.3
        with:
          ref: \${{ github.head_ref }}
          token: \${{ secrets.GH_PAT }}
      - name: Update code
        uses: upptime/updates@master
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
`;
};

export const uptimeCiWorkflow = async () => {
  const config = await getConfig();
  const workflowSchedule = config.workflowSchedule || {};

  return `${introComment()}

name: Uptime CI
on:
  schedule:
    - cron: "${workflowSchedule.uptime || UPTIME_CI_SCHEDULE}"
  workflow_dispatch:
jobs:
  release:
    name: Check status
    runs-on: ubuntu-18.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2.3.3
        with:
          ref: \${{ github.head_ref }}
          token: \${{ secrets.GH_PAT }}
      - name: Check endpoint status
        uses: upptime/uptime-monitor@${await getUptimeMonitorVersion()}
        with:
          command: "update"
        env:
          GH_PAT: \${{ secrets.GH_PAT }}
          SECRETS_CONTEXT: \${{ toJson(secrets) }}
`;
};
