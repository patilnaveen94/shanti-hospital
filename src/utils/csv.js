/**
 * CSV export.
 *
 * Hand-rolled rather than pulling in a library: the whole job is quoting, and a
 * dependency for this would be more surface area than it saves.
 */

/**
 * Escape one cell.
 *
 * The leading-character guard matters: a value starting with = + - @ is treated
 * as a formula by Excel and Google Sheets. A patient's "note" field could
 * otherwise execute on the front desk's machine when they open the sheet. We
 * prefix a single quote to neutralise it.
 */
function cell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Build a CSV string.
 * @param {Array<{key: string, label: string, format?: Function}>} columns
 * @param {Array<object>} rows
 */
export function toCsv(columns, rows) {
  const header = columns.map((c) => cell(c.label)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => cell(c.format ? c.format(row) : row[c.key])).join(',')
  );
  // CRLF: Excel on Windows is the primary consumer here.
  return [header, ...body].join('\r\n');
}

/**
 * Trigger a browser download.
 * A BOM is prepended so Excel reads UTF-8 correctly — without it, Indian names
 * with diacritics and the ₹ symbol render as mojibake.
 */
export function downloadCsv(filename, csv) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `Dr. R T Patil` + `2026-10-04` → `shanti-dr-r-t-patil-2026-10-04.csv` */
export function csvFilename(parts) {
  const slug = parts
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug}.csv`;
}
