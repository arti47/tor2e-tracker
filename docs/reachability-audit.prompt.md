# Portable prompt — turn a reachability audit into a committed test

Paste the block below into Claude Code (or any coding agent) in **any** project.
It produces a permanent spec instead of a one-off audit, so "check until there are
no errors" becomes a command anyone can run, not a conversation.

Adjust only the bracketed parts.

---

## The prompt

> Audit this project for **reachability defects** — things that ship in the code but the
> user can never actually get to — and then commit the audit as a test so it can't regress.
>
> **Definition.** A reachability defect is not a crash and not a wrong result. It is
> shipped-but-unreachable surface. Hunt these classes:
>
> 1. **Orphan functions** — declared, referenced nowhere (no call site, no handler, no export).
> 2. **Orphan content** — data tables/constants/assets defined but never surfaced in any view.
> 3. **Unrevealed elements** — markup that ships hidden and that no code path ever shows.
> 4. **Inert controls** — a visible control wired to nothing, or wired to a name that doesn't exist.
> 5. **Broken navigation targets** — "go here to fix this" links/jumps pointing at a route,
>    screen or element id that doesn't resolve.
> 6. **Dead-end guards** — a blocked action that names a destination but can't take the user
>    there, or refuses silently with no feedback at all.
> 7. **Missing shipped files** — anything a build manifest, service worker, or asset reference
>    lists that isn't on disk.
> 8. **Unclosable/unopenable modals** — an overlay with no opener, or none with a *visible* exit.
>
> **Method.** Prefer static source analysis (fast, no environment needed) and fall back to
> driving the running app only where static analysis can't decide. Report each class with a
> count and the offending names.
>
> **Beware these false positives.** I want defects, not noise — verify before reporting:
> - Identifiers assigned at runtime (`el.id = 'x'`, `obj.dataset.y = …`) never appear as
>   literals in source. Grepping for `id="x"` will miss them.
> - Names built by concatenation or templating (`'prefix-' + n`, `` `data-${type}` ``) look
>   orphaned to a literal search.
> - CSS classes used only in compound selectors (`.pip.filled`) look unstyled to a bare
>   `.filled` grep. Classes driven purely by JS visibility legitimately have no CSS.
> - Elements inside an inactive tab/route report zero size and no offset parent. Check the
>   property the code actually sets, or activate the container first.
> - When testing "can this modal be closed", match only **visible** controls — a hidden
>   Back/Cancel button makes a working closer look broken.
>
> **Deliverable.** Add a spec file to the existing test suite — [tests/specs/reachability.js,
> or wherever this project's tests live] — with one check per class above. Wire it into the
> test runner so it runs with everything else. Requirements:
> - Each check reports a count **and names the offenders** in its message. A check that only
>   says pass/fail is not actionable.
> - Any deliberate exemption is listed inline **with the reason**, so a later reader can tell
>   an accepted exception from a regression.
> - **Prove the spec fails.** Inject a synthetic defect of at least one class (e.g. add an
>   unreferenced function), show the spec reporting it by name and exiting non-zero, then
>   remove it and show green again. A spec that only ever passes is worthless — do not skip this.
>
> **Then fix what it found**, re-running until every class reports zero. If something is
> genuinely intentional dead code, either delete it or add a documented exemption — don't
> leave the detector reporting known-noise, because that trains everyone to ignore it.
>
> **Do not** build a retry loop around the tests. These failures are deterministic; looping
> would spin forever. The runner should exit non-zero on failure so it works as a pre-commit
> hook or CI gate, and the fix loop is human-driven: run → read the names → fix → re-run.
>
> Finally, record in [CLAUDE.md / the project's docs] what the spec covers, what is
> deliberately exempt and why, and any false-positive traps you hit — so the next person
> doesn't re-investigate them.

---

## Why it's shaped this way

- **"Prove the spec fails"** is the clause that matters most. It's easy to write a detector
  whose regex silently matches nothing and reports a permanent, meaningless pass.
- **"Names the offenders"** turns a red build into a work list.
- **The false-positive list** is the expensive part — each entry cost a real investigation.
  Carry it across projects; the traps are language-agnostic patterns, not app-specific.
- **"Delete it or exempt it with a reason"** prevents the slow drift into a detector everyone
  ignores because it always shows three known warnings.

## Adapting to a project without a test suite

Ask for the spec as a standalone script (`scripts/reachability.js`, `make audit`) that exits
non-zero on findings. Everything else in the prompt is unchanged — the classes, the traps,
and the prove-it-fails requirement are independent of the runner.
