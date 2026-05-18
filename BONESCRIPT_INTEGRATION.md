# BoneScript Integration Plan

SmallCode should use BoneScript as the preferred way to create Node.js/TypeScript backends.
Instead of writing 5-10 files by hand (routes, models, auth, events, migrations, schemas),
the model writes ONE `.bone` file and compiles it to a complete project.

## Why

| Without BoneScript | With BoneScript |
|-------------------|-----------------|
| Model writes server.js, routes/, models/, auth.js, migrations/, schemas.ts, package.json... | Model writes ONE shop.bone file |
| 8-15 tool calls to create a backend | 1-2 tool calls (write + compile) |
| High failure rate on multi-file (45% in stress test) | Single file = single tool call = reliable |
| Model must know Express, Prisma, JWT, SQL, Zod, WebSocket patterns | Model learns ONE declarative syntax |
| Import errors, path issues, missing deps | Compiler handles all wiring deterministically |

## What BoneScript Generates From a Single `.bone` File

```
output/
├── src/index.ts          Express server, all routes
├── src/db.ts             Postgres connection pool
├── src/events.ts         Durable event bus
├── src/auth.ts           JWT middleware
├── src/schemas.ts        Zod validation
├── src/routes/           CRUD + capabilities per entity
├── src/state_machines/   State machine enforcement
├── migrations/           SQL schemas + indexes
├── sdk/client.ts         Typed TypeScript fetch client
├── admin/index.html      Self-contained admin panel
├── openapi.yaml          OpenAPI 3.0 spec
├── Dockerfile            Container config
├── docker-compose.yaml   Postgres + Redis
└── .github/workflows/    CI pipeline
```

## Integration Design

### 1. Ship BoneScript as a dependency

```json
// package.json
{
  "dependencies": {
    "bonescript-compiler": "file:../BoneScript/compiler"
  }
}
```

The compiler binary becomes available at `node_modules/bonescript-compiler/dist/cli.js`.

### 2. Add `bone_compile` tool

```js
{
  name: 'bone_compile',
  description: 'Compile a .bone file into a complete Node.js/TypeScript backend. Creates routes, models, auth, events, migrations, SDK, admin panel, Docker, and CI from a single declarative file.',
  parameters: {
    path: { type: 'string', description: 'Path to the .bone file' },
    target: { type: 'string', description: 'Target: express (default), nakama, prisma, sqlite' }
  }
}
```

Execution:
```js
case 'bone_compile': {
  const bonePath = path.resolve(cwd, args.path);
  const target = args.target || 'express';
  const compiler = path.resolve(__dirname, '..', 'node_modules', 'bonescript-compiler', 'dist', 'cli.js');
  const result = execSync(`node "${compiler}" compile "${bonePath}" --target ${target}`, { cwd, encoding: 'utf-8', timeout: 30000 });
  return { result: `Compiled ${args.path} → output/\n${result}`, action: 'Created', path: 'output/' };
}
```

### 3. Add `bone_check` tool

```js
{
  name: 'bone_check',
  description: 'Validate a .bone file without generating code. Reports type errors and constraint violations.',
  parameters: { path: { type: 'string' } }
}
```

This integrates with the improvement loop — if `bone_check` fails, the governor feeds errors back to the model for fixing.

### 4. Update system prompt

Add to the system prompt when task is classified as "backend" or "api" or "server":

```
For Node.js/TypeScript backends, use BoneScript:
1. Write a .bone file (declarative syntax — entities, capabilities, events, policies)
2. Compile with bone_compile tool
3. The compiler generates the ENTIRE project (routes, auth, DB, events, migrations, SDK, admin panel)

Do NOT hand-write Express routes, Prisma schemas, or JWT auth. Use BoneScript instead.

BoneScript syntax example:
system MyApp {
  entity User {
    owns: [name: string, email: string, role: string]
    constraints: [email.unique, name.length in 1..100]
    states: active -> suspended -> deleted
    auth: jwt
  }

  capability register(user: User) {
    requires: [user.email.unique]
    effects: [user.state = active]
    emits: UserRegistered
    sync: transactional
  }

  event UserRegistered {
    payload: { user_id: uuid, email: string }
    delivery: exactly_once
  }

  policy api {
    rate_limit: 100 per 1m
    audit: true
  }
}
```

### 5. Task classifier triggers BoneScript mode

In `governor.js`, update `classifyTask`:

```js
function classifyTask(userMessage) {
  const msg = userMessage.toLowerCase();
  // Detect backend/API tasks that should use BoneScript
  if (msg.match(/\b(api|backend|server|rest|crud|auth|database|endpoint|express|fastify)\b.*\b(create|build|make|implement|set up)\b/) ||
      msg.match(/\b(create|build|make)\b.*\b(api|backend|server|rest|crud|endpoint)\b/)) {
    return 'backend'; // triggers BoneScript mode
  }
  // ... existing classification
}
```

When `taskType === 'backend'`, the system prompt includes BoneScript syntax guide and the `bone_compile` / `bone_check` tools become prioritized.

### 6. Improvement loop integration

Add `.bone` to the file validator:

```js
// In runValidation():
if (ext === '.bone') {
  const compiler = path.resolve(__dirname, '..', 'node_modules', 'bonescript-compiler', 'dist', 'cli.js');
  cmd = `node "${compiler}" check "${filePath}" 2>&1`;
  parseErrors = (output) => output.split('\n').filter(l => l.includes('error')).slice(0, 5);
}
```

Now when the model writes a `.bone` file with errors, the governor catches them and feeds them back for fixing — same as Python/TS/Go.

### 7. Memory integration

When BoneScript is used successfully, save the pattern to memory:

```js
memoryStore.remember({
  type: 'workflow',
  title: 'Backend creation uses BoneScript',
  content: 'This project creates backends by writing .bone files and compiling with bone_compile. Do not hand-write Express routes.',
  tags: ['bonescript', 'backend', 'workflow']
});
```

Future sessions will auto-load this from memory and know to use BoneScript.

### 8. BoneScript syntax in model context

Create `bin/bonescript_guide.js` that returns a compact syntax reference (under 500 tokens) injected into context when `taskType === 'backend'`:

```
BoneScript Quick Reference:
- entity: data model with fields, constraints, state machine, auth
- capability: operation with requires/effects/emits/sync
- event: durable message with delivery guarantee
- channel: WebSocket with ordering/persistence
- policy: rate limit + audit + encryption
- store: database engine selection
- flow: multi-step saga with compensation
- extension_point: custom logic hooks

Compile: bone_compile <file.bone>
Check:   bone_check <file.bone>
```

## Rollout

### Phase 1: Basic integration
- [x] Add bonescript-compiler as dependency
- [x] Add bone_compile and bone_check tools
- [x] Add .bone to the improvement loop validator
- [ ] Test: "create a todo API" should produce a .bone file

### Phase 2: Smart routing
- [x] Task classifier detects backend tasks
- [x] System prompt injects BoneScript guide for backend tasks only
- [ ] Memory learns "this project uses BoneScript"
- [ ] Governor scores bone_compile tool performance

### Phase 3: Full workflow
- [ ] Model writes .bone → compiles → runs output → tests it
- [ ] If .bone has errors, improvement loop fixes them
- [ ] If compile succeeds, model can still edit output/ files for customization
- [ ] Extension points allow custom logic without touching generated code

## What the Model Still Does Manually

BoneScript handles backend generation. The model still writes directly for:
- Python projects (FastAPI, Django, scripts)
- Frontend (React, Vue, Svelte, HTML/CSS/JS)
- Rust, Go, C++ projects
- DevOps (Dockerfile, CI, scripts)
- Data science, ML
- Testing (pytest, vitest, node:test)
- Any non-Node.js backend

## Expected Impact on Stress Test

| Category | Before (manual) | After (BoneScript) |
|----------|----------------|-------------------|
| Fullstack (36-40) | 0/5 (0%) | ~4/5 (80%) — one .bone file per task |
| Config (41-45) | 1/5 (20%) | ~3/5 (60%) — BoneScript handles package.json/tsconfig/Docker |
| Overall multi-file | 21/47 (45%) | ~30/50 (60%+) |

The improvement comes from reducing 5-file backend tasks to 1-file tasks.
One write_file call is far more reliable than five.
