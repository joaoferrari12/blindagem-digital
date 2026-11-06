/** Tiny HTML helpers: escape everything by default, opt in to raw markup with `raw()`. */

export class Raw {
  constructor(public readonly value: string) {}
}

export function raw(value: string): Raw {
  return new Raw(value);
}

export function esc(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type Part = string | number | boolean | null | undefined | Raw | Part[];

function render(part: Part): string {
  if (part === null || part === undefined || part === false || part === true) return '';
  if (part instanceof Raw) return part.value;
  if (Array.isArray(part)) return part.map(render).join('');
  return esc(part);
}

/** Tagged template: interpolations are escaped unless wrapped in raw() or produced by html`` itself. */
export function html(strings: TemplateStringsArray, ...parts: Part[]): Raw {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < parts.length) out += render(parts[i]);
  });
  return new Raw(out);
}

export function mount(root: HTMLElement, content: Raw): void {
  root.innerHTML = content.value;
}

export function icon(name: 'shield' | 'lock' | 'phone' | 'alert' | 'eye' | 'eyeOff' | 'arrowRight' | 'arrowLeft' | 'check' | 'print' | 'download', size = 24): Raw {
  const paths: Record<string, string> = {
    shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    lock: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9L2.5 17.3A2 2 0 004.2 20h15.6a2 2 0 001.7-2.7L13.7 3.9a2 2 0 00-3.4 0z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>',
    arrowRight: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  };
  return raw(
    `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`,
  );
}
