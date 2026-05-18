// SmallCode Extension Point: compress_conversation
// Summarizes older conversation turns to free context space
// Critical for small models — must produce compact output

export default function tmpl_compress(history: string, max_tokens: number): string {
  return `Summarize this conversation history into ${max_tokens} tokens or less.
Keep: key decisions made, files edited, errors encountered, current goal.
Drop: full file contents, verbose tool outputs, redundant messages.

Format as a compact bullet list:
- [action] what happened
- [decision] what was decided
- [error] what failed (if any)
- [goal] current objective

History:
${history}

Summary:`;
}
