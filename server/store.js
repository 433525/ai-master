'use strict';

const { DatabaseSync } = require('node:sqlite');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

function emptyState() {
  return { profile: null, plan: null, progress: {}, attempts: [], wrongAnswers: [], diagnostic: null };
}

function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL,
      login TEXT UNIQUE, password TEXT, state TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL
      REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS quizzes(id TEXT PRIMARY KEY, user_id TEXT NOT NULL
      REFERENCES users(id), data TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const publicUser = row => ({ id: row.id, name: row.name, isGuest: !row.login });
  const get = id => db.prepare('SELECT * FROM users WHERE id=?').get(id);
  const state = id => JSON.parse(get(id).state);
  const save = (id, value) => db.prepare('UPDATE users SET state=? WHERE id=?').run(JSON.stringify(value), id);
  function createSession(id) {
    const token = randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token, id, Date.now() + 30 * 86400000);
    return token;
  }
  function guest() {
    const id = randomUUID();
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id, '本机访客', null, null, JSON.stringify(emptyState()), new Date().toISOString());
    return { user: publicUser(get(id)), token: createSession(id) };
  }
  function register(id, name, password) {
    const row = get(id);
    if (row.login) throw Object.assign(new Error('请先退出当前账号，再创建新账号。'), { status: 409 });
    const login = name.normalize('NFKC').toLocaleLowerCase();
    if (db.prepare('SELECT id FROM users WHERE login=?').get(login)) {
      throw Object.assign(new Error('这个昵称已被使用。'), { status: 409 });
    }
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    db.prepare('UPDATE users SET name=?,login=?,password=? WHERE id=?').run(name, login, salt + ':' + hash, id);
    return publicUser(get(id));
  }
  function login(name, password) {
    const row = db.prepare('SELECT * FROM users WHERE login=?').get(name.normalize('NFKC').toLocaleLowerCase());
    const [salt, hash] = row?.password?.split(':') || ['invalid-login', '00'.repeat(64)];
    const actual = scryptSync(password, salt, 64);
    if (!timingSafeEqual(actual, Buffer.from(hash, 'hex')) || !row) {
      throw Object.assign(new Error('昵称或密码不正确。'), { status: 401 });
    }
    return { user: publicUser(row), token: createSession(row.id) };
  }
  return {
    db, state, save, guest, register, login, createSession,
    user: id => publicUser(get(id)),
    session(token) {
      const row = db.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(token || '', Date.now());
      return row ? publicUser(get(row.user_id)) : null;
    },
    endSession: token => db.prepare('DELETE FROM sessions WHERE token=?').run(token || ''),
    putQuiz(id, userId, data) {
      db.prepare('DELETE FROM quizzes WHERE created_at < ?').run(Date.now() - 86400000);
      db.prepare('INSERT OR REPLACE INTO quizzes VALUES(?,?,?,?)').run(id, userId, JSON.stringify(data), Date.now());
    },
    quiz(id, userId) {
      const row = db.prepare('SELECT data FROM quizzes WHERE id=? AND user_id=? AND created_at>?').get(id, userId, Date.now() - 86400000);
      return row ? JSON.parse(row.data) : null;
    },
    config() { return JSON.parse(db.prepare("SELECT value FROM settings WHERE key='ai'").get()?.value || '{}'); },
    saveConfig(value) { db.prepare("INSERT OR REPLACE INTO settings VALUES('ai',?)").run(JSON.stringify(value)); },
    close: () => db.close()
  };
}

module.exports = { openStore, emptyState };
