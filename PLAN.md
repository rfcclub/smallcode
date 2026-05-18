# SmallCode — Plan

An open-source terminal-native AI coding agent optimized for small LLMs (≤20B parameters).
Built as a **MarrowScript system** with the cognition layer — compiling to a complete
deterministic agent runtime with bounded LLM orchestration.

## Build

```bash
# Compile the MarrowScript system declaration → full agent runtime
marrowc compile smallcode.marrow

# Install dependencies
cd output && npm install

# Index your project (builds the semantic graph for retrieval)
npx ts-node bin/index_sources.ts .

# Run the agent
npm run dev
```

## Dual Architecture

SmallCode has two layers:

1. **`smallcode.marrow`** — The system declaration. Defines models, routers,
   prompts, cognition primitives, flows, evaluations, policies, and budgets.
   MarrowScript compiles this to a complete runtime with providers, traces,
   validation, repair, and deterministic routing.

2. **`src/`** — The Marrowscript imperative layer. TUI, tool implementations,
   context budget engine, and glue code that wires the compiled cognition
   runtime to the terminal interface.

The MarrowScript cognition layer gives us for FREE:
- Deterministic tier-based routing (same task complexity → same model)
- Typed prompts with validation, retry, repair, and caching
- Bounded tool calls (max 5 per prompt invocation)
- Cost budgets (per-user token caps, per-feature call caps)
- Full tracing (every LLM call → cognition_traces)
- Replay-as-test (recorded traces → regression tests)
- Prompt evaluations (CI-friendly regression testing)
- Context compression via summarizer prompts
- Semantic slice retrieval (graph-based, bounded by hop_depth + max_files)
- Self-critique and repair primitives
- Task decomposition into a closed kind list
- Flow checkpoints for human-in-the-loop approval

## Vision

OpenCode assumes frontier models with 128k+ context and near-perfect tool calling.
SmallCode is designed from the ground up to extract useful coding work from 7B-20B models
running locally via Ollama, llama.cpp, or any OpenAI-compatible endpoint.

Every architectural decision optimizes for:
- Small context windows (4k-32k tokens)
- Unreliable structured output / tool calling
- Limited multi-step reasoning depth
- Local-first, privacy-first operation

---

## Architecture

```
┌──────────────────────────────────────────┐
│            TUI (Terminal UI)              │
│  Minimal chrome, diff viewer, approval   │
├──────────────────────────────────────────┤
│         Session Manager                  │
│  Conversation history, compaction        │
├──────────────────────────────────────────┤
│       Context Budget Engine              │
│  Token tracking, eviction, summarization │
├──────────────────────────────────────────┤
│       Task Planner                       │
│  TODO-file driven, single-step exec      │
├──────────────────────────────────────────┤
│       Tool Router (2-stage)              │
│  Category → specific tool, validation    │
├──────────────────────────────────────────┤
│       Model Adapter Layer                │
│  Profiles, templates, format detection   │
├──────────────────────────────────────────┤
│       Provider Interface                 │
│  Ollama, llama.cpp, OpenAI-compat,       │
│  Anthropic, Google, Azure                │
├──────────────────────────────────────────┤
│       Code Intelligence                  │
│  Graph index, symbol search, LSP         │
└──────────────────────────────────────────┘
```

---

## Modules

### 1. Core Runtime (`src/core/`)

| File | Purpose |
|------|---------|
| `main.ms` | Entry point, CLI arg parsing, session bootstrap |
| `config.ms` | Config loading (project-level + user-level) |
| `session.ms` | Session lifecycle, message history, persistence |
| `event_bus.ms` | Event system for hooks/plugins |

### 2. Context Budget Engine (`src/context/`)

The most critical differentiator. Manages what the model sees.

| File | Purpose |
|------|---------|
| `budget.ms` | Token counting, budget allocation per category |
| `compactor.ms` | Message history compaction (summarize old turns) |
| `file_cache.ms` | File content cache with signature-level summaries |
| `working_memory.ms` | Persistent scratchpad the model reads/writes |

**Key behaviors:**
- Never exceed 70% of model's context with tool results
- Auto-summarize file contents to function signatures when budget is tight
- Maintain a "working memory" scratchpad (max 500 tokens) that persists across turns
- Eviction priority: old tool results → old assistant messages → system prompt sections

### 3. Task Planner (`src/planner/`)

| File | Purpose |
|------|---------|
| `planner.ms` | Decomposes user requests into atomic steps |
| `todo.ms` | Manages TODO.md task file (read/write/check) |
| `validator.ms` | Post-step validation (lint, compile, test) |

**Key behaviors:**
- On complex requests, generate a TODO.md with numbered atomic steps
- Feed the model one step at a time with relevant context
- After each step: validate → checkpoint → next step
- If validation fails: revert, inject error context, retry (max 2 retries per step)

### 4. Tool System (`src/tools/`)

| File | Purpose |
|------|---------|
| `router.ms` | 2-stage tool selection (category → tool) |
| `registry.ms` | Tool registration, schema management |
| `validator.ms` | Tool call parsing, validation, auto-repair |
| `executor.ms` | Tool execution with timeout and output truncation |

**Built-in tools:**

| Tool | Description |
|------|-------------|
| `read_file` | Read file with line ranges (default: signatures only for large files) |
| `write_file` | Create/overwrite a file |
| `patch` | Search-and-replace edit (primary edit primitive) |
| `bash` | Execute shell command with timeout |
| `search` | Ripgrep-powered code search (max 10 results) |
| `find_files` | Glob-based file discovery |
| `symbols` | Code graph symbol lookup |
| `memory` | Read/write working memory scratchpad |
| `plan` | Read/update TODO task list |
| `web_search` | Internet search (optional) |
| `web_fetch` | Fetch URL content (optional) |

**2-stage routing:**
```
User message → Model picks CATEGORY (read/write/search/run/plan)
            → System injects only that category's tool schemas
            → Model makes specific tool call
```

This halves the schema context overhead vs presenting all tools at once.

**Validation & repair:**
- Parse tool calls with fallback: JSON → YAML → regex extraction → natural language parse
- On malformed call: show the model a 1-line error + correct schema, retry once
- On repeated failure: fall back to asking the model in plain text, parse the answer

### 5. Model Adapter (`src/model/`)

| File | Purpose |
|------|---------|
| `adapter.ms` | Abstract model interface |
| `profiles.ms` | Model capability profiles (context size, tool format, etc.) |
| `templates.ms` | Chat templates (ChatML, Llama3, Mistral, Gemma, etc.) |
| `streaming.ms` | Streaming response handler with early-stop detection |
| `providers/ollama.ms` | Ollama provider |
| `providers/openai.ms` | OpenAI-compatible provider |
| `providers/anthropic.ms` | Anthropic provider |
| `providers/llamacpp.ms` | llama.cpp server provider |

**Model profiles** define per-model capabilities:
```
{
  name: "qwen2.5-coder-14b",
  context_length: 32768,
  supports_tool_calling: true,
  tool_format: "hermes",        // or "json", "xml", "native"
  supports_json_mode: true,
  max_output_tokens: 8192,
  strengths: ["code_completion", "refactoring"],
  weaknesses: ["long_planning", "multi_file"]
}
```

**Early-stop detection:**
- Detect repetition loops (same 50-char sequence 3x)
- Detect off-topic drift (response diverges from last tool result)
- Hard cap output at model's max_output_tokens

### 6. Code Intelligence (`src/intel/`)

| File | Purpose |
|------|---------|
| `indexer.ms` | Tree-sitter based code indexer |
| `graph.ms` | Symbol graph (imports, calls, inheritance) |
| `search.ms` | Fuzzy symbol search |
| `summarizer.ms` | File → signature summary generator |

Integrates with the code-graph-mcp approach but embedded directly for speed.

### 7. TUI (`src/tui/`)

| File | Purpose |
|------|---------|
| `app.ms` | Terminal UI application shell |
| `input.ms` | User input handling, keybindings |
| `output.ms` | Streaming model output display |
| `diff_view.ms` | Side-by-side diff for proposed edits |
| `status.ms` | Status bar (model, tokens used, current step) |

**Key UX decisions:**
- Single-key approve/reject for edits (`y`/`n`)
- Show token budget usage in status bar
- Compact diff view (unified by default, side-by-side on request)
- Model "thinking" indicator with cancel support

### 8. Hooks & Plugins (`src/hooks/`)

| File | Purpose |
|------|---------|
| `loader.ms` | Load hook definitions from config |
| `runner.ms` | Execute hooks on events |
| `builtin.ms` | Built-in hooks (auto-lint, auto-format) |

Events: `pre_tool`, `post_tool`, `pre_edit`, `post_edit`, `session_start`, `session_end`, `step_complete`

---

## Config Format

`smallcode.toml` in project root:

```toml
[model]
provider = "ollama"
name = "qwen2.5-coder-14b"
# Override auto-detected values:
# context_length = 32768
# tool_format = "hermes"

[context]
max_budget_pct = 70          # % of context for tool results + file content
working_memory_tokens = 500  # persistent scratchpad size
summary_threshold = 200      # lines above which files get summarized

[tools]
enabled = ["read_file", "write_file", "patch", "bash", "search", "find_files", "symbols", "memory", "plan"]
# disabled = ["web_search", "web_fetch"]
bash_timeout = 30            # seconds

[planner]
auto_plan = true             # auto-decompose complex requests
max_retries = 2              # retries per step on validation failure
validate_after_edit = true   # run linter/compiler after each edit

[hooks]
pre_edit = "lint"            # run linter before applying edits
post_edit = "typecheck"      # run type checker after edits

[tui]
theme = "dark"
show_token_usage = true
auto_approve = false         # require manual approval for edits
```

---

## Implementation Phases

### Phase 1: Foundation (MVP) ✅
- [x] Project scaffolding, config loading
- [x] Model adapter with Ollama provider
- [x] Basic tool system (read, write, patch, bash, search)
- [x] Simple context budget (token counting, truncation)
- [x] Minimal TUI (input/output, no diff view yet)
- [x] Single-turn interaction loop

### Phase 2: Intelligence ✅
- [x] 2-stage tool routing
- [x] Tool call validation and auto-repair
- [x] Model profiles with auto-detection
- [x] Context compaction (message summarization)
- [x] Working memory scratchpad
- [x] File signature summarization

### Phase 3: Planning ✅
- [x] Task decomposition engine
- [x] TODO file management
- [x] Post-step validation (lint/compile/test)
- [x] Checkpoint and rollback
- [x] Multi-step execution loop

### Phase 4: Polish ✅
- [x] Full TUI with diff viewer
- [x] Code graph integration (regex-based indexing)
- [x] Hook/plugin system
- [x] Additional providers (Anthropic, OpenAI, llama.cpp)
- [x] Chat template auto-detection
- [ ] Session persistence and resume

### Phase 5: Advanced
- [ ] MCP server support (as client)
- [ ] Multi-file refactoring coordination
- [ ] RAG over codebase (embedding-free, graph-based)
- [ ] Agent-to-agent delegation for complex tasks
- [ ] IDE extension (VS Code / Kiro)

---

## Key Design Decisions

1. **Patch over rewrite** — Small models can't reproduce full files reliably. Search-and-replace is the primary edit primitive.

2. **2-stage tool routing** — Halves schema context overhead. The model picks a category first, then sees only relevant tool schemas.

3. **Aggressive context management** — The budget engine is the heart of the system. It ensures small models never drown in irrelevant context.

4. **TODO-driven planning** — Externalizes the model's working memory to a file it reads each turn. Compensates for limited reasoning depth.

5. **Forgiving input parsing** — Accept JSON, YAML, or natural language tool calls. Small models often produce semi-structured output; we parse what we can.

6. **Validate-then-proceed** — Every edit is validated (lint/compile) before the model moves on. Catches errors early when the model can still reason about them.

7. **Model profiles** — No one-size-fits-all prompting. Each model gets its optimal template, tool format, and context budget.

---

## Competitive Advantages Over OpenCode

| Aspect | OpenCode | SmallCode |
|--------|----------|-----------|
| Target models | Frontier (Claude, GPT-4, etc.) | 7B-20B local models |
| Context strategy | Dump everything | Budget-managed, summarized |
| Tool calling | Assumes reliable JSON | Forgiving multi-format parser |
| Planning | Single-shot | TODO-file decomposed steps |
| Edit primitive | Full file write | Search-and-replace patch |
| Model support | 75+ providers | Fewer providers, deeper optimization |
| Privacy | No code stored | Fully local, no network needed |
| Resource usage | Cloud API calls | Runs on consumer hardware |

---

## File Structure

```
smallcode/
├── PLAN.md                 # This file
├── smallcode.toml          # Default config
├── src/
│   ├── core/
│   │   ├── main.ms
│   │   ├── config.ms
│   │   ├── session.ms
│   │   └── event_bus.ms
│   ├── context/
│   │   ├── budget.ms
│   │   ├── compactor.ms
│   │   ├── file_cache.ms
│   │   └── working_memory.ms
│   ├── planner/
│   │   ├── planner.ms
│   │   ├── todo.ms
│   │   └── validator.ms
│   ├── tools/
│   │   ├── router.ms
│   │   ├── registry.ms
│   │   ├── validator.ms
│   │   ├── executor.ms
│   │   └── builtin/
│   │       ├── read_file.ms
│   │       ├── write_file.ms
│   │       ├── patch.ms
│   │       ├── bash.ms
│   │       ├── search.ms
│   │       ├── find_files.ms
│   │       ├── symbols.ms
│   │       ├── memory.ms
│   │       ├── plan.ms
│   │       ├── web_search.ms
│   │       └── web_fetch.ms
│   ├── model/
│   │   ├── adapter.ms
│   │   ├── profiles.ms
│   │   ├── templates.ms
│   │   ├── streaming.ms
│   │   └── providers/
│   │       ├── ollama.ms
│   │       ├── openai.ms
│   │       ├── anthropic.ms
│   │       └── llamacpp.ms
│   ├── intel/
│   │   ├── indexer.ms
│   │   ├── graph.ms
│   │   ├── search.ms
│   │   └── summarizer.ms
│   ├── tui/
│   │   ├── app.ms
│   │   ├── input.ms
│   │   ├── output.ms
│   │   ├── diff_view.ms
│   │   └── status.ms
│   └── hooks/
│       ├── loader.ms
│       ├── runner.ms
│       └── builtin.ms
└── profiles/
    ├── qwen2.5-coder-7b.toml
    ├── qwen2.5-coder-14b.toml
    ├── deepseek-coder-v2-lite.toml
    ├── codellama-13b.toml
    ├── starcoder2-15b.toml
    └── mistral-nemo-12b.toml
```
