const text1 = `Tanggal
23 Mar 2026`;

function findLineValue(text, label) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(label);
    console.log('Iter', i, 'Line:', line, 'm:', m, 'test:', label.test(line));
    if (m && m[1]) return m[1].trim();
    if (label.test(line)) {
      const next = lines[i + 1]?.trim();
      if (next) return next;
    }
  }
  return '';
}

console.log(findLineValue(text1, /Tanggal\s*(?:[:\s]+)?(.*)/i));
