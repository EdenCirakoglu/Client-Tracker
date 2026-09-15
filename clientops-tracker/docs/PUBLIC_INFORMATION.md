# Public Information Review

Baseline: merged main `bdc749421187c017f4cc3ba36b2b9ef1d09fda80`.
This review does not rewrite history or remove intended author attribution.

## Findings and Prevention

- Four documentation commands exposed a personal Windows profile path. Current instructions now start from the Git root; historical copies remain reachable.
- Reachable commits include a personal author/committer email, reported here as `[redacted personal email]`. This is identity metadata, not an authentication secret.
- Future commits in this local clone use the GitHub noreply address already present in account-attributed repository history. Git configuration is local to this clone: new clones must configure their own identity. Preserve the author's name and MIT copyright.
- No actual environment file, PEM key, report directory or local artifact directory is tracked at the baseline. Example configuration is deliberately public and must never supply production credentials.
- The initial redacted Gitleaks 8.30.0 history scan reported two false positives: the security suite's fictional password and an image revision in historical release evidence. `.gitleaks.toml` exceptions combine exact value and exact path. No whole test directory, commit or author is exempted.
- The `7eba339` release follow-up added one similarly narrow exception: that exact public merge SHA in `docs/RELEASE_7EBA339.md` was classified as an API key in a `docker pull` command. Its value is public release provenance, not a credential. Transport failures in operational rehearsals now omit request headers, and browser artifact checks reject session-cookie/account-link values. Historical identity cleanup remains a separate, unperformed decision below.
- Main validation and both publishing job logs for the baseline were inspected for profile paths, private-key markers and GitHub token patterns. No matches for those patterns were found. This bounded check is not proof that every possible secret is absent.

Run from the pnpm workspace with Docker available:

```sh
node scripts/secret-scan.mjs
```

CI fetches full history, uses a digest-pinned scanner and redacts scanner output. Personal paths in tracked Markdown also fail the check. Check uncommitted changes before committing; history scanning alone cannot catch an unstaged secret. Do not upload raw scan reports, mailboxes, database backups, local certificates, browser profiles or authentication traces. Rotate any genuine exposed credential before considering deletion.

## Historical Email Options (No Rewrite Performed)

### Artifact and Image Review

Main CI artifact `10320699009` contains a personal email in automatically collected `config.metadata.gitCommit` in `test-results/browser-results.json`. Value: `[redacted personal email]`. Its explicit revision is correct. Future reports disable automatic Git commit/diff capture; the upload gate rejects those fields. The existing artifact was not deleted or modified. Operator options are to let its retention expire or explicitly authorise deletion/replacement with a clearly labelled sanitised copy. Neither removes the original Git identity from history.

The downloaded artifact's Gitleaks scan found no secret candidates. Identity matching additionally detected the metadata above; secret scanning does not replace privacy review. Sample dashboard/ticket screenshots were opened: visible people, organisations and requests are fictional. This is not an OCR audit of every historical image or expired artifact.

The follow-up visual sample included session setup, earlier accounts, invitation confirmation, dark account menu, recovery completion and historical Swagger captures. Password fields were masked and visible identities were fictional. The five current [operations screenshots](SCREENSHOTS.md#operations-acceptance-2026-09-14) were also inspected. This is a documented sample, not a claim that all 58 earlier tracked screenshots were re-audited in this phase. Historical Swagger images remain evidence of their original API revision, not the current session contract.

Both baseline image filesystems were exported without execution and scanned, with archive depth 1 (nested operating-system package archives were skipped). Candidate findings were: the API's shipped fictional security-test password; a Node header integer constant; and Next.js generated preview/action encryption keys in server manifests. The last category is framework runtime material, not an application session secret, and should not be copied to documentation. No draft-preview or Server Action endpoints currently use it. Reassess before enabling those features; public images must not carry production-injected secrets. Exact historical personal-email matching found no matches in either exported filesystem. This scan covers flattened runtime files, not a claim about every upstream image layer, registry log or inaccessible/expired workflow artifact.

The new local API runtime image was also checked: source, test and `.env` files are absent; compiled migration and restore executables are present. The package allowlist now contains only `dist` and `drizzle`. This improves future image contents; it does not retroactively change the published baseline image.

Passing PR CI artifact `10344580835`, revision `1a651224be7f2f1095ec164e0e255096332c3b08`, was downloaded and inspected: no automatic Git identity/diff metadata, no private TLS/backup/configuration files, no secret-scan candidates, and no exact historical personal-email matches in unpacked text/JSON/HTML files. See [revision-specific results and scope](OPERATIONS_READINESS.md#passing-implementation-revision). The earlier identity-bearing artifact remains a separate unresolved retention/removal decision.

Intended attribution in LICENSE and project documentation remains unchanged.

1. Keep history, use noreply going forward. This preserves signatures, SHAs, release provenance and external references, but historical email remains visible.
2. Add a `.mailmap` mapping to noreply. Some Git views use it, but raw commit objects still contain the original email. This is presentation cleanup, not erasure.
3. In a separately approved maintenance window, use `git filter-repo` with an exact old-email mapping, retaining author names and commit topology. Author/committer changes alter affected SHAs and all descendant SHAs, invalidate signatures and require coordinated force updates, clone migration and PR/cache handling. Forks, downloaded artifacts and registry provenance may retain old values. GitHub Support may be needed for sensitive cached objects.

If option 3 is ever approved, preserve an offline restricted old-to-new revision map. Release evidence, immutable image digests and hosted CI records must remain explicitly attributed to the original tested revisions; do not substitute new SHAs and imply they were tested. This phase performs none of those rewrite or force-push operations.
