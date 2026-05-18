// SmallCode Extension Point: decompose_task
// Breaks complex tasks into atomic steps
// Each step must be one of the allowed_kinds — model cannot invent new ones

export default function tmpl_decompose(task_description: string, codebase_summary: string, complexity: number): string {
  return `Break this task into numbered atomic steps. Each step must be exactly ONE action.

Allowed step types:
- read_file: Read a specific file
- edit_file: Make a single edit to one file
- create_file: Create a new file
- run_command: Run one shell command
- search_code: Search for a pattern
- validate: Run linter/compiler to check for errors

Task: ${task_description}
${codebase_summary ? `\nCodebase context:\n${codebase_summary}` : ""}

Respond with a JSON array. Example:
[
  {"kind": "read_file", "description": "Read src/main.ms to understand structure"},
  {"kind": "edit_file", "description": "Add import for new module in src/main.ms"},
  {"kind": "create_file", "description": "Create src/utils/helper.ms with helper function"},
  {"kind": "validate", "description": "Run type checker to verify no errors"}
]

Steps:`;
}
