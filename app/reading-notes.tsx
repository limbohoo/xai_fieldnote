'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Textarea } from '@/components/ui/textarea';
const prompts = [
  ['scene', '真实场景 / Situated task'],
  ['question', '解释问题 / Explanation need'],
  ['evidence', '证据与边界 / Evidence & limits'],
  ['expression', '具身表达 / Embodied expression'],
  ['agency', '纠正与退出 / Agency'],
  ['evaluation', '验证计划 / Evaluation'],
];
const STORAGE = 'xai-fieldnotes-reflections-v1';
const Notes = createContext<{
  notes: Record<string, string>;
  ready: boolean;
  status: string;
  update: (key: string, value: string) => void;
  download: () => void;
} | null>(null);
export function ReadingNotes({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('笔记仅保存在当前浏览器；可随时导出。');
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (saved && typeof saved === 'object' && !Array.isArray(saved))
          setNotes(
            Object.fromEntries(
              prompts.map(([key]) => [
                key,
                typeof (saved as Record<string, unknown>)[key] === 'string'
                  ? (saved as Record<string, string>)[key]
                  : '',
              ]),
            ),
          );
      }
    } catch {
      setStatus('本地保存不可用，填写后可导出备份。');
    }
    setReady(true);
  }, []);
  /* oxlint-enable react/react-compiler */
  useEffect(() => {
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!ctx) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        ctx.registerTool(
          {
            name: 'read_xai_reflections',
            title: '读取 XAI 学习笔记',
            description: '读取六个随读札记，不修改内容。',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object');
              return {
                notes: prompts.map(([key, title]) => ({
                  title,
                  text: notesRef.current[key] || '',
                })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional proposed API. */
    }
    return () => lifecycle.abort();
  }, []);
  function update(key: string, value: string) {
    const next = { ...notes, [key]: value };
    setNotes(next);
    notesRef.current = next;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
      setStatus('已保存到当前浏览器 · 不跨设备同步');
    } catch {
      setStatus('本地保存不可用，请导出笔记备份。');
    }
  }
  function download() {
    const text =
      '# XAI Fieldnotes · 随读札记\n\n' +
      prompts
        .map(
          ([key, title]) =>
            '## ' + title + '\n\n' + (notes[key] || '（留待下次阅读）'),
        )
        .join('\n\n') +
      '\n\nhttps://xai-fieldnotes-design.limboh.chatgpt.site\n';
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'XAI-随读札记.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Notes.Provider value={{ notes, ready, status, update, download }}>
      {children}
    </Notes.Provider>
  );
}
export function MarginNote({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const ctx = useContext(Notes);
  if (!ctx) return null;
  return (
    <aside className="margin-note">
      <span className="note-kicker">读到这里 / A THOUGHT TO KEEP</span>
      <p>{children}</p>
      <details>
        <summary>
          {ctx.notes[name] ? '继续这条札记' : '顺手记一句'} <span>＋</span>
        </summary>
        <label className="sr-only" htmlFor={'note-' + name}>
          {prompts.find(([key]) => key === name)?.[1]}
        </label>
        <Textarea
          id={'note-' + name}
          disabled={!ctx.ready}
          value={ctx.notes[name] || ''}
          onChange={(e) => ctx.update(name, e.target.value)}
          placeholder="一个例子、一个疑问，或一个尚未成形的想法……"
          className="note-input"
        />
        <output className="note-status">{ctx.status}</output>
      </details>
    </aside>
  );
}
export function NotesExport() {
  const ctx = useContext(Notes);
  if (!ctx) return null;
  return (
    <div className="notes-footer">
      <div>
        <strong>把沿途的想法带走。</strong>
        <p>
          {Object.values(ctx.notes).filter(Boolean).length} / 6 处札记已填写 ·
          旧版笔记会继续保留。
        </p>
        <output>{ctx.status}</output>
      </div>
      <button
        className="outline-button"
        onClick={ctx.download}
        disabled={!ctx.ready}
      >
        导出随读札记 ↓
      </button>
    </div>
  );
}
