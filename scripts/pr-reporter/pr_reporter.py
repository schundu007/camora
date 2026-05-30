#!/usr/bin/env python3
"""
GitHub PR Reporter

Fetches every pull request from a GitHub repository and prints a report
indicating whether all checks passed for each PR.

Usage:
    python pr_reporter.py [owner/repo]

    The default repository is venmo/foundations-interview.

    Set GITHUB_TOKEN to a personal access token for higher rate limits
    (5 000 req/hr authenticated vs 60 unauthenticated).

Example:
    GITHUB_TOKEN=ghp_... python pr_reporter.py
    GITHUB_TOKEN=ghp_... python pr_reporter.py octocat/Hello-World
"""

import os
import sys
from dataclasses import dataclass
from typing import Optional

import requests


# ── Data model ────────────────────────────────────────────────────────────────


@dataclass
class PR:
    """Represents a single GitHub Pull Request."""

    number: int
    title: str
    author: str
    sha: str
    checks_passed: bool

    def __str__(self) -> str:
        mark = "✓" if self.checks_passed else "✗"
        return f'{mark} {self.author}: #{self.number} "{self.title}"'


# ── GitHub API helpers ────────────────────────────────────────────────────────


def _headers(token: Optional[str]) -> dict:
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _all_checks_passed(owner: str, repo: str, sha: str, hdrs: dict) -> bool:
    """
    Return True if every status and check run on *sha* is successful.

    GitHub exposes two separate check systems:
      1. Commit statuses  — the older /status endpoint (Jenkins, Travis, etc.)
      2. Check runs       — the newer /check-runs endpoint (GitHub Actions, etc.)

    A PR is considered fully passing only when both systems report success.
    If a system has no entries at all it is treated as not failing.
    """
    base = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"

    # 1. Legacy commit statuses — combined endpoint returns a single "state"
    resp = requests.get(f"{base}/status", headers=hdrs, timeout=15)
    resp.raise_for_status()
    status_data = resp.json()
    if status_data.get("statuses"):          # skip evaluation when no statuses exist
        if status_data["state"] != "success":
            return False

    # 2. Check runs (GitHub Actions / third-party CI) — may be paginated
    page = 1
    while True:
        resp = requests.get(
            f"{base}/check-runs",
            headers=hdrs,
            params={"per_page": 100, "page": page},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        runs = data.get("check_runs", [])

        for run in runs:
            if run["status"] != "completed" or run["conclusion"] not in {
                "success", "skipped", "neutral"
            }:
                return False

        if len(runs) < 100:      # last page
            break
        page += 1

    return True


# ── Fetch & parse ─────────────────────────────────────────────────────────────


def fetch_prs(owner: str, repo: str, token: Optional[str] = None) -> list:
    """
    Return a list of PR objects for every pull request in *owner/repo*
    (both open and closed), in the order returned by the GitHub API.
    """
    hdrs = _headers(token)
    prs = []
    page = 1

    while True:
        resp = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers=hdrs,
            params={"state": "all", "per_page": 100, "page": page},
            timeout=15,
        )
        resp.raise_for_status()
        items = resp.json()
        if not items:
            break

        for item in items:
            sha = item["head"]["sha"]
            prs.append(PR(
                number=item["number"],
                title=item["title"],
                author=item["user"]["login"],
                sha=sha,
                checks_passed=_all_checks_passed(owner, repo, sha, hdrs),
            ))

        page += 1

    return prs


# ── Report ────────────────────────────────────────────────────────────────────


def generate_report(prs: list) -> str:
    """Return the formatted report string for the given list of PRs."""
    if not prs:
        return "(no pull requests found)"
    return "\n".join(str(pr) for pr in prs)


# ── Entry point ───────────────────────────────────────────────────────────────


def main() -> None:
    token = os.environ.get("GITHUB_TOKEN")

    if len(sys.argv) == 2 and "/" in sys.argv[1]:
        owner, repo = sys.argv[1].split("/", 1)
    else:
        owner, repo = "venmo", "foundations-interview"

    print(f"Fetching PRs for {owner}/{repo}…", file=sys.stderr)

    try:
        prs = fetch_prs(owner, repo, token)
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else "?"
        print(f"GitHub API error {code}: {exc}", file=sys.stderr)
        if code == 403:
            print(
                "Rate-limit hit. Set GITHUB_TOKEN to get 5 000 req/hr.",
                file=sys.stderr,
            )
        elif code == 404:
            print(
                f"Repository '{owner}/{repo}' not found or is private.",
                file=sys.stderr,
            )
        sys.exit(1)
    except requests.RequestException as exc:
        print(f"Network error: {exc}", file=sys.stderr)
        sys.exit(1)

    print(generate_report(prs))


if __name__ == "__main__":
    main()
