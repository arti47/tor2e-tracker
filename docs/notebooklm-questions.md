# NotebookLM questions — what to ask, and why

Notebook: **TOR2E** (Core Rules · Cheat Sheet · Peoples of Wilderland · Character Lifepaths ·
Rivendell · Ruins of the Lost Realm · Strider Mode · Moria)

## How to ask (this part matters more than the questions)

1. **Demand quotes and page numbers.** "Quote the relevant passage and cite the page." Summaries
   are where invention creeps in; a quote can be checked.
2. **Name the source.** Ask about *one* supplement at a time. Mixing Core + Strider + Moria in one
   question produces a blended answer that matches no book.
3. **Ask what the book does NOT say.** End questions with: *"If the book does not address this,
   say so explicitly rather than inferring an answer."* This is the single most useful sentence —
   it converts silent invention into a usable "not covered".
4. **Never trust a number.** Per GOTCHA 2, NotebookLM's text layer garbles numeric tables and the
   model infers plausible progressions instead of reading them — that is how the XP table got
   hallucinated as 4/8/12/16/20/24. For any figure, render the PDF page before changing code.

---

## A. Validate the saga feature (highest value — it is live and unverified)

The campaign-arc card was designed by Claude, not derived from the books. These questions confirm
or correct it.

1. *In the **Strider Mode** supplement, how does a solo campaign begin? Quote any text about the
   starting situation, the hero's initial goal, or setting up the first session. Cite pages. If it
   does not address this, say so explicitly.*
2. *Does **Strider Mode** define a procedure for what a player does at the start and end of a play
   session? Quote it. If there is no such procedure, say so.*
3. *How does a **Strider Mode** solo campaign end? Is there guidance on campaign length, a final
   goal, or when to stop? Quote and cite.*
4. *In **Strider Mode**, what role does the Patron play in generating adventures? Is the Patron the
   intended source of a solo hero's missions?*
5. *In the **Core Rules**, what is the intended pacing between the Adventuring Phase and the
   Fellowship Phase — how much play happens before a Fellowship Phase? Quote and cite.*
6. *List every rules-defined way a player-hero's career permanently ends in **Core Rules** TOR2E.
   Quote each and cite the page.*

## B. Verify things the app asserts

7. *In **Strider Mode**, when the Oracle's Telling Table is used, what exactly is the player meant
   to ask it, and what are they NOT meant to ask it? Quote the guidance.*
8. *What does **Strider Mode** say about the Eye of Mordor's Hunt thresholds by region, and what
   happens mechanically when Eye Awareness reaches the threshold? Quote the text — and separately
   confirm the numbers, which I will verify against the PDF page.*
9. *Does **Strider Mode** change how Fellowship Focus or the Support action work for a lone hero?
   Quote it.*

## C. Build the coverage list (feeds docs/coverage-audit.prompt.md)

Ask these one chapter at a time; paste each answer back and it becomes coverage entries.

10. *List every distinct rule or subsystem in **[chapter name]** of the **Core Rules** as a numbered
    list. For each: a one-line summary in the book's own terms, and the page. Do not group or
    summarise across rules — one entry per discrete rule.*
11. Repeat for: Action Resolution · Combat · Journeys · Councils · Shadow · Fellowship Phase ·
    Treasure · Adversaries, then the same for **Strider Mode** and **Moria**.

> Entries must come from the book, never from the app. A checklist derived from the code passes by
> construction and proves nothing — see `coverage-audit.prompt.md`.

---

## What I do with the answers

- **A1–A4** → correct or confirm the saga card's copy and flow.
- **A5–A6** → fix `sagaEndSignals()` thresholds and the Fellowship Phase prompt.
- **B7–B9** → correct Reference entries and any wrong in-app guidance.
- **C10–C11** → author `docs/coverage.json` and wire the coverage spec.

Paste answers verbatim, including the "not addressed" ones — a documented gap is as useful as a rule.

---

# Round 2 — asked 2026-08-24

Round 1 (saga arc, Telling Table, Focus, Revelation) is answered and applied. These are next,
ordered by what they unblock.

## Ask NotebookLM (qualitative — safe from the numeric-table trap)

12. **Experience Milestones — the list.** *In **Strider Mode**, list every Experience Milestone by
    name, exactly as the book gives them. Quote the list and cite the page. Do not paraphrase or
    reorder. If the book presents them in a table, say so and transcribe the row labels only —
    I will read the point values off the PDF myself.*
    → **Most urgent.** The app's `XP_MILESTONES` has ten entries and, unlike `MORIA_EXP_MILESTONES`
    (cited p.211), **no page citation** — so it may be invented. Solo play now defaults to this
    scheme, so if the list is wrong, every solo hero advances wrongly.

13. **What raises Eye Awareness.** *In **Strider Mode**, list every event that increases or
    decreases a hero's Eye Awareness. Quote each trigger and cite the page. If the book does not
    define a trigger for something, say so rather than inferring one.*
    → The app auto-adjusts EA in five places: a Feat-die Eye or Rune outside combat, a Magical
    Success, any Shadow gain, and ±  on the Fortune / Ill-Fortune tables. If those triggers are
    invented, every solo campaign is mis-paced.

14. **Lore Table — how to read it.** *In **Strider Mode**, how is a player meant to interpret the
    Lore Table's Action / Aspect / Focus results? Quote any guidance on interpreting, re-rolling,
    or combining the words.*
    → Exactly the gap the Telling Table had: the app renders the table but says nothing about how
    to use the output.

15. **Fortune and Ill-Fortune — when.** *In **Strider Mode**, exactly when are the Fortune and
    Ill-Fortune tables rolled? Quote the trigger conditions and cite the page.*
    → The app auto-prompts on a Rune with a success, and an Eye with a failure. Unverified.

16. **Special Successes.** *In **Strider Mode**, list the ways a solo player may spend ✦ success
    icons. Quote the list and cite the page.*
    → The app offers six spends (Gain Insight, Go Quietly, Make Haste, Widen Influence, Build
    Advantage, Cancel a Failure). Unverified.

17. **Skirmish stance.** *Does **Strider Mode** add a Skirmish stance? Quote its full rules text.*
    → The app adds it as a fifth stance with a Gain Ground combat task.

## Read off the PDF yourself (numbers — do NOT trust the notebook)

Per GOTCHA 2. Render the page and read the figure; the notebook invents clean progressions.

- **P1. Hunt thresholds** by region — open item 1b. Round 1 gave Free 20 / Border 18 / Wild 16 /
  Shadow 14 / Dark 12 against the app's `{border:18, wild:16, dark:14}`. **Blocking.**
- **P2. Milestone point values** — the sp/ap for each row of Q12's list.
- **P3. Strider Mode Target Number formula** — the app uses **18 − Rating** in solo vs 20 − Rating
  normally. This changes literally every roll, so it is worth eyeballing directly.
- **P4. Previous Experience budget in solo** — the app uses **15** vs the standard 10.
- **P5. Minimum Fellowship Rating in solo** — the app forces **3**.
