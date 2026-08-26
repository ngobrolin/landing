/**
 * Notice when the hand-copied media-kit figures on `/partners` have gone stale,
 * and raise a GitHub issue about them.
 *
 * Every wrong number that page has shipped was wrong because nothing ever
 * announced it had gone stale — not because updating it was hard. The weekly
 * sync now derives the one figure a read-only key can reach (the subscriber
 * count); everything else on that page is YouTube Analytics data, owner-scoped
 * OAuth only, and is hand-copied into `src/data/media-kit.json`. This is what
 * watches that.
 *
 * It reads the stored `capturedAt` date, never a date parsed out of rendered
 * prose, which would break the first time the wording changed.
 *
 * Usage:
 *   pnpm exec tsx scripts/check-media-kit-freshness.ts
 *
 * Needs no API key at all. Add GITHUB_TOKEN and GITHUB_REPOSITORY (both
 * provided by GitHub Actions) to open/update/close the issue; without them it
 * just prints, which is what you want locally.
 *
 * Exit codes:
 *   0 — the check ran (whether or not the figures are stale; the issue is the
 *       alert, so a stale finding does not paint the workflow red)
 *   1 — the check itself broke. A red run means "this check is not working",
 *       never "a figure is stale".
 */

import {
  ISSUE_TITLE,
  MAX_AGE_MONTHS,
  assessMediaKitFreshness,
  formatIssueBody,
} from './lib/media-kit-freshness';
import { mediaKit, MEDIA_KIT_FIGURES } from '../src/lib/media-kit';

interface Issue {
  number: number;
  state: string;
}

async function github<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error (${path}): ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

/**
 * The one open alert issue, if any. Keyed on the stable title so a monthly
 * re-run updates it instead of opening a twelfth copy over a year.
 */
async function findExistingIssue(repo: string): Promise<Issue | null> {
  const issues = await github<Array<Issue & { title: string; pull_request?: unknown }>>(
    `/repos/${repo}/issues?state=open&per_page=100`,
  );

  return issues.find((issue) => !issue.pull_request && issue.title === ISSUE_TITLE) ?? null;
}

async function syncIssue(repo: string, body: string | null): Promise<void> {
  const existing = await findExistingIssue(repo);

  if (body === null) {
    if (existing) {
      await github(`/repos/${repo}/issues/${existing.number}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
      });
      console.log(`✓ Closed issue #${existing.number} — the figures are current again`);
    }
    return;
  }

  if (existing) {
    // Updated, not re-opened: one issue stays open while the figures stay
    // stale, and the body keeps its month count honest as it ages.
    await github(`/repos/${repo}/issues/${existing.number}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
    console.log(`✓ Updated issue #${existing.number}`);
    return;
  }

  const created = await github<Issue & { html_url: string }>(`/repos/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title: ISSUE_TITLE, body }),
  });
  console.log(`✓ Opened issue ${created.html_url}`);
}

async function main() {
  const freshness = assessMediaKitFreshness(mediaKit.capturedAt, new Date());

  if (freshness.unreadable) {
    console.log(`✗ capturedAt in src/data/media-kit.json is unreadable: "${freshness.capturedAt}"`);
  } else if (freshness.stale) {
    console.log(
      `✗ Media-kit figures were captured ${freshness.capturedAt} — ${freshness.ageMonths} month(s) ago, due since ${freshness.dueAt}`,
    );
    for (const figure of MEDIA_KIT_FIGURES) {
      console.log(`  - ${figure.label}`);
    }
  } else {
    console.log(
      `✓ Media-kit figures captured ${freshness.capturedAt} are current; due ${freshness.dueAt} (${MAX_AGE_MONTHS} months)`,
    );
  }

  const repo = process.env.GITHUB_REPOSITORY;
  if (!process.env.GITHUB_TOKEN || !repo) {
    console.log('(no GITHUB_TOKEN/GITHUB_REPOSITORY — skipping issue sync)');
    return;
  }

  await syncIssue(repo, freshness.stale ? formatIssueBody(freshness, MEDIA_KIT_FIGURES) : null);
}

main().catch((error) => {
  console.error('Media-kit freshness check failed:', error);
  process.exit(1);
});
