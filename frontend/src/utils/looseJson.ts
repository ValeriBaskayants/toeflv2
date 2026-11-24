function blankOutComments(source: string): string {
  const out: string[] = [];
  const n = source.length;
  let i = 0;
  let inString = false;

  while (i < n) {
    const ch = source[i]!;
    const next = source[i + 1];

    if (inString) {
      out.push(ch);
      if (ch === '\\' && next !== undefined) {
        out.push(next);
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out.push(ch);
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n' && source[i] !== '\r') {
        out.push(' ');
        i += 1;
      }
      continue;
    }

    if (ch === '/' && next === '*') {
      out.push(' ', ' ');
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        const c = source[i]!;
        out.push(c === '\n' || c === '\r' ? c : ' ');
        i += 1;
      }
      if (i < n) {
        out.push(' ', ' ');
        i += 2;
      }
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return out.join('');
}

function blankOutTrailingCommas(text: string): string {
  const chars = text.split('');
  let inString = false;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (inString) {
      if (ch === '\\') i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch !== ',') continue;

    let j = i + 1;
    while (j < chars.length && /\s/.test(chars[j]!)) j += 1;
    const next = chars[j];
    if (next === '}' || next === ']') chars[i] = ' ';
  }

  return chars.join('');
}

export function stripJsonComments(source: string): string {
  return blankOutTrailingCommas(blankOutComments(source));
}

function describeJsonError(err: unknown, text: string): string {
  const message = err instanceof Error ? err.message : 'Invalid JSON';
  if (/line \d+/i.test(message)) return message;

  const match = /position (\d+)/.exec(message);
  if (match === null) return message;

  const position = Number(match[1]);
  const before = text.slice(0, position);
  const line = before.split('\n').length;
  const column = position - before.lastIndexOf('\n');
  return `${message} (line ${line}, column ${column})`;
}

export function parseLooseJson(text: string): unknown {
  const cleaned = stripJsonComments(text);
  try {
    return JSON.parse(cleaned);
  } catch (err: unknown) {
    throw new Error(describeJsonError(err, cleaned));
  }
}