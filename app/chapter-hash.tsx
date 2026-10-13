'use client';
import { useEffect } from 'react';

/* Chapters are collapsed <details>. Open the chapter that holds a link target, then scroll to it. */
function reveal(hash: string, onLoad = false) {
  let id = '';
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return;
  }
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  let opened = false;
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (el instanceof HTMLDetailsElement && !el.open) {
      el.open = true;
      opened = true;
    }
  }
  // The browser's own fragment scroll does not land on a page that hydrates after load.
  if (opened || onLoad)
    target.scrollIntoView({ behavior: onLoad ? 'instant' : 'auto' });
}

export function ChapterHashOpener() {
  useEffect(() => {
    const onHashChange = () => reveal(location.hash);
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.(
        'a[href*="#"]',
      ) as HTMLAnchorElement | null;
      if (link && link.origin === location.origin && link.pathname === location.pathname)
        reveal(link.hash);
    };
    reveal(location.hash, true);
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('click', onClick);
    };
  }, []);
  return null;
}
