// SmallCode Extension Point: repair_tool_call
// Fixes malformed tool calls from small models
// Gets the original bad call + error + correct schema, produces a fixed version

export default function tmpl_repair_tool(original_call: string, error: string, tool_schema: string): string {
  return `The following tool call failed. Fix it.

Error: ${error}

Original call:
${original_call}

Correct schema:
${tool_schema}

Respond with ONLY the corrected JSON tool call, nothing else:`;
}
