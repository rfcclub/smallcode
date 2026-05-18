// SmallCode Extension Point: classify_tool_category
// Classifies user intent into a tool category
// Optimized for tiny models (1.5B) — minimal prompt, constrained output

export default function tmpl_classify_category(user_message: string, context_summary: string): string {
  return `You are a classifier. Respond with EXACTLY ONE word from this list:
read, write, search, run, plan, web, respond

Rules:
- "read" = user wants to see file contents
- "write" = user wants to edit, fix, create, or modify code
- "search" = user wants to find files or code patterns
- "run" = user wants to execute a command, test, or build
- "plan" = complex multi-step task (implement feature, refactor multiple files)
- "web" = user needs internet information
- "respond" = user is asking a question that needs no tools

User message: ${user_message}

Category:`;
}
