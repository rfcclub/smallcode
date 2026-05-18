// SmallCode — BoneScript Quick Reference
// Returns a compact syntax guide (~400 tokens) injected into system prompt
// when taskType === 'backend'

/**
 * Get the BoneScript syntax guide for model context injection.
 * Compact enough to fit in small model context windows.
 */
function getBoneScriptGuide() {
  return `BoneScript Quick Reference:
- system: top-level container for the entire backend
- entity: data model with fields, constraints, state machine, auth
  owns: [field: type, ...]    (string, int, float, bool, uuid, timestamp, json)
  constraints: [field.unique, field.length in min..max, field.required]
  states: state1 -> state2 -> state3 (state machine transitions)
  auth: jwt | api_key | oauth2
- capability: operation with preconditions, effects, events
  requires: [preconditions]
  effects: [state changes, side effects]
  emits: EventName
  sync: transactional | eventual | fire_and_forget
- event: durable message between services
  payload: { field: type, ... }
  delivery: exactly_once | at_least_once | best_effort
- channel: WebSocket real-time channel
  ordering: fifo | causal | none
  persistence: durable | ephemeral
- policy: rate limiting, audit, encryption
  rate_limit: N per Xs/Xm/Xh
  audit: true | false
  encryption: aes256 | none
- store: database engine selection
  engine: postgres | sqlite | mysql
- flow: multi-step saga with compensation
  steps: [step1, step2, ...]
  on_failure: compensate | abort | retry
- extension_point: custom logic hooks (user code survives recompilation)

Compile: bone_compile <file.bone>
Check:   bone_check <file.bone>

Targets: express (default), nakama, prisma, sqlite`;
}

/**
 * Check if a task message suggests backend work that should use BoneScript.
 * Only triggers for Node.js/TypeScript backends — respects other ecosystems.
 */
function shouldUseBoneScript(message) {
  const msg = message.toLowerCase();
  // Explicit BoneScript references always trigger
  if (msg.match(/\b\.bone\b/) || msg.match(/\bbonescript\b/)) return true;
  // If user mentions a non-Node backend tech, don't inject BoneScript
  const nonNode = msg.match(/\b(python|django|fastapi|flask|go|golang|rust|actix|axum|ruby|rails|php|laravel|java|spring|c#|dotnet|asp\.net|elixir|phoenix)\b/);
  if (nonNode) return false;
  // Only trigger for Node/TS backend creation
  return !!(
    msg.match(/\b(api|backend|server|rest|crud|auth|database|endpoint|express|fastify|node|typescript|ts)\b.*\b(create|build|make|implement|set up)\b/) ||
    msg.match(/\b(create|build|make)\b.*\b(api|backend|server|rest|crud|endpoint)\b/) ||
    msg.match(/\b(node|typescript|ts|express|fastify)\b.*\b(api|backend|server|rest|crud)\b/)
  );
}

module.exports = { getBoneScriptGuide, shouldUseBoneScript };
