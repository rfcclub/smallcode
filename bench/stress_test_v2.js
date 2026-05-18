#!/usr/bin/env node
// SmallCode Stress Test v2 — Multi-file projects, dependency-aware
// Each task creates a multi-file project. Dependencies are auto-installed.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORK_DIR = path.resolve(__dirname, '..', '.stress-test-v2');
const LOG_FILE = path.resolve(__dirname, '..', 'bench', 'stress_results_v2.json');
const SC = path.resolve(__dirname, '..', 'bin', 'smallcode.js');

// Per-task dirs so each task is isolated
function freshTaskDir(id) {
  const dir = path.join(WORK_DIR, `task-${String(id).padStart(3, '0')}`);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

if (fs.existsSync(WORK_DIR)) fs.rmSync(WORK_DIR, { recursive: true, force: true });
fs.mkdirSync(WORK_DIR, { recursive: true });

const results = [];
let passed = 0, failed = 0, errors = [];

function runTask(id, category, prompt, postCheck = null) {
  const taskDir = freshTaskDir(id);
  const start = Date.now();
  process.stdout.write(`  [${String(id).padStart(3)}] ${category.padEnd(12)} `);

  try {
    const output = execSync(
      `echo "${prompt.replace(/"/g, '\\"')}" | node "${SC}" --non-interactive`,
      { encoding: 'utf-8', timeout: 60000, cwd: taskDir, maxBuffer: 10 * 1024 * 1024, env: { ...process.env, NODE_NO_WARNINGS: '1' } }
    );
    const elapsed = Date.now() - start;
    const toolCalls = (output.match(/⚙/g) || []).length;
    const decomposed = output.includes('◇ DECOMPOSE');
    const hasError = output.includes('No response from model') || output.includes('FAILED');

    // Run post-check if provided (validates files were created correctly)
    let checkResult = { passed: true, message: '' };
    if (postCheck) {
      try {
        checkResult = postCheck(taskDir);
      } catch (e) {
        checkResult = { passed: false, message: e.message };
      }
    }

    if (checkResult.passed && !hasError) {
      passed++;
      const decompTag = decomposed ? ' [decomp]' : '';
      process.stdout.write(`✓ ${elapsed}ms (${toolCalls} tools)${decompTag}\n`);
      results.push({ id, category, prompt: prompt.slice(0, 60), status: 'pass', elapsed, toolCalls, decomposed });
    } else {
      failed++;
      const reason = !checkResult.passed ? `check_failed: ${checkResult.message}` : 'no_response';
      process.stdout.write(`✗ ${reason.slice(0, 50)}\n`);
      errors.push({ id, category, prompt, reason, output: output.slice(-1000) });
      results.push({ id, category, prompt: prompt.slice(0, 60), status: 'fail', elapsed, reason });
    }
  } catch (e) {
    const elapsed = Date.now() - start;
    failed++;
    const reason = e.killed ? 'timeout' : (e.message || '').slice(0, 100);
    process.stdout.write(`✗ ${reason.slice(0, 40)}\n`);
    errors.push({ id, category, prompt, reason, output: (e.stdout || '').slice(-1000) });
    results.push({ id, category, prompt: prompt.slice(0, 60), status: 'fail', elapsed, reason });
  }
}

// ─── Post-check helpers ─────────────────────────────────────────────────────

function checkFiles(taskDir, requiredFiles) {
  for (const f of requiredFiles) {
    if (!fs.existsSync(path.join(taskDir, f))) {
      return { passed: false, message: `Missing file: ${f}` };
    }
  }
  return { passed: true, message: `${requiredFiles.length} files created` };
}

function checkPythonRuns(taskDir, mainFile) {
  try {
    execSync(`python "${mainFile}"`, { cwd: taskDir, timeout: 15000, encoding: 'utf-8' });
    return { passed: true, message: 'runs ok' };
  } catch (e) {
    return { passed: false, message: `runtime: ${(e.stderr || '').slice(0, 100)}` };
  }
}

function checkNodeRuns(taskDir, mainFile) {
  try {
    execSync(`node "${mainFile}"`, { cwd: taskDir, timeout: 15000, encoding: 'utf-8' });
    return { passed: true, message: 'runs ok' };
  } catch (e) {
    return { passed: false, message: `runtime: ${(e.stderr || '').slice(0, 100)}` };
  }
}

// ─── 50 Multi-file Tasks Across 10 Categories ──────────────────────────────

const TASKS = [
  // ─── Python multi-file (5) ─────────────────────────────────────────────
  ['python-multi', 'Create a Python project: src/calculator.py with add/subtract/multiply/divide functions, src/main.py that imports from src/calculator.py and demos all functions, and __init__.py files where needed. The main.py should run successfully.',
    (d) => checkFiles(d, ['src/calculator.py', 'src/main.py'])],
  ['python-multi', 'Create a Python project with: lib/string_utils.py (reverse, capitalize, count_words functions), lib/__init__.py exporting them, and run.py that imports and uses all three. Make run.py work.',
    (d) => checkFiles(d, ['lib/string_utils.py', 'run.py'])],
  ['python-multi', 'Create db/connection.py (connect/disconnect functions using sqlite3), db/users.py (insert_user/get_user functions), db/__init__.py, and main.py that creates a user and retrieves it.',
    (d) => checkFiles(d, ['db/connection.py', 'db/users.py', 'main.py'])],
  ['python-multi', 'Create a CLI tool: cli/parser.py (parse_args function), cli/commands.py (with hello and goodbye commands), cli/__init__.py, and bin/cli.py entry point.',
    (d) => checkFiles(d, ['cli/parser.py', 'cli/commands.py', 'bin/cli.py'])],
  ['python-multi', 'Create a Flask-style app: app/routes.py (with /hello and /world endpoints as functions), app/server.py (basic http.server using routes), app/__init__.py, and run.py to start it.',
    (d) => checkFiles(d, ['app/routes.py', 'app/server.py', 'run.py'])],

  // ─── JavaScript multi-file (5) ─────────────────────────────────────────
  ['js-multi', 'Create a Node project: src/math.js with add/subtract exports, src/index.js that requires math.js and runs the functions, and package.json with type:commonjs. node src/index.js must work.',
    (d) => checkFiles(d, ['src/math.js', 'src/index.js', 'package.json'])],
  ['js-multi', 'Create lib/logger.js (with info/warn/error functions), lib/config.js (with default config object), and app.js that uses both. CommonJS modules.',
    (d) => checkFiles(d, ['lib/logger.js', 'lib/config.js', 'app.js'])],
  ['js-multi', 'Create utils/array_helpers.js (chunk, flatten, unique functions), utils/string_helpers.js (slugify, truncate), and demo.js that imports and demonstrates all 5 functions.',
    (d) => checkFiles(d, ['utils/array_helpers.js', 'utils/string_helpers.js', 'demo.js'])],
  ['js-multi', 'Create an event system: src/events.js (EventEmitter class), src/listeners.js (some example listeners), src/main.js wiring it together. CommonJS.',
    (d) => checkFiles(d, ['src/events.js', 'src/listeners.js', 'src/main.js'])],
  ['js-multi', 'Create models/User.js (User class with id, name, email), models/Post.js (Post class), models/index.js exporting both, and example.js that creates instances.',
    (d) => checkFiles(d, ['models/User.js', 'models/Post.js', 'models/index.js', 'example.js'])],

  // ─── TypeScript multi-file (5) ─────────────────────────────────────────
  ['ts-multi', 'Create a TS project: src/types.ts (User, Post interfaces), src/api.ts (typed fetch wrapper), src/main.ts using both. Include tsconfig.json with strict mode.',
    (d) => checkFiles(d, ['src/types.ts', 'src/api.ts', 'src/main.ts', 'tsconfig.json'])],
  ['ts-multi', 'Create lib/result.ts (Result<T,E> generic type with helpers), lib/error.ts (custom Error class), and src/index.ts using them. Include tsconfig.json.',
    (d) => checkFiles(d, ['lib/result.ts', 'lib/error.ts', 'src/index.ts', 'tsconfig.json'])],
  ['ts-multi', 'Create a typed state machine: src/states.ts (state types), src/transitions.ts (transition functions), src/machine.ts (StateMachine class), src/demo.ts.',
    (d) => checkFiles(d, ['src/states.ts', 'src/transitions.ts', 'src/machine.ts', 'src/demo.ts'])],
  ['ts-multi', 'Create a DI container: src/container.ts (typed DI container class), src/services.ts (example services), src/app.ts using DI. Plus tsconfig.json.',
    (d) => checkFiles(d, ['src/container.ts', 'src/services.ts', 'src/app.ts', 'tsconfig.json'])],
  ['ts-multi', 'Create components/Button.tsx (typed React button), components/Input.tsx (typed React input), components/index.ts exporting both, plus tsconfig.json.',
    (d) => checkFiles(d, ['components/Button.tsx', 'components/Input.tsx', 'components/index.ts', 'tsconfig.json'])],

  // ─── HTML/CSS/JS multi-file (5) ────────────────────────────────────────
  ['web-multi', 'Create a static site: index.html (with nav linking to about.html), about.html, css/styles.css (shared styling), js/main.js (interactive nav highlighting).',
    (d) => checkFiles(d, ['index.html', 'about.html', 'css/styles.css', 'js/main.js'])],
  ['web-multi', 'Create a todo app: index.html, css/app.css, js/app.js (todo logic), js/storage.js (localStorage wrapper). Wire it all together.',
    (d) => checkFiles(d, ['index.html', 'css/app.css', 'js/app.js', 'js/storage.js'])],
  ['web-multi', 'Create a multi-page form: form.html (form), success.html, css/form.css, js/validation.js (validates email + required fields). Form posts to success.html.',
    (d) => checkFiles(d, ['form.html', 'success.html', 'css/form.css', 'js/validation.js'])],
  ['web-multi', 'Create a dashboard layout: index.html, css/layout.css (sidebar + main grid), css/components.css (cards, buttons), js/dashboard.js (chart rendering placeholder).',
    (d) => checkFiles(d, ['index.html', 'css/layout.css', 'css/components.css', 'js/dashboard.js'])],
  ['web-multi', 'Create a blog: index.html (post list), post.html (single post template), css/blog.css, js/posts.js (loads posts from a JSON array). Include posts.json.',
    (d) => checkFiles(d, ['index.html', 'post.html', 'css/blog.css', 'js/posts.js', 'posts.json'])],

  // ─── Rust multi-file (5) ───────────────────────────────────────────────
  ['rust-multi', 'Create Cargo.toml + src/main.rs + src/lib.rs (with a public function add(a, b: i32) -> i32) + src/utils.rs (helper module). Use Rust 2021 edition.',
    (d) => checkFiles(d, ['Cargo.toml', 'src/main.rs', 'src/lib.rs', 'src/utils.rs'])],
  ['rust-multi', 'Create a Rust project with traits: Cargo.toml, src/main.rs, src/shapes.rs (Shape trait + Circle/Rectangle structs implementing it). Edition 2021.',
    (d) => checkFiles(d, ['Cargo.toml', 'src/main.rs', 'src/shapes.rs'])],
  ['rust-multi', 'Rust: Cargo.toml, src/main.rs, src/error.rs (custom Error enum with Display impl), src/db.rs (mock db functions returning Result). Edition 2021.',
    (d) => checkFiles(d, ['Cargo.toml', 'src/main.rs', 'src/error.rs', 'src/db.rs'])],
  ['rust-multi', 'Rust CLI: Cargo.toml, src/main.rs (uses std::env::args), src/cli.rs (parses args), src/commands.rs (executes commands). Edition 2021.',
    (d) => checkFiles(d, ['Cargo.toml', 'src/main.rs', 'src/cli.rs', 'src/commands.rs'])],
  ['rust-multi', 'Rust generics: Cargo.toml, src/main.rs, src/stack.rs (generic Stack<T>), src/queue.rs (generic Queue<T>). Edition 2021.',
    (d) => checkFiles(d, ['Cargo.toml', 'src/main.rs', 'src/stack.rs', 'src/queue.rs'])],

  // ─── Go multi-file (5) ─────────────────────────────────────────────────
  ['go-multi', 'Create go.mod (module name: example), main.go, math/math.go (package math, exports Add and Sub functions). main.go imports and uses them.',
    (d) => checkFiles(d, ['go.mod', 'main.go', 'math/math.go'])],
  ['go-multi', 'Create go.mod, main.go, internal/server/server.go (basic HTTP handler), internal/router/router.go (route registration). main.go starts the server briefly.',
    (d) => checkFiles(d, ['go.mod', 'main.go', 'internal/server/server.go', 'internal/router/router.go'])],
  ['go-multi', 'Go interfaces: go.mod, main.go, models/animal.go (Animal interface + Dog/Cat structs implementing it). main.go uses polymorphism.',
    (d) => checkFiles(d, ['go.mod', 'main.go', 'models/animal.go'])],
  ['go-multi', 'Go errors: go.mod, main.go, errors/errors.go (custom error types with Wrap), database/db.go (functions returning wrapped errors). Demo unwrapping.',
    (d) => checkFiles(d, ['go.mod', 'main.go', 'errors/errors.go', 'database/db.go'])],
  ['go-multi', 'Go concurrency: go.mod, main.go, workers/pool.go (worker pool with channels), tasks/task.go (Task struct + Process method). Demo with 5 tasks.',
    (d) => checkFiles(d, ['go.mod', 'main.go', 'workers/pool.go', 'tasks/task.go'])],

  // ─── Test suites multi-file (5) ────────────────────────────────────────
  ['test-multi', 'Python: src/calc.py (add/sub/mul/div), tests/test_calc.py using unittest with 4 test cases. Run with python -m unittest discover.',
    (d) => checkFiles(d, ['src/calc.py', 'tests/test_calc.py'])],
  ['python-test', 'Python project with pytest: src/utils.py (string utilities), tests/test_utils.py with at least 5 test cases. Add requirements.txt with pytest.',
    (d) => checkFiles(d, ['src/utils.py', 'tests/test_utils.py', 'requirements.txt'])],
  ['js-test', 'Node project: src/queue.js (Queue class), test/queue.test.js using node:test, package.json with test script. Run with node --test.',
    (d) => checkFiles(d, ['src/queue.js', 'test/queue.test.js', 'package.json'])],
  ['ts-test', 'TypeScript: src/parser.ts (CSV parser), test/parser.test.ts using node:test syntax, tsconfig.json, package.json with test script.',
    (d) => checkFiles(d, ['src/parser.ts', 'test/parser.test.ts', 'tsconfig.json', 'package.json'])],
  ['python-test', 'Python: src/validators.py (email_valid, phone_valid, url_valid functions), tests/test_validators.py covering each with valid AND invalid cases.',
    (d) => checkFiles(d, ['src/validators.py', 'tests/test_validators.py'])],

  // ─── Full-stack multi-file (5) ─────────────────────────────────────────
  ['fullstack', 'Frontend + backend: server/index.js (Express-like with /api/users), client/index.html, client/css/app.css, client/js/app.js (fetches /api/users).',
    (d) => checkFiles(d, ['server/index.js', 'client/index.html', 'client/css/app.css', 'client/js/app.js'])],
  ['fullstack', 'REST API project: api/users.js (GET/POST/DELETE), api/server.js (routes them), public/index.html (UI), public/script.js (calls API).',
    (d) => checkFiles(d, ['api/users.js', 'api/server.js', 'public/index.html', 'public/script.js'])],
  ['fullstack', 'Auth flow: server/auth.js (login/register), server/middleware.js (token check), server/index.js (server), client/login.html, client/dashboard.html.',
    (d) => checkFiles(d, ['server/auth.js', 'server/middleware.js', 'server/index.js', 'client/login.html', 'client/dashboard.html'])],
  ['fullstack', 'Chat app: server/socket.js (WebSocket placeholder), server/messages.js (message store), client/chat.html, client/chat.js, client/styles.css.',
    (d) => checkFiles(d, ['server/socket.js', 'server/messages.js', 'client/chat.html', 'client/chat.js', 'client/styles.css'])],
  ['fullstack', 'Blog backend + frontend: server/posts.js (CRUD), server/index.js, client/index.html, client/post.html, client/admin.html, client/admin.js.',
    (d) => checkFiles(d, ['server/posts.js', 'server/index.js', 'client/index.html', 'client/post.html', 'client/admin.html', 'client/admin.js'])],

  // ─── Build/config multi-file (5) ───────────────────────────────────────
  ['config', 'Setup a TS project: package.json, tsconfig.json, .gitignore, README.md, src/index.ts (Hello World). All files must be valid.',
    (d) => checkFiles(d, ['package.json', 'tsconfig.json', '.gitignore', 'README.md', 'src/index.ts'])],
  ['config', 'Setup ESLint + Prettier: package.json (with deps), .eslintrc.json, .prettierrc, src/main.js (sample code).',
    (d) => checkFiles(d, ['package.json', '.eslintrc.json', '.prettierrc', 'src/main.js'])],
  ['config', 'Docker setup: Dockerfile (Node 20), docker-compose.yml, .dockerignore, package.json, src/server.js (basic HTTP server).',
    (d) => checkFiles(d, ['Dockerfile', 'docker-compose.yml', '.dockerignore', 'package.json', 'src/server.js'])],
  ['config', 'Python project: pyproject.toml (poetry-style), .python-version, README.md, src/__init__.py, src/main.py.',
    (d) => checkFiles(d, ['pyproject.toml', '.python-version', 'README.md', 'src/__init__.py', 'src/main.py'])],
  ['config', 'GitHub Actions CI: .github/workflows/ci.yml (test on Node 20), package.json with test script, src/index.js, test/index.test.js using node:test.',
    (d) => checkFiles(d, ['.github/workflows/ci.yml', 'package.json', 'src/index.js', 'test/index.test.js'])],

  // ─── Refactor multi-file (5) ───────────────────────────────────────────
  ['refactor', 'Create monolith.py (200 lines: User, Order, Inventory classes all in one file), then split into src/user.py, src/order.py, src/inventory.py, src/__init__.py.',
    (d) => checkFiles(d, ['src/user.py', 'src/order.py', 'src/inventory.py'])],
  ['refactor', 'Create big.js with 5 functions, then refactor into utils/format.js (2 funcs), utils/parse.js (2 funcs), utils/validate.js (1 func), index.js using all.',
    (d) => checkFiles(d, ['utils/format.js', 'utils/parse.js', 'utils/validate.js', 'index.js'])],
  ['refactor', 'Create app.ts with all routes inline. Refactor into routes/users.ts, routes/posts.ts, routes/index.ts, app.ts using them.',
    (d) => checkFiles(d, ['routes/users.ts', 'routes/posts.ts', 'routes/index.ts', 'app.ts'])],
  ['refactor', 'Create style.css with 100 rules. Refactor into css/reset.css, css/layout.css, css/components.css, css/utilities.css, index.html importing all.',
    (d) => checkFiles(d, ['css/reset.css', 'css/layout.css', 'css/components.css', 'css/utilities.css', 'index.html'])],
  ['refactor', 'Create models.py with User, Product, Order all in one. Split into models/user.py, models/product.py, models/order.py, models/__init__.py.',
    (d) => checkFiles(d, ['models/user.py', 'models/product.py', 'models/order.py'])],
];

// ═══════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║  SmallCode Stress Test v2 — Multi-file projects                  ║");
console.log("║  50 tasks across 10 categories                                   ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

const totalStart = Date.now();
let currentCategory = '';

for (let i = 0; i < TASKS.length; i++) {
  const [cat, prompt, postCheck] = TASKS[i];
  if (cat !== currentCategory) {
    currentCategory = cat;
    console.log(`\n─── ${cat.toUpperCase()} ────────────────────────────────────────────`);
  }
  runTask(i + 1, cat, prompt, postCheck);
}

const totalTime = Date.now() - totalStart;

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log("\n═══════════════════════════════════════════════════════════════════");
console.log("  RESULTS");
console.log("═══════════════════════════════════════════════════════════════════");
console.log(`  Total:    ${TASKS.length} tasks`);
console.log(`  Passed:   ${passed} (${Math.round(passed/TASKS.length*100)}%)`);
console.log(`  Failed:   ${failed} (${Math.round(failed/TASKS.length*100)}%)`);
console.log(`  Time:     ${(totalTime/1000).toFixed(1)}s total, ${(totalTime/TASKS.length/1000).toFixed(1)}s avg`);

const decompCount = results.filter(r => r.decomposed).length;
console.log(`  Decomposed: ${decompCount} tasks triggered the decompose strategy`);

const catResults = {};
for (const r of results) {
  if (!catResults[r.category]) catResults[r.category] = { pass: 0, fail: 0 };
  catResults[r.category][r.status === 'pass' ? 'pass' : 'fail']++;
}
console.log("\n  By category:");
for (const [cat, r] of Object.entries(catResults)) {
  const total = r.pass + r.fail;
  console.log(`    ${cat.padEnd(14)} ${r.pass}/${total} passed`);
}

console.log("═══════════════════════════════════════════════════════════════════\n");

fs.writeFileSync(LOG_FILE, JSON.stringify({ results, errors, summary: { passed, failed, total: TASKS.length, timeMs: totalTime, decomposed: decompCount } }, null, 2));
console.log(`  Results saved to bench/stress_results_v2.json`);

try { fs.rmSync(WORK_DIR, { recursive: true, force: true }); } catch {}
