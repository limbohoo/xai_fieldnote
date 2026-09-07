# XAI Fieldnotes

A single-page Chinese/English learning guide for industrial product designers and HCI researchers.

## Content

- Three-level research map and six taxonomy dimensions.
- Seven method panels with scope, limitations and design prompts.
- Four paper cases with evidence separated from design propositions.
- A five-stage composite workflow, situated design questions and evaluation guidance.
- Four frontier entry points, six reflection fields, and 21 linked references.

Source metadata lives in `app/sources.ts`. Inline source numbers open original papers or publisher/research pages. The supplied PDF was read locally, but is not included in deployment. Conceptual diagrams are original summaries, not paper figures or measurements. The grasp-failure paper and education review have explicit abstract-only access notes.

## Run

`npm install`, then `npm run dev`. Production build: `npm run build`.

Reflection notes are stored only in browser localStorage under `xai-fieldnotes-reflections-v1`. Export creates a Markdown download. Storage is origin-specific; local preview notes do not migrate automatically to the hosted origin. No note upload, analytics or third-party font request is implemented.

## Validation

Production build and TypeScript checks pass. Application-scoped lint (`npx oxlint app`) passes. Full starter lint reports pre-existing issues in unused vendored UI components; those components were preserved. Dependency installation reports upstream vulnerabilities in the generated dependency tree; no unrelated automatic upgrade was applied.

The local route responded HTTP 200. Responsive layouts, keyboard focus styling and reduced-motion rules are implemented; browser visual and interaction QA was not performed. The optional proposed WebMCP read-only `read_xai_reflections` tool uses the visible note state and validates its empty input schema. No supported WebMCP validation context was available, so runtime registration is unverified.

Sites deployment is owner-private. The hosting manifest retains the one registered site ID.
