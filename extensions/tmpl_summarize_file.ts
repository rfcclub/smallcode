// SmallCode Extension Point: summarize_file
// Generates a compact signature-level summary of a large file
// Used by the context budget engine to reduce token usage

export default function tmpl_summarize_file(path: string, content: string, target_tokens: number): string {
  return `Summarize this code file into ${target_tokens} tokens or less.
Include: imports, exported symbols (functions/classes/types with signatures), key constants.
Exclude: function bodies, comments, blank lines.

File: ${path}

\`\`\`
${content}
\`\`\`

Summary (signatures only):`;
}
