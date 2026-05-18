#!/usr/bin/env node
// SmallCode Stress Test — 100 tasks across 10 categories
// Runs each task, captures success/failure, logs issues

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORK_DIR = path.resolve(__dirname, '..', '.stress-test');
const LOG_FILE = path.resolve(__dirname, '..', 'bench', 'stress_results.json');

// Clean workspace
if (fs.existsSync(WORK_DIR)) fs.rmSync(WORK_DIR, { recursive: true, force: true });
fs.mkdirSync(WORK_DIR, { recursive: true });

const results = [];
let passed = 0, failed = 0, errors = [];

function runTask(id, category, prompt, timeout = 45000) {
  const start = Date.now();
  process.stdout.write(`  [${String(id).padStart(3)}] ${category.padEnd(12)} `);
  
  try {
    const output = execSync(
      `echo "${prompt.replace(/"/g, '\\"')}" | node "${path.resolve(__dirname, '..', 'bin', 'smallcode.js')}" --non-interactive`,
      { encoding: 'utf-8', timeout, cwd: WORK_DIR, maxBuffer: 5 * 1024 * 1024, env: { ...process.env, NODE_NO_WARNINGS: '1' } }
    );
    const elapsed = Date.now() - start;
    const toolCalls = (output.match(/⚙/g) || []).length;
    const hasError = output.includes('✗') || output.includes('FAILED') || output.includes('Error:');
    const hasOutput = output.trim().length > 20;

    if (hasOutput && !output.includes('No response from model')) {
      passed++;
      process.stdout.write(`✓ ${elapsed}ms (${toolCalls} tools)\n`);
      results.push({ id, category, prompt: prompt.slice(0, 60), status: 'pass', elapsed, toolCalls, hasError });
    } else {
      failed++;
      const reason = output.includes('No response') ? 'no_response' : 'empty_output';
      process.stdout.write(`✗ ${reason}\n`);
      errors.push({ id, category, prompt, reason, output: output.slice(0, 500) });
      results.push({ id, category, prompt: prompt.slice(0, 60), status: 'fail', elapsed, reason });
    }
  } catch (e) {
    const elapsed = Date.now() - start;
    failed++;
    const reason = e.killed ? 'timeout' : (e.message || '').slice(0, 100);
    process.stdout.write(`✗ ${reason.slice(0, 40)}\n`);
    errors.push({ id, category, prompt, reason, output: (e.stdout || '').slice(0, 500) });
    results.push({ id, category, prompt: prompt.slice(0, 60), status: 'fail', elapsed, reason });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK DEFINITIONS — 10 categories × 10 tasks each
// ═══════════════════════════════════════════════════════════════════════════════

const TASKS = [
  // Category 1: Python
  ['python', 'Create a Python file fibonacci.py with a recursive fibonacci function'],
  ['python', 'Create calc.py with add, subtract, multiply, divide functions'],
  ['python', 'Create sort.py with bubble sort and quick sort implementations'],
  ['python', 'Create a Python file linked_list.py with a singly linked list class'],
  ['python', 'Create stack.py with push, pop, peek using a list'],
  ['python', 'Create binary_search.py that searches a sorted array'],
  ['python', 'Create counter.py that counts word frequency in a string'],
  ['python', 'Create matrix.py with matrix multiplication function'],
  ['python', 'Create palindrome.py that checks if a string is a palindrome'],
  ['python', 'Create prime.py with a function to check if a number is prime'],

  // Category 2: JavaScript/Node
  ['javascript', 'Create server.js with a basic http server that responds with hello world on port 3000'],
  ['javascript', 'Create utils.js with debounce and throttle functions'],
  ['javascript', 'Create promise.js demonstrating Promise.all and async/await'],
  ['javascript', 'Create events.js with a simple EventEmitter class'],
  ['javascript', 'Create router.js with a basic URL router using regex patterns'],
  ['javascript', 'Create queue.js with enqueue, dequeue, and peek'],
  ['javascript', 'Create deep_clone.js that deep clones objects handling arrays and dates'],
  ['javascript', 'Create retry.js with an async retry function with exponential backoff'],
  ['javascript', 'Create csv_parser.js that parses CSV text into objects'],
  ['javascript', 'Create lru_cache.js implementing an LRU cache with get and put'],

  // Category 3: TypeScript
  ['typescript', 'Create types.ts with generic Stack<T> and Queue<T> interfaces and classes'],
  ['typescript', 'Create api.ts with typed fetch wrapper returning Result<T, Error>'],
  ['typescript', 'Create state.ts with a typed state machine using discriminated unions'],
  ['typescript', 'Create validator.ts with runtime type validation using generics'],
  ['typescript', 'Create observable.ts with a basic Observable pattern typed properly'],
  ['typescript', 'Create builder.ts with a typed builder pattern for creating objects'],
  ['typescript', 'Create middleware.ts with typed Express-style middleware chain'],
  ['typescript', 'Create either.ts implementing Either<L,R> monad with map and flatMap'],
  ['typescript', 'Create pipe.ts with a typed pipe function that chains transformations'],
  ['typescript', 'Create di.ts with a simple typed dependency injection container'],

  // Category 4: HTML/CSS
  ['html', 'Create index.html with a responsive navbar using flexbox'],
  ['html', 'Create form.html with a login form including email validation'],
  ['html', 'Create grid.html with a 3-column responsive CSS grid layout'],
  ['html', 'Create modal.html with a modal dialog that opens/closes with JS'],
  ['html', 'Create table.html with a sortable data table'],
  ['html', 'Create card.html with animated hover cards using CSS transitions'],
  ['html', 'Create accordion.html with an expandable FAQ section'],
  ['html', 'Create progress.html with an animated progress bar'],
  ['html', 'Create toast.html with a toast notification system'],
  ['html', 'Create dark_toggle.html with dark/light mode toggle using CSS vars'],

  // Category 5: Rust-style (pseudocode since no compiler)
  ['rust', 'Create ownership.rs demonstrating Rust ownership with String examples'],
  ['rust', 'Create traits.rs with a Shape trait and Circle/Rectangle implementations'],
  ['rust', 'Create enums.rs with a Result-like enum and pattern matching'],
  ['rust', 'Create lifetime.rs showing lifetime annotations on struct and functions'],
  ['rust', 'Create iterator.rs with a custom iterator implementation'],
  ['rust', 'Create error.rs with custom error types using thiserror pattern'],
  ['rust', 'Create async_example.rs showing async/await with tokio patterns'],
  ['rust', 'Create generics.rs with generic data structures'],
  ['rust', 'Create macro_example.rs with a simple declarative macro'],
  ['rust', 'Create concurrent.rs with Arc Mutex shared state pattern'],

  // Category 6: Go-style
  ['go', 'Create main.go with a basic HTTP server using net/http'],
  ['go', 'Create channels.go demonstrating goroutines and channels'],
  ['go', 'Create interface.go with interfaces and polymorphism'],
  ['go', 'Create errors.go with custom error types and wrapping'],
  ['go', 'Create middleware.go with HTTP middleware pattern'],
  ['go', 'Create context.go demonstrating context with timeout'],
  ['go', 'Create generics.go with generic data structures in Go 1.18+'],
  ['go', 'Create test_example.go with table-driven tests'],
  ['go', 'Create worker_pool.go with a worker pool pattern'],
  ['go', 'Create cli.go with a basic CLI using flag package'],

  // Category 7: Data structures
  ['datastructure', 'Create bst.py with a binary search tree with insert, search, delete'],
  ['datastructure', 'Create heap.py with a min-heap implementation'],
  ['datastructure', 'Create graph.py with BFS and DFS traversal'],
  ['datastructure', 'Create trie.py with insert and search operations'],
  ['datastructure', 'Create hash_map.py implementing a hash map with chaining'],
  ['datastructure', 'Create rb_tree.py with red-black tree insert (simplified)'],
  ['datastructure', 'Create deque.js with a double-ended queue'],
  ['datastructure', 'Create bloom_filter.py with a simple bloom filter'],
  ['datastructure', 'Create skip_list.py with a basic skip list'],
  ['datastructure', 'Create segment_tree.py for range sum queries'],

  // Category 8: Testing
  ['testing', 'Create test_math.py using pytest to test basic math operations'],
  ['testing', 'Create test_string.js using node:test to test string utilities'],
  ['testing', 'Create test_api.ts with mock fetch tests using vitest syntax'],
  ['testing', 'Create test_sort.py testing bubble sort with edge cases'],
  ['testing', 'Create test_stack.js testing stack operations with assertions'],
  ['testing', 'Create test_linked_list.py testing insert, delete, search'],
  ['testing', 'Create test_cache.js testing LRU cache eviction behavior'],
  ['testing', 'Create test_validator.ts testing input validation functions'],
  ['testing', 'Create test_parser.py testing CSV parsing with malformed input'],
  ['testing', 'Create test_auth.js testing token generation and verification'],

  // Category 9: Multi-file projects
  ['multifile', 'Create src/models/user.ts and src/models/index.ts that exports a User interface with id, name, email'],
  ['multifile', 'Create lib/math.py and lib/__init__.py with add and multiply functions'],
  ['multifile', 'Create components/Button.tsx and components/index.ts with a typed React button'],
  ['multifile', 'Create services/logger.js and services/config.js with a configurable logger'],
  ['multifile', 'Create api/routes.ts and api/handlers.ts with a typed route handler system'],
  ['multifile', 'Create db/connection.py and db/models.py with SQLite connection and User model'],
  ['multifile', 'Create cli/parser.js and cli/commands.js with argument parsing and command dispatch'],
  ['multifile', 'Create utils/validation.ts and utils/formatting.ts with email validator and date formatter'],
  ['multifile', 'Create game/entity.py and game/physics.py with Entity class and collision detection'],
  ['multifile', 'Create auth/jwt.js and auth/middleware.js with JWT sign/verify and auth middleware'],

  // Category 10: Bug fixing / editing
  ['bugfix', 'Create buggy.py with a function that has an off-by-one error in a loop, then fix it'],
  ['bugfix', 'Create broken.js with a Promise that never resolves, then fix it'],
  ['bugfix', 'Create typo.ts with multiple TypeScript type errors, then fix them'],
  ['bugfix', 'Create memory_leak.js with an event listener leak, then fix it'],
  ['bugfix', 'Create race.py with a race condition in threading, then fix with a lock'],
  ['bugfix', 'Create null_check.ts with unsafe null access, then add proper guards'],
  ['bugfix', 'Create xss.html with an XSS vulnerability in innerHTML, then sanitize it'],
  ['bugfix', 'Create sql_inject.py with SQL injection vulnerability, then use parameterized query'],
  ['bugfix', 'Create infinite.js with an infinite loop bug, then fix the termination condition'],
  ['bugfix', 'Create deadlock.py with a potential deadlock, then fix the lock ordering'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║  SmallCode Stress Test — 100 tasks, 10 categories               ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

const totalStart = Date.now();
let currentCategory = '';

for (let i = 0; i < TASKS.length; i++) {
  const [cat, prompt] = TASKS[i];
  if (cat !== currentCategory) {
    currentCategory = cat;
    console.log(`\n─── ${cat.toUpperCase()} ────────────────────────────────────────────`);
  }
  runTask(i + 1, cat, prompt);
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

// Category breakdown
const catResults = {};
for (const r of results) {
  if (!catResults[r.category]) catResults[r.category] = { pass: 0, fail: 0 };
  catResults[r.category][r.status === 'pass' ? 'pass' : 'fail']++;
}
console.log("\n  By category:");
for (const [cat, r] of Object.entries(catResults)) {
  console.log(`    ${cat.padEnd(14)} ${r.pass}/10 passed`);
}

// Common failures
if (errors.length > 0) {
  console.log(`\n  Common failure reasons:`);
  const reasons = {};
  for (const e of errors) {
    const r = e.reason.includes('timeout') ? 'timeout' : e.reason.includes('no_response') ? 'no_response' : e.reason.includes('empty') ? 'empty' : 'error';
    reasons[r] = (reasons[r] || 0) + 1;
  }
  for (const [r, c] of Object.entries(reasons)) {
    console.log(`    ${r}: ${c}`);
  }
}

console.log("═══════════════════════════════════════════════════════════════════\n");

// Save results
fs.writeFileSync(LOG_FILE, JSON.stringify({ results, errors, summary: { passed, failed, total: TASKS.length, timeMs: totalTime } }, null, 2));
console.log(`  Results saved to bench/stress_results.json`);

// Cleanup
try { fs.rmSync(WORK_DIR, { recursive: true, force: true }); } catch {}
