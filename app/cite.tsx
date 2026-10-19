import { sources } from './sources';

/* Numbered source links, shared by the case lab (the field guide keeps its own copy). */
export function Cite({ ids }: { ids: number[] }) {
  return (
    <span className="cites">
      {ids.map((id) => (
        <a
          key={id}
          href={sources[id - 1].url}
          target="_blank"
          rel="noreferrer"
          title={`${sources[id - 1].author} · ${sources[id - 1].title}`}
        >
          [{String(id).padStart(2, '0')}] ↗
        </a>
      ))}
    </span>
  );
}
