import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sourcesModule = ts.transpile(read('app/sources.ts'), { module: ts.ModuleKind.ESNext });
const { sources } = await import('data:text/javascript;base64,' + Buffer.from(sourcesModule).toString('base64'));
assert.equal(sources.length, 27);
sources.forEach((source, i) => { assert.equal(source.id, i + 1); assert.equal(new URL(source.url).protocol, 'https:'); });
const content = read('app/learning-content.tsx');
const file = ts.createSourceFile('content.tsx', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = file.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]);
const methods = declarations.find(d => d.name.getText(file) === 'methods').initializer;
assert.equal(methods.elements.length, 8);
const steps = declarations.find(d => d.name.getText(file) === 'steps').initializer.expression;
const titles = steps.elements.map(row => row.elements[0].text);
assert.deepEqual(titles, ['定义应用场景','识别目标用户','发现解释需求','定义解释对象','判断数据与模型类型','选择 XAI 方法','生成解释数据','转译成人能理解的表达','技术验证','用户验证与迭代']);
const validIds = new Set(sources.map(s => s.id));
function visit(node) {
  if (ts.isJsxAttribute(node) && node.name.getText(file) === 'ids' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isArrayLiteralExpression(node.initializer.expression)) {
    node.initializer.expression.elements.filter(ts.isNumericLiteral).forEach(n => assert(validIds.has(Number(n.text)), 'Unknown reference ' + n.text));
  }
  ts.forEachChild(node, visit);
}
visit(file);
for (const id of ['scene','question','evidence','expression','agency','evaluation']) assert.equal((content.match(new RegExp('name="' + id + '"', 'g')) || []).length, 1);
assert(read('app/reading-notes.tsx').includes('xai-fieldnotes-reflections-v1'));
assert.equal(readFileSync(new URL('../public/xai-learning-workflow-reference.pdf', import.meta.url)).subarray(0,5).toString(), '%PDF-');
assert(content.includes('/xai-learning-workflow-reference.pdf'));
console.log('Content checks passed: 27 sources, 8 methods, original 10 steps, 6 preserved inline-note keys, PDF asset and literal citations.');
