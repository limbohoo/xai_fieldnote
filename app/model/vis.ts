/* A plain description of what a second- or third-level part should show; obj3d.ts turns it into a 3D object. */
export type Vis =
  | { t: 'frame'; aspect: number; box: [number, number, number, number] | null; note?: string; none?: string }
  | { t: 'grid'; n: number; vals: number[]; marks?: { x: number; y: number; shape: 'x' | 'sq' | 'circ'; color: string }[]; caption?: string }
  | { t: 'bars'; items: { label: string; v: number; color?: string; hi?: boolean; note?: string }[]; lo?: number; hi?: number; lines?: { v: number; label: string; color?: string }[]; caption?: string }
  | { t: 'eq'; lines: { text: string; color?: string; size?: number }[] }
  | { t: 'series'; a: (number | null)[]; b?: (number | null)[]; mark?: number; band?: [number, number]; shade?: [number, number]; lines?: { v: number; label: string; color?: string }[]; caption?: string; la?: string; lb?: string }
  | { t: 'strip'; rows: { label: string; cells: string[] }[]; caption?: string }
  | { t: 'table'; head: string[]; rows: { label: string; cells: string[]; hi?: boolean }[]; hiCol?: number; caption?: string }
  | { t: 'checks'; items: { text: string; ok: boolean | null }[]; caption?: string }
  | { t: 'chain'; items: { label: string; state: 'on' | 'off' | 'dim' }[]; caption?: string }
  | { t: 'crowd'; groups: { label: string; color: string; total: number; keep: number }[]; caption?: string }
  | { t: 'points'; pts: { x: number; y: number; color: string; r?: number }[]; segs?: { a: [number, number]; b: [number, number]; color: string; dash?: boolean }[]; caption?: string };

