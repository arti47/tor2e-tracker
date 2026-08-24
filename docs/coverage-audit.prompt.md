# Portable prompt — verify the app actually implements its source document

Companion to `reachability-audit.prompt.md`. The two are **inverses**, and neither
substitutes for the other:

| audit | direction | catches |
|---|---|---|
| Reachability | code → user | shipped code nobody can reach |
| **Coverage (this one)** | **source doc → code** | **a documented feature never implemented** |

A reachability suite stays green on an app missing half its specification, because an
unimplemented feature leaves no artefact to detect. That is the gap this closes.

"Source document" means whatever your project is *obliged* to implement: a rulebook, an
RFC, API docs you mirror, a PRD, a compliance standard, a design system, a migration spec.

Adjust only the bracketed parts.

---

## The prompt

> Audit whether this project actually implements [SOURCE DOCUMENT], and commit the result as a
> test so drift becomes a failing build rather than a stale paragraph.
>
> **Read this first — the trap that makes this audit worthless.**
> Do **not** generate the feature list by scanning the codebase. A checklist derived from the
> code will map perfectly onto the code and pass by construction, forever, while telling you
> nothing. The list must come **from the source document**. If you can produce it without
> opening [SOURCE DOCUMENT], you have built something useless. When you cannot access a section,
> mark it `unknown` and say so — never infer a requirement from an implementation.
>
> **Step 1 — build the feature list.** Work through [SOURCE DOCUMENT, or: the sections I paste in]
> and produce a machine-readable list — [docs/coverage.json, or a format that fits this project] —
> with one entry per discrete requirement:
> - `id` — stable slug, never renumbered.
> - `source` — where it comes from ([page/section/RFC clause]), so a reader can go check.
> - `summary` — one line, in the document's own terms, not the code's.
> - `marker` — the specific code artefact that implements it (function, constant, endpoint,
>   element id, test name). Most specific thing that would genuinely disappear if the feature
>   were removed.
> - `status` — `implemented` · `partial` · `deliberately-omitted` · `unknown`.
> - `note` — **required** for anything not `implemented`: why, and what is missing.
>
> **Step 2 — write the spec.** Add a check to [the test suite] that:
> - fails if anything marked `implemented` has a marker that no longer exists in the source;
> - fails if any entry lacks a `source` citation or a marker;
> - fails if a `partial` / `deliberately-omitted` / `unknown` entry has no `note`;
> - prints a per-status count so coverage is a re-derived number, not a claim in prose.
>
> **Step 3 — prove it fails.** Rename or delete one marker and show the spec naming that feature
> and exiting non-zero; restore it and show green. A coverage spec that only ever passes is the
> most dangerous kind, because it reads like assurance. Do not skip this.
>
> **Choosing markers — the difference between a real test and a decorative one.**
> - Too coarse (a whole file, a broad module) → always present, never fails. Useless.
> - Too brittle (a line number, an exact string of prose) → fails on unrelated edits, gets
>   muted, then ignored.
> - Aim for: the named function/constant/route that *is* the feature. If deleting the feature
>   would leave that marker behind, pick a different marker.
>
> **Be honest in `status`.** `partial` is not a place to park things you did not check —
> that is what `unknown` is for. Every `partial` must say in its note what is missing, so the
> entry is actionable rather than a shrug.
>
> **State the limits in the file itself.** This test proves a *mapping* exists. It does not prove
> the implementation is correct — a constant can exist and hold wrong values, an endpoint can
> exist and return the wrong shape. Write that caveat into the coverage file so nobody mistakes
> a green run for verified behaviour. Where correctness matters and is cheap to assert, add a
> real behavioural test alongside and reference it as the marker.
>
> **Version the source.** Record which edition/revision of [SOURCE DOCUMENT] the list was built
> from. A coverage number against an unspecified version is not meaningful.
>
> Finally, record in [CLAUDE.md / the project docs]: what the list covers so far, which sections
> of the source are still `unknown`, and how to extend it. Coverage is built incrementally —
> the goal is an honest partial map that grows, not a fake complete one.

---

## Seeding it when the source document isn't to hand

If the source isn't machine-readable or you can't share it yet, seed the list from any existing
prose (a coverage matrix, a changelog, a feature history) **and mark every seeded entry
`unknown` until checked against the real document**. That immediately buys regression
detection — an implemented feature losing its implementation — while being honest that omission
detection isn't active yet. Then work through the source section by section, promoting entries
out of `unknown`.

Do not let seeded entries silently become `implemented`. That is how the circularity trap
re-enters through the back door.

## Why the two prompts belong together

- Coverage alone: every documented feature exists, but some may be unreachable in the UI.
- Reachability alone: everything shipped is reachable, but the app may be missing half the spec.

Run both. They fail on opposite mistakes.
