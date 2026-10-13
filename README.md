# XAI Fieldnotes

A Chinese/English learning guide with a single-page reading route and a separate glossary for industrial product designers and HCI researchers.

## Content

- Three-level research map and six taxonomy dimensions.
- Six method panels (interpretable models, TreeInterpreter, SHAP / TreeSHAP, LIME, Grad-CAM, counterfactual), a TreeInterpreter / TreeSHAP / LIME comparison table, and a visual atlas of LIME, TreeInterpreter and SHAP.
- Four detailed paper cases plus two additional reading entries, with evidence separated from design propositions.
- The original ten-step learning workflow, with explanatory expansions, SHAP + LLM notes and evaluation guidance.
- Five collapsible chapters: field and questions; methods and paper cases; visual method atlas; ten-step workflow and evaluation; further reading (frontiers, reading route and bibliography). In-page links open the chapter that holds their target.
- Four frontier entry points, six inline reading-note fields, a four-round reading route and 27 linked main-guide sources.
- `/glossary`: 138 bilingual definitions in eight topic groups, related-term links, A–Z anchor index and individual source links. Its source dictionary is separate from the main-guide bibliography.

Source metadata lives in `app/sources.ts`. Inline source numbers open original papers or publisher/research pages. The author's original two-page workflow notes are included as `/xai-learning-workflow-reference.pdf`. Relationship diagrams and teaching examples are original summaries, not paper figures or measurements. The grasp-failure paper and education review have explicit abstract-only access notes. The detailed Hsu workflow is attributed to the author's own notes; its bibliography was verified, but the full text was not reverified.

## Run

`npm install`, then `npm run dev`. Production build: `npm run build`.

Reflection notes are stored only in browser localStorage under `xai-fieldnotes-reflections-v1`. Export creates a Markdown download. Storage is origin-specific; local preview notes do not migrate automatically to the hosted origin (https://xai-fieldnotes.vercel.app). Notes are never uploaded.

The site uses Vercel Web Analytics (`@vercel/analytics`, mounted once in `app/layout.tsx`) for page-view statistics. No custom events are sent and the reflection notes are never passed to it. The script is served by Vercel only, so it returns 404 on local runs. No third-party font request is implemented.

The reading revision preserves the same storage key and all six legacy field keys, so notes from the previous hosted edition remain available in the inline prompts. Run `node scripts/check-content.mjs` for source-level regression checks.

## Validation

Last verified 2026-10-13: `npx tsc --noEmit` and `npm run build` pass, and `node scripts/check-content.mjs` passes. The script covers glossary references, related anchors, bilingual entries, all ten original steps, legacy anchors, note-key preservation, the five-chapter count and chapter/heading numbering, and the hash-link opener. The local guide, glossary and PDF routes responded HTTP 200.

In a browser, header links, in-page links and full-page loads with a hash open the collapsed chapter that holds the target (including nested targets such as `#sources`) and scroll to it. At 375 px width the deployed page had no horizontal overflow. Other browsers, keyboard-only use and reduced-motion behaviour were not tested.

`npx oxlint app` could not be run: `.oxlintrc.json` names a `react-compiler` rule that the current oxlint release does not provide, so earlier lint results are unverified. The optional proposed WebMCP read-only `read_xai_reflections` tool uses the visible note state and validates its empty input schema; no supported WebMCP validation context was available, so runtime registration is unverified.

Deployed on Vercel at https://xai-fieldnotes.vercel.app. `.openai/hosting.json` is left over from the earlier owner-private hosting.
