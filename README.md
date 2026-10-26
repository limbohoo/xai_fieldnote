# XAI Fieldnotes

A Chinese/English learning guide to explainable AI for industrial-design and HCI learners new to the field: a five-chapter learning path, a worked example (case lab and model walkthrough) and a glossary.

## Content

- Three-level research map and six taxonomy dimensions.
- Six method panels (interpretable models, TreeInterpreter, SHAP / TreeSHAP, LIME, Grad-CAM, counterfactual), a TreeInterpreter / TreeSHAP / LIME comparison table, and a visual atlas of LIME, TreeInterpreter and SHAP.
- Four detailed paper cases, with evidence separated from design propositions.
- A ten-step workflow from context to validation; the sources it draws on are named on the page.
- Five collapsible chapters: field and questions; methods and paper cases; visual method atlas; ten-step workflow and evaluation; further reading (frontiers, reading route and bibliography). In-page links open the chapter that holds their target.
- Four frontier entry points, a four-round reading route and the linked sources.
- `/glossary`: 138 bilingual definitions in eight topic groups, related-term links, A–Z anchor index and individual source links. Its source dictionary is separate from the main-guide bibliography.

Source metadata lives in `app/sources.ts`. Inline source numbers open original papers or publisher/research pages. Relationship diagrams and teaching examples are original summaries, not paper figures or measurements. The detailed Hsu workflow is attributed to the author's own notes; its bibliography was verified, but the full text was not reverified.

## Run

`npm install`, then `npm run dev`. Production build: `npm run build`.

Navigation: a "Learning path" menu (chapters 01–05) and a "Worked example" menu (case lab, model walkthrough); every page has a footer with credits, copyright and the analytics note.

The site uses Vercel Web Analytics (`@vercel/analytics`, mounted once in `app/layout.tsx`) for page-view statistics. No custom events are sent. The script is served by Vercel only, so it returns 404 on local runs. No third-party font request is implemented.

Run `node scripts/check-content.mjs` for source-level regression checks.

## Validation

Last verified 2026-10-26: `npx tsc --noEmit`, `npm run build` and `node scripts/check-content.mjs` pass. The script covers glossary references, related anchors, bilingual entries, all ten steps, legacy anchors, the five-chapter count and chapter/heading numbering, and the hash-link opener.

In a browser, header links, in-page links and full-page loads with a hash open the collapsed chapter that holds the target (including nested targets such as `#sources`) and scroll to it. At 375 px width the deployed page had no horizontal overflow. Other browsers, keyboard-only use and reduced-motion behaviour were not tested.

`npx oxlint app` could not be run: `.oxlintrc.json` names a `react-compiler` rule that the current oxlint release does not provide, so earlier lint results are unverified.

Deployed on Vercel at https://xai-fieldnotes.vercel.app. `.openai/hosting.json` is left over from the earlier owner-private hosting.
