# Public Information Review

Baseline: merged main `bdc749421187c017f4cc3ba36b2b9ef1d09fda80`.
This review does not rewrite history or remove intended author attribution.

## Findings and Prevention

- Four documentation commands exposed a personal Windows profile path. Current instructions now start from the Git root; historical copies remain reachable.
- Reachable commits include a personal author/committer email, reported here as `[redacted personal email]`. This is identity metadata, not an authentication secret.
- Future commits in this local clone use the GitHub noreply address already present in account-attributed repository history. Git configuration is local to this clone: new clones must configure their own identity. Preserve the author's name and MIT copyright.
- No actual environment file, PEM key, report directory or local artifact directory is tracked at the baseline. Example configuration is deliberately public and must never supply production credentials.
- The initial redacted Gitleaks 8.30.0 history scan reported two false positives: the security suite's fictional password and an image revision in historical release evidence. `.gitleaks.toml` exceptions combine exact value and exact path. No whole test directory, commit or author is exempted.
- Main validation and both publishing job logs for the baseline were inspected for profile paths, private-key markers and GitHub token patterns. No matches for those patterns were found. This bounded check is not proof that every possible secret is absent.

Run from the pnpm workspace with Docker available:

```sh
node scripts/secret-scan.mjs
```

CI fetches full history, uses a digest-pinned scanner and redacts scanner output. Personal paths in tracked Markdown also fail the check. Check uncommitted changes before committing; history scanning alone cannot catch an unstaged secret. Do not upload raw scan reports, mailboxes, database backups, local certificates, browser profiles or authentication traces. Rotate any genuine exposed credential before considering deletion.

## Historical Email Options (No Rewrite Performed)

1. Keep history, use noreply going forward. This preserves signatures, SHAs, release provenance and external references, but historical email remains visible.
2. Add a `.mailmap` mapping to noreply. Some Git views use it, but raw commit objects still contain the original email. This is presentation cleanup, not erasure.
3. In a separately approved maintenance window, use `git filter-repo` with an exact old-email mapping, retaining author names and commit topology. Author/committer changes alter affected SHAs and all descendant SHAs, invalidate signatures and require coordinated force updates, clone migration and PR/cache handling. Forks, downloaded artifacts and registry provenance may retain old values. GitHub Support may be needed for sensitive cached objects.

If option 3 is ever approved, preserve an offline restricted old-to-new revision map. Release evidence, immutable image digests and hosted CI records must remain explicitly attributed to the original tested revisions; do not substitute new SHAs and imply they were tested. This phase performs none of those rewrite or force-push operations.
