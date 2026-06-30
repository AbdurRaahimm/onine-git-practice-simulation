export function generateHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function shortHash(hash: string): string {
  return hash.substring(0, 7);
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')} ${d.getFullYear()} +0000`;
}

export function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = true;
      quoteChar = char;
    } else if (char === ' ') {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    args.push(current);
  }
  
  return args;
}

export function diffStrings(a: string, b: string): string[] {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const result: string[] = [];
  
  const maxLen = Math.max(linesA.length, linesB.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (i >= linesA.length) {
      result.push(`+${linesB[i]}`);
    } else if (i >= linesB.length) {
      result.push(`-${linesA[i]}`);
    } else if (linesA[i] !== linesB[i]) {
      result.push(`-${linesA[i]}`);
      result.push(`+${linesB[i]}`);
    } else {
      result.push(` ${linesA[i]}`);
    }
  }
  
  return result;
}
