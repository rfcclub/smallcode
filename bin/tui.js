// SmallCode — Rich TUI Module
// Markdown rendering, syntax highlighting, colored output

const chalk = require('chalk');

// ─── Markdown-lite renderer (no heavy deps) ──────────────────────────────────

function renderMarkdown(text) {
  if (!text) return '';
  let output = '';
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBuffer = [];

  const lines = text.split('\n');
  for (const line of lines) {
    // Code block start
    if (line.trim().startsWith('```') && !inCodeBlock) {
      inCodeBlock = true;
      codeBlockLang = line.trim().slice(3).trim();
      codeBuffer = [];
      continue;
    }
    // Code block end
    if (line.trim() === '```' && inCodeBlock) {
      inCodeBlock = false;
      output += renderCodeBlock(codeBuffer.join('\n'), codeBlockLang);
      continue;
    }
    // Inside code block
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      output += chalk.bold.cyan(line.slice(4)) + '\n';
    } else if (line.startsWith('## ')) {
      output += chalk.bold.white(line.slice(3)) + '\n';
    } else if (line.startsWith('# ')) {
      output += chalk.bold.whiteBright(line.slice(2)) + '\n';
    }
    // Bold
    else if (line.includes('**')) {
      output += line.replace(/\*\*(.+?)\*\*/g, (_, m) => chalk.bold(m)) + '\n';
    }
    // Inline code
    else if (line.includes('`')) {
      output += line.replace(/`([^`]+)`/g, (_, m) => chalk.yellow(m)) + '\n';
    }
    // List items
    else if (line.match(/^\s*[-*]\s/)) {
      output += chalk.gray('  •') + line.replace(/^\s*[-*]\s/, ' ') + '\n';
    }
    // Numbered lists
    else if (line.match(/^\s*\d+\.\s/)) {
      output += '  ' + line + '\n';
    }
    // Regular text
    else {
      output += line + '\n';
    }
  }

  // Unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    output += renderCodeBlock(codeBuffer.join('\n'), codeBlockLang);
  }

  return output;
}

function renderCodeBlock(code, lang) {
  const border = chalk.gray('  ┌' + '─'.repeat(60));
  const footer = chalk.gray('  └' + '─'.repeat(60));
  const langTag = lang ? chalk.gray(` ${lang}`) : '';
  const lines = code.split('\n').map(l => chalk.gray('  │ ') + highlightLine(l, lang)).join('\n');
  return `${border}${langTag}\n${lines}\n${footer}\n`;
}

function highlightLine(line, lang) {
  // Basic keyword highlighting
  const keywords = {
    js: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'new', 'this', 'true', 'false', 'null', 'undefined'],
    ts: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'extends', 'implements'],
    python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'as', 'True', 'False', 'None', 'with', 'try', 'except', 'raise', 'yield', 'async', 'await', 'self'],
    rust: ['fn', 'let', 'mut', 'struct', 'enum', 'impl', 'pub', 'use', 'mod', 'if', 'else', 'for', 'while', 'match', 'return', 'self', 'true', 'false', 'Some', 'None', 'Ok', 'Err'],
  };

  const langKey = (lang || '').replace('typescript', 'ts').replace('javascript', 'js');
  const kws = keywords[langKey] || keywords.ts; // default to TS

  let highlighted = line;
  // Highlight strings
  highlighted = highlighted.replace(/(["'`])(?:(?!\1).)*\1/g, m => chalk.green(m));
  // Highlight comments
  highlighted = highlighted.replace(/(\/\/.*)$/, m => chalk.gray(m));
  highlighted = highlighted.replace(/(#.*)$/, m => chalk.gray(m));
  // Highlight keywords (word boundary)
  for (const kw of kws) {
    const re = new RegExp(`\\b${kw}\\b`, 'g');
    highlighted = highlighted.replace(re, chalk.magenta(kw));
  }
  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+)\b/g, m => chalk.cyan(m));

  return highlighted;
}

// ─── Status line ─────────────────────────────────────────────────────────────

function renderStatus(config, historyLen) {
  const model = chalk.cyan(config.model.name);
  const msgs = chalk.gray(`${historyLen} msgs`);
  const cwd = chalk.gray(process.cwd().split(/[/\\]/).slice(-2).join('/'));
  return `  ${model} │ ${msgs} │ ${cwd}`;
}

// ─── Welcome banner ──────────────────────────────────────────────────────────

function renderWelcome(config, graphOk) {
  const lines = [
    '',
    chalk.bold.cyan('  ⚡ SmallCode') + chalk.gray(` v0.1.0`),
    '',
    `  Model:    ${chalk.white(config.model.name)}`,
    `  Endpoint: ${chalk.gray(config.model.baseUrl)}`,
    `  Graph:    ${graphOk ? chalk.green('✓ indexed') : chalk.gray('disabled')}`,
    `  Dir:      ${chalk.gray(process.cwd())}`,
    '',
    chalk.gray('  Type a message to chat. /help for commands. /quit to exit.'),
    '',
  ];
  return lines.join('\n');
}

// ─── Tool indicators ─────────────────────────────────────────────────────────

function toolStart(name) {
  return `  ${chalk.cyan('⚙')} ${chalk.cyan(name)} `;
}

function toolSuccess(msg, ms) {
  return `${chalk.green('✓')} ${msg} ${chalk.gray(ms + 'ms')}`;
}

function toolError(msg) {
  return `${chalk.red('✗')} ${msg}`;
}

function toolEdited(filePath, line, ms) {
  return `${chalk.yellow('✓')} Edited ${filePath}:${line} ${chalk.gray(ms + 'ms')}`;
}

function toolCreated(filePath, lines, ms) {
  return `${chalk.green('✓')} Created ${chalk.bold(filePath)} (${lines} lines) ${chalk.gray(ms + 'ms')}`;
}

function toolUpdated(filePath, lines, ms) {
  return `${chalk.green('✓')} Updated ${chalk.bold(filePath)} (${lines} lines) ${chalk.gray(ms + 'ms')}`;
}

function toolBash(cmd, ms) {
  return `${chalk.gray('$')} ${chalk.gray(cmd)} ${chalk.gray(ms + 'ms')}`;
}

function improvementLoop(errors, attempt, max) {
  const header = chalk.yellow(`⟳ ${errors.length} error(s) — fix attempt ${attempt}/${max}`);
  const errLines = errors.slice(0, 3).map(e => `    ${chalk.red(e)}`).join('\n');
  return `  ${header}\n${errLines}`;
}

function improvementFixed(filePath, attempts) {
  return `  ${chalk.green('✓')} ${filePath} — ${chalk.green(`fixed after ${attempts} attempt(s)`)}`;
}

function improvementGaveUp(filePath, max) {
  return `  ${chalk.red('⚠')} ${filePath}: giving up after ${max} fix attempts`;
}

function turnSummary(calls) {
  return chalk.gray(`  ─── ${calls} tool calls this turn ───`);
}

function compacted(removed) {
  return chalk.gray(`  [compacted ${removed} old messages]`);
}

// ─── Diff display ────────────────────────────────────────────────────────────

function renderDiff(filePath, oldStr, newStr, lineNum) {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');

  if (oldLines.length > 8 && newLines.length > 8) return ''; // Too large

  let output = chalk.gray(`    ┌─ ${filePath}:${lineNum}`) + '\n';
  for (const line of oldLines.slice(0, 5)) {
    output += chalk.red(`    │ - ${line}`) + '\n';
  }
  if (oldLines.length > 5) output += chalk.red(`    │ ... (${oldLines.length - 5} more)`) + '\n';
  for (const line of newLines.slice(0, 5)) {
    output += chalk.green(`    │ + ${line}`) + '\n';
  }
  if (newLines.length > 5) output += chalk.green(`    │ ... (${newLines.length - 5} more)`) + '\n';
  output += chalk.gray(`    └─`);
  return output;
}

module.exports = {
  renderMarkdown,
  renderCodeBlock,
  renderStatus,
  renderWelcome,
  renderDiff,
  toolStart,
  toolSuccess,
  toolError,
  toolEdited,
  toolCreated,
  toolUpdated,
  toolBash,
  improvementLoop,
  improvementFixed,
  improvementGaveUp,
  turnSummary,
  compacted,
  chalk,
};
