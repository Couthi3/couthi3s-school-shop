// GitHub REST API integration for "Ralsei's School Shops".
//
// What it does for this site: when your school's staff triages a feedback
// ticket (bug report, suggestion, staff application), one click pushes it
// into the project's GitHub repo as a labeled issue. That gives real issue
// tracking, assignment, and status history that lives beyond the panel.
//
// Auth: a GitHub personal access token (fine-grained, with "Issues: read &
// write" on the repo) provided via the GITHUB_TOKEN environment variable —
// set it in the Keys tab. The token never reaches the browser; these run
// server-side only.

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { CAP } from "./adminRanks";
import { currentAdminLevel } from "./support";

const GITHUB_API = "https://api.github.com";

// Same staff gate the tickets queue uses.
const requireTicketCap = async (ctx: never): Promise<boolean> => {
  const level = await currentAdminLevel(ctx);
  return level >= CAP.tickets;
};

// Ticket category -> GitHub issue label.
const GITHUB_LABELS = {
  issue: "bug",
  suggestion: "enhancement",
  staff: "help wanted",
} as const;

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ralsei-school-shops",
  };
}

// Shape returned to the admin UI.
type PushResult = {
  ok: boolean;
  error?: string;
  repoFull?: string;
  openIssues?: number;
  login?: string;
  issueNumber?: number;
  issueUrl?: string;
};

const mapGithubError = (status: number, body: string): string => {
  if (status === 401) return "GITHUB_TOKEN is invalid or expired (401).";
  if (status === 403) return "Token lacks access to this repo, or hit a rate limit (403).";
  if (status === 404) return "Repo not found — check GITHUB_REPO (owner/name) and that the token can see it (404).";
  if (status === 422) return "GitHub rejected the issue (422) — possibly validation or spam limits.";
  return `GitHub API error ${status}: ${body.slice(0, 200)}`;
};

const envError = (name: string) =>
  ({ ok: false, error: `${name} is not set — add it in the Keys tab.` }) as const;

// Sanity check: verifies the token works and the repo is reachable.
// Shown as a status card in the admin tickets section.
export const testConnection = action({
  args: {},
  handler: async (ctx): Promise<PushResult> => {
    if (!(await requireTicketCap(ctx as never))) {
      return { ok: false, error: "Staff (level 2+) admin access required." };
    }
    const token = process.env.GITHUB_TOKEN;
    if (!token) return envError("GITHUB_TOKEN");
    const repo = process.env.GITHUB_REPO;
    if (!repo) return envError("GITHUB_REPO");
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo.trim())) {
      return { ok: false, error: "GITHUB_REPO must be in the form owner/name (e.g. Couthi3/couthi3s-school-shop)." };
    }

    try {
      const res = await fetch(`${GITHUB_API}/repos/${repo.trim()}`, {
        headers: githubHeaders(token),
      });
      if (!res.ok) return { ok: false, error: mapGithubError(res.status, await res.text()) };

      const repoData = (await res.json()) as { full_name: string; open_issues_count: number };
      const userRes = await fetch(`${GITHUB_API}/user`, { headers: githubHeaders(token) });
      const userData = userRes.ok ? ((await userRes.json()) as { login: string }) : null;

      return {
        ok: true,
        repoFull: repoData.full_name,
        openIssues: repoData.open_issues_count,
        login: userData?.login,
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Network error reaching GitHub." };
    }
  },
});

// Push a support ticket to GitHub as a labeled issue, then (optionally,
// via the separate linkTicketIssue mutation) record the issue URL on the
// ticket so admins can jump back to it.
export const createIssueFromTicket = action({
  args: {
    title: v.string(),
    body: v.string(),
    category: v.union(v.literal("issue"), v.literal("suggestion"), v.literal("staff")),
    submitter: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PushResult> => {
    if (!(await requireTicketCap(ctx as never))) {
      return { ok: false, error: "Staff (level 2+) admin access required." };
    }
    const token = process.env.GITHUB_TOKEN;
    if (!token) return envError("GITHUB_TOKEN");
    const repo = process.env.GITHUB_REPO;
    if (!repo) return envError("GITHUB_REPO");

    const title = args.title.trim().slice(0, 200);
    if (!title) return { ok: false, error: "Ticket has no title to push." };

    const body = [
      args.body.trim(),
      "",
      "---",
      `_Filed from Ralsei's School Shops feedback queue._`,
      args.submitter ? `_Submitted by: ${args.submitter}_` : null,
      `_Category: ${args.category}_`,
    ]
      .filter((line) => line !== null)
      .join("\n")
      .slice(0, 60_000); // GitHub issue body limit is 64k chars

    try {
      const res = await fetch(`${GITHUB_API}/repos/${repo.trim()}/issues`, {
        method: "POST",
        headers: { ...githubHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          labels: [GITHUB_LABELS[args.category]],
        }),
      });
      if (!res.ok) return { ok: false, error: mapGithubError(res.status, await res.text()) };

      const issue = (await res.json()) as { number: number; html_url: string };
      return { ok: true, issueNumber: issue.number, issueUrl: issue.html_url };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Network error reaching GitHub." };
    }
  },
});
