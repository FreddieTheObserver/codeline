export const LANGUAGES = [
  { id: "java", label: "Java" },
  { id: "python", label: "Python" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "javascript", label: "JavaScript" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export function languageLabel(id: string): string {
  return LANGUAGES.find((l) => l.id === id)?.label ?? id;
}

export type DraftRow = { pseudocode: string; code: string; indent: number; given: boolean };

const STRUCTURAL = /^[{}()[\];,]*$/;

export function looksStructural(code: string): boolean {
  return STRUCTURAL.test(code.trim());
}

// Splits pasted code into one row per non-blank line. Indentation becomes an
// indent level, so the Slot carries it and Snippets are dealt without it.
export function splitCode(source: string): DraftRow[] {
  const lines = source.replace(/\t/g, "    ").split(/\r?\n/).filter((l) => l.trim() !== "");
  const widths = lines.map((l) => l.length - l.trimStart().length);
  const unit = Math.min(...widths.filter((w) => w > 0), 4) || 4;
  return lines.map((line, i) => {
    const code = line.trim();
    return { pseudocode: "", code, indent: Math.round(widths[i] / unit), given: looksStructural(code) };
  });
}
