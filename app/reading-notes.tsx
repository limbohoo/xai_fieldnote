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
import { useT } from './i18n';

const prompts: [string, string, string][] = [
  ['scene', '真实场景', 'Situated task'],
  ['question', '解释问题', 'Explanation need'],
  ['evidence', '证据与边界', 'Evidence & limits'],
  ['expression', '具身表达', 'Embodied expression'],
  ['agency', '纠正与退出', 'Agency'],
  ['evaluation', '验证计划', 'Evaluation'],
];

/* Status messages are keys, translated where they are shown, so switching language updates them. */
type Status = 'local' | 'saved' | 'unavailable' | 'fillUnavailable';
const STATUS_TEXT: Record<Status, [string, string]> = {
  local: ['笔记仅保存在当前浏览器；可随时导出。', 'Notes are kept only in this browser; you can export them any time.'],
  saved: ['已保存到当前浏览器 · 不跨设备同步', 'Saved in this browser · not synced across devices'],
  unavailable: ['本地保存不可用，请导出笔记备份。', 'Local saving is unavailable; please export a backup.'],
  fillUnavailable: ['本地保存不可用，填写后可导出备份。', 'Local saving is unavailable; you can export a backup after writing.'],
};

const STORAGE = 'xai-fieldnotes-reflections-v1';
const Notes = createContext<{
  notes: Record<string, string>;
  ready: boolean;
  status: Status;
  update: (key: string, value: string) => void;
  download: () => void;
} | null>(null);

export function ReadingNotes({ children }: { children: ReactNode }) {
  const t = useT();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>('local');
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
      setStatus('fillUnavailable');
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
            title: 'Read the XAI reading notes',
            description: 'Read the six reading notes. Does not modify them.',
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
                notes: prompts.map(([key, zh, en]) => ({
                  title: en + ' / ' + zh,
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
      setStatus('saved');
    } catch {
      setStatus('unavailable');
    }
  }

  function download() {
    const text =
      t('# XAI Fieldnotes · 随读札记', '# XAI Fieldnotes · Reading notes') + '\n\n' +
      prompts
        .map(
          ([key, zh, en]) =>
            '## ' + t(zh, en) + '\n\n' + (notes[key] || t('（留待下次阅读）', '(to be continued next time)')),
        )
        .join('\n\n') +
      '\n\nhttps://xai-fieldnotes.vercel.app\n';
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = t('XAI-随读札记.md', 'XAI-reading-notes.md');
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
  const t = useT();
  const ctx = useContext(Notes);
  if (!ctx) return null;
  const prompt = prompts.find(([key]) => key === name);
  return (
    <aside className="margin-note">
      <span className="note-kicker">{t('读到这里 / A THOUGHT TO KEEP', 'Reading this far / A THOUGHT TO KEEP')}</span>
      <p>{children}</p>
      <details>
        <summary>
          {ctx.notes[name] ? t('继续这条札记', 'Continue this note') : t('顺手记一句', 'Jot down a line')} <span>＋</span>
        </summary>
        <label className="sr-only" htmlFor={'note-' + name}>
          {prompt ? t(prompt[1], prompt[2]) : ''}
        </label>
        <Textarea
          id={'note-' + name}
          disabled={!ctx.ready}
          value={ctx.notes[name] || ''}
          onChange={(e) => ctx.update(name, e.target.value)}
          placeholder={t('一个例子、一个疑问，或一个尚未成形的想法……', 'An example, a question, or an idea not yet formed…')}
          className="note-input"
        />
        <output className="note-status">{t(STATUS_TEXT[ctx.status][0], STATUS_TEXT[ctx.status][1])}</output>
      </details>
    </aside>
  );
}

export function NotesExport() {
  const t = useT();
  const ctx = useContext(Notes);
  if (!ctx) return null;
  return (
    <div className="notes-footer">
      <div>
        <strong>{t('把沿途的想法带走。', 'Take the ideas along the way with you.')}</strong>
        <p>
          {t(
            `${Object.values(ctx.notes).filter(Boolean).length} / 6 处札记已填写 · 旧版笔记会继续保留。`,
            `${Object.values(ctx.notes).filter(Boolean).length} / 6 notes written · earlier notes are kept.`,
          )}
        </p>
        <output>{t(STATUS_TEXT[ctx.status][0], STATUS_TEXT[ctx.status][1])}</output>
      </div>
      <button className="outline-button" onClick={ctx.download} disabled={!ctx.ready}>
        {t('导出随读札记 ↓', 'Export reading notes ↓')}
      </button>
    </div>
  );
}
