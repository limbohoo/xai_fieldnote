# XAI Fieldnotes

A single-page Chinese/English learning guide for industrial product designers and HCI researchers.

## Content

- Three-level research map and six taxonomy dimensions.
- Eight expanded method panels, including TreeInterpreter and a TreeInterpreter / TreeSHAP / LIME comparison.
- Four detailed paper cases plus two additional reading entries, with evidence separated from design propositions.
- The original ten-step learning workflow, with explanatory expansions, SHAP + LLM notes and evaluation guidance.
- Four frontier entry points, six inline reading-note fields, a four-round reading route and 27 linked sources.

Source metadata lives in `app/sources.ts`. Inline source numbers open original papers or publisher/research pages. The supplied two-page PDF is included at `/xai-learning-workflow-reference.pdf` on the owner-private site. Relationship diagrams and teaching examples are original summaries, not paper figures or measurements. The grasp-failure paper and education review have explicit abstract-only access notes. The detailed Hsu workflow is attributed to the supplied notes; its bibliography was verified, but the full text was not reverified.

## Run

`npm install`, then `npm run dev`. Production build: `npm run build`.

Reflection notes are stored only in browser localStorage under `xai-fieldnotes-reflections-v1`. Export creates a Markdown download. Storage is origin-specific; local preview notes do not migrate automatically to the hosted origin. No note upload, analytics or third-party font request is implemented.

The reading revision preserves the same storage key and all six legacy field keys, so notes from the previous hosted edition remain available in the inline prompts. Run `node scripts/check-content.mjs` for source-level regression checks.

## Validation

Production build and TypeScript checks pass. Application-scoped lint (`npx oxlint app`) passes. Full starter lint reports pre-existing issues in unused vendored UI components; those components were preserved. Dependency installation reports upstream vulnerabilities in the generated dependency tree; no unrelated automatic upgrade was applied.

The local route responded HTTP 200. Responsive layouts, keyboard focus styling and reduced-motion rules are implemented; browser visual and interaction QA was not performed. The optional proposed WebMCP read-only `read_xai_reflections` tool uses the visible note state and validates its empty input schema. No supported WebMCP validation context was available, so runtime registration is unverified.

Sites deployment is owner-private. The hosting manifest retains the one registered site ID.
