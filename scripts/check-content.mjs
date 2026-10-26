import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = (path) =>
  readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sourcesModule = ts.transpile(read('app/sources.ts'), {
  module: ts.ModuleKind.ESNext,
});
const { sources } = await import(
  'data:text/javascript;base64,' + Buffer.from(sourcesModule).toString('base64')
);
assert.equal(sources.length, 32);
sources.forEach((source, i) => {
  assert.equal(source.id, i + 1);
  assert.equal(new URL(source.url).protocol, 'https:');
});
const content = read('app/learning-content.tsx');
const file = ts.createSourceFile(
  'content.tsx',
  content,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const dataModule = ts.transpile(read('app/learning-data.ts'), {
  module: ts.ModuleKind.ESNext,
});
const { METHODS, STEPS } = await import(
  'data:text/javascript;base64,' + Buffer.from(dataModule).toString('base64')
);
assert.equal(METHODS.length, 6);
const titles = STEPS.map((step) => step.title.zh);
assert.deepEqual(titles, [
  '定义应用场景',
  '识别目标用户',
  '发现解释需求',
  '定义解释对象',
  '判断数据与模型类型',
  '选择 XAI 方法',
  '生成解释数据',
  '转译成人能理解的表达',
  '技术验证',
  '用户验证与迭代',
]);
[...METHODS, ...STEPS].forEach((row) => {
  assert(row.title?.en || row.name?.en, 'Missing English text');
  row.refs.forEach((id) =>
    assert(id >= 1 && id <= sources.length, 'Unknown reference ' + id),
  );
});
const validIds = new Set(sources.map((s) => s.id));
function visit(node) {
  if (
    ts.isJsxAttribute(node) &&
    node.name.getText(file) === 'ids' &&
    node.initializer &&
    ts.isJsxExpression(node.initializer) &&
    node.initializer.expression &&
    ts.isArrayLiteralExpression(node.initializer.expression)
  ) {
    node.initializer.expression.elements
      .filter(ts.isNumericLiteral)
      .forEach((n) =>
        assert(validIds.has(Number(n.text)), 'Unknown reference ' + n.text),
      );
  }
  ts.forEachChild(node, visit);
}
visit(file);
for (const id of [
  'scene',
  'question',
  'evidence',
  'expression',
  'agency',
  'evaluation',
])
  assert.equal(
    (content.match(new RegExp('name="' + id + '"', 'g')) || []).length,
    1,
  );
assert(read('app/reading-notes.tsx').includes('xai-fieldnotes-reflections-v1'));
assert.equal(
  readFileSync(
    new URL('../public/xai-learning-workflow-reference.pdf', import.meta.url),
  )
    .subarray(0, 5)
    .toString(),
  '%PDF-',
);
assert(content.includes('/xai-learning-workflow-reference.pdf'));
console.log(
  'Content checks passed: ' +
    sources.length +
    ' sources, 6 methods, original 10 steps, 6 preserved inline-note keys, PDF asset and literal citations.',
);
const sourceUrl =
  'data:text/javascript;base64,' +
  Buffer.from(sourcesModule).toString('base64');
const glossaryModule = ts
  .transpile(read('app/glossary-data.ts'), { module: ts.ModuleKind.ESNext })
  .replace(/(['"])\.\/sources\1/g, JSON.stringify(sourceUrl));
const { allTerms, glossaryGroups, glossarySources } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(glossaryModule).toString('base64')
);
assert.equal(glossaryGroups.length, 8);
assert.equal(allTerms.length, 138);
const termIds = new Set(allTerms.map((term) => term.id));
assert.equal(termIds.size, allTerms.length, 'Duplicate glossary anchor');
allTerms.forEach((term) => {
  assert(term.definition.length > 10, term.id + ' needs a definition');
  assert(term.zh && term.en, term.id + ' needs bilingual labels');
  assert(glossarySources[term.source], term.id + ' has missing source');
  assert.equal(new URL(glossarySources[term.source].url).protocol, 'https:');
  term.related.forEach((id) =>
    assert(termIds.has(id), term.id + ' links to missing term ' + id),
  );
});
for (const path of ['app/field-guide.tsx', 'app/learning-content.tsx']) {
  for (const match of read(path).matchAll(/href="\/glossary#([^"]+)"/g))
    assert(termIds.has(match[1]), 'Missing linked term ' + match[1]);
}
for (const id of ['cases', 'studio', 'sources'])
  assert(content.includes('id="' + id + '"'), 'Legacy anchor missing ' + id);
console.log(
  'Glossary checks passed: 138 bilingual entries in 8 groups, ' +
    new Set(allTerms.map((t) => t.source)).size +
    ' definition sources, all related links valid; legacy anchors retained.',
);
let chapterCount = 0;
for (const path of [
  'app/field-guide.tsx',
  'app/learning-content.tsx',
  'app/method-atlas.tsx',
]) {
  const src = read(path);
  chapterCount += (src.match(/<Chapter\s/g) || []).length;
  // A chapter's own heading must carry the chapter's number.
  for (const m of src.matchAll(
    /<Chapter\b[^>]*\snumber="(\d+)"(?:(?!<Chapter\b)[\s\S])*?<Head\s+no="(\d+)"/g,
  ))
    assert.equal(m[2], m[1], 'Heading number differs from chapter ' + m[1]);
}
assert.equal(chapterCount, 5, 'The learning path has five chapters');
assert(
  read('app/field-guide.tsx').includes('<ChapterHashOpener />'),
  'Collapsed chapters must open when an in-page link targets them',
);
console.log(
  'Chapter checks passed: five chapters, heading numbers match, hash links open collapsed chapters.',
);
for (const path of [
  'app/site-header.tsx',
  'app/field-guide.tsx',
  'app/learning-content.tsx',
  'app/glossary/page.tsx',
]) {
  assert(
    !read(path).includes("from 'next/link'"),
    path + ' must use native navigation links',
  );
}
console.log(
  'Navigation checks passed: guide and glossary navigation uses native anchors.',
);
