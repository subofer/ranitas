// Simple lightweight logger with levels, deduping and browser/node support
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
let currentLevel = process.env.LOG_LEVEL || (typeof window !== 'undefined' && localStorage.getItem('LOG_LEVEL')) || 'info';

const DEDUPE_WINDOW = 5000; // ms
const _last = new Map();
const BUFFER_MAX = 1000;
const _buffer = [];

function setLevel(level) {
  if (LEVELS[level]) currentLevel = level;
}

function _shouldLog(level) {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function _pushBuffer(level, tag, msg) {
  try {
    _buffer.push({ ts: new Date().toISOString(), level, tag, msg });
    while (_buffer.length > BUFFER_MAX) _buffer.shift();
  } catch (e) {
    // ignore buffer errors
  }
}

function _emit(level, tag, ...args) {
  const msg = args.length === 1 && typeof args[0] === 'string' ? args[0] : JSON.stringify(args.length === 1 ? args[0] : args);
  _pushBuffer(level, tag, msg);

  if (!_shouldLog(level)) return;
  const key = `${level}:${tag}:${msg}`;
  const now = Date.now();
  const last = _last.get(key);
  if (last && (now - last.ts) < DEDUPE_WINDOW) {
    last.count++;
    _last.set(key, last);
    return; // suppress duplicate
  }

  // If there was a previous duplicate count, flush a summary
  if (last && last.count > 1) {
    const summary = `⤴️ (previous message repeated ${last.count} times)`;
    if (level === 'error') console.error(summary);
    else if (level === 'warn') console.warn(summary);
    else console.log(summary);
    _last.delete(key); // avoid double-reporting
  }

  // Print the actual message
  const prefix = {
    debug: '🐞 [DEBUG]',
    info: '📢 [INFO]',
    warn: '⚠️ [WARN]',
    error: '❌ [ERROR]'
  }[level] || '[LOG]';

  if (typeof window !== 'undefined') {
    // Browser: use console with styling for errors
    if (level === 'error') console.error(`${prefix} ${tag}`, ...args);
    else if (level === 'warn') console.warn(`${prefix} ${tag}`, ...args);
    else console.log(`${prefix} ${tag}`, ...args);
  } else {
    // Node: plain logging
    if (level === 'error') console.error(`${prefix} ${tag}`, ...args);
    else if (level === 'warn') console.warn(`${prefix} ${tag}`, ...args);
    else console.log(`${prefix} ${tag}`, ...args);
  }

  _last.set(key, { ts: now, count: 1 });
}

function getLogs(n = 200) {
  return _buffer.slice(-n);
}

export default {
  debug: (msg, tag = '') => _emit('debug', tag, msg),
  info: (msg, tag = '') => _emit('info', tag, msg),
  warn: (msg, tag = '') => _emit('warn', tag, msg),
  error: (msg, tag = '') => _emit('error', tag, msg),
  setLevel,
  getLogs
};
