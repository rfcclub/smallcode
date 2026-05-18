// SmallCode Extension Point: coding_agent
// Main agent prompt — kept minimal for small context windows
// The tool schemas are injected only for the relevant category (2-stage routing)

export default function tmpl_coding_agent(task: string, context: string, tool_schemas: string, complexity: number): string {
  const systemSection = `You are SmallCode, a coding assistant. Use tools to interact with the codebase.

Rules:
- Read files before editing them.
- Use "patch" for edits (search and replace). Never rewrite entire files.
- Keep responses concise.
- If a task has multiple steps, use the memory tool to track progress.`;

  const contextSection = context ? `\nContext:\n${context}` : "";

  const toolSection = tool_schemas ? `\nAvailable tools:\n${tool_schemas}` : "";

  return `${systemSection}${contextSection}${toolSection}

User: ${task}

Respond with tool calls or a direct answer.`;
}
