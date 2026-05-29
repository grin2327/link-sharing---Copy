const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.sqlite');
let db = null;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Schema creation with security-focused tables
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT NOT NULL UNIQUE, 
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    url TEXT NOT NULL, 
    title TEXT NOT NULL,
    description TEXT DEFAULT '', 
    category_id INTEGER NOT NULL, 
    image_url TEXT DEFAULT '',
    date_posted TEXT DEFAULT (datetime('now')), 
    views INTEGER DEFAULT 0, 
    is_banned INTEGER DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);

  // Enhanced admin table with security fields
  db.run(`CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username TEXT NOT NULL UNIQUE, 
    password_hash TEXT NOT NULL,
    password_changed_at TEXT DEFAULT (datetime('now')),
    password_change_required INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // Login attempts tracking for brute force protection
  db.run(`CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    attempt_time TEXT DEFAULT (datetime('now')),
    success INTEGER DEFAULT 0,
    ip_address TEXT,
    user_agent TEXT
  )`);

  // Default admin setup - REQUIRE PASSWORD CHANGE ON FIRST LOGIN
  const adminRow = db.exec('SELECT COUNT(*) as count FROM admin');
  if (!adminRow.length || adminRow[0].values[0][0] === 0) {
    const tempPassword = process.env.ADMIN_PASSWORD || 'TempPassword123!@';
    if (!tempPassword.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/)) {
      console.warn('⚠️  WARNING: ADMIN_PASSWORD does not meet security requirements!');
    }
    db.run(
      'INSERT INTO admin (username, password_hash, password_change_required) VALUES (?, ?, 1)',
      ['admin', bcrypt.hashSync(tempPassword, 12)]
    );
    console.log('🔐 Admin account created. Password change is REQUIRED on first login.');
  }

  const catRow = db.exec('SELECT COUNT(*) as count FROM categories');
  if (!catRow.length || catRow[0].values[0][0] === 0) {
    for (const name of ['Dress','Shoes','Gaming','Anime','Movies','Music','Technology','Social Media','Education','Other']) {
      try { 
        db.run('INSERT INTO categories (name) VALUES (?)', [name]); 
      } catch {}
    }
  }

  save();
}

function save() {
  if (db) {
    try {
      fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
    } catch (err) {
      console.error('Database save error:', err);
    }
  }
}

// Parameterized query execution
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const rows = query(sql, params);
  return rows.length ? rows[0] : null;
}

function lastId() {
  return db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
}

module.exports = {
  async init() { await init(); },

  get categories() { 
    return query('SELECT * FROM categories ORDER BY name ASC'); 
  },

  get links() { 
    return query('SELECT * FROM links ORDER BY date_posted DESC'); 
  },

  // Database-side search with parameterized queries
  searchLinks({ search, category, sort, limit, offset }) {
    let sql = `SELECT l.*, c.name as category_name FROM links l 
               JOIN categories c ON l.category_id = c.id 
               WHERE l.is_banned = 0`;
    const params = [];

    if (search) {
      sql += ` AND (l.title LIKE ? OR l.description LIKE ? OR l.url LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard);
    }

    if (category) {
      sql += ` AND c.name = ?`;
      params.push(category);
    }

    sql += sort === 'oldest' ? ` ORDER BY l.date_posted ASC` : ` ORDER BY l.date_posted DESC`;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    return query(sql, params);
  },

  getLinkCount({ search, category }) {
    let sql = `SELECT COUNT(*) as count FROM links l JOIN categories c ON l.category_id = c.id WHERE l.is_banned = 0`;
    const params = [];

    if (search) {
      sql += ` AND (l.title LIKE ? OR l.description LIKE ? OR l.url LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard);
    }
    if (category) {
      sql += ` AND c.name = ?`;
      params.push(category);
    }

    const result = get(sql, params);
    return result ? result.count : 0;
  },

  addLink({ url, title, description, category_id, image_url }) {
    db.run('INSERT INTO links (url, title, description, category_id, image_url) VALUES (?, ?, ?, ?, ?)',
      [url, title, description || '', parseInt(category_id), image_url || '']);
    const id = lastId();
    save();
    return get('SELECT * FROM links WHERE id = ?', [id]);
  },

  deleteLink(id) {
    db.run('DELETE FROM links WHERE id = ?', [parseInt(id)]);
    save();
  },

  banLink(id) {
    db.run('UPDATE links SET is_banned = 1 WHERE id = ?', [parseInt(id)]);
    save();
  },

  unbanLink(id) {
    db.run('UPDATE links SET is_banned = 0 WHERE id = ?', [parseInt(id)]);
    save();
  },

  incrementViews(id) {
    db.run('UPDATE links SET views = views + 1 WHERE id = ?', [parseInt(id)]);
    save();
  },

  getCategoryName(id) {
    const row = get('SELECT name FROM categories WHERE id = ?', [parseInt(id)]);
    return row ? row.name : 'Unknown';
  },

  addCategory(name) {
    try {
      db.run('INSERT INTO categories (name) VALUES (?)', [name]);
      const id = lastId();
      save();
      return get('SELECT * FROM categories WHERE id = ?', [id]);
    } catch { 
      return null; 
    }
  },

  updateCategory(id, name) {
    try {
      db.run('UPDATE categories SET name = ? WHERE id = ?', [name, parseInt(id)]);
      save();
      return true;
    } catch { 
      return false; 
    }
  },

  deleteCategory(id) {
    const row = get('SELECT COUNT(*) as count FROM links WHERE category_id = ?', [parseInt(id)]);
    const count = row ? row.count : 0;
    if (count > 0) return count;
    db.run('DELETE FROM categories WHERE id = ?', [parseInt(id)]);
    save();
    return 0;
  },

  // ============= AUTHENTICATION & SECURITY =============

  verifyAdmin(username, password) {
    const admin = get('SELECT * FROM admin WHERE username = ?', [username]);
    if (!admin) return false;
    return bcrypt.compareSync(password, admin.password_hash);
  },

  updateAdminPassword(username, newPassword) {
    const hashedPassword = bcrypt.hashSync(newPassword, 12);
    db.run(
      'UPDATE admin SET password_hash = ?, password_changed_at = datetime("now"), password_change_required = 0 WHERE username = ?',
      [hashedPassword, username]
    );
    save();
  },

  isPasswordChangeRequired(username) {
    const admin = get('SELECT password_change_required FROM admin WHERE username = ?', [username]);
    return admin ? admin.password_change_required === 1 : false;
  },

  clearPasswordChangeFlag(username) {
    db.run('UPDATE admin SET password_change_required = 0 WHERE username = ?', [username]);
    save();
  },

  // ============= LOGIN ATTEMPT TRACKING =============

  async recordLoginAttempt(username) {
    db.run(
      'INSERT INTO login_attempts (username, success) VALUES (?, 0)',
      [username]
    );
    save();
    
    const recentAttempts = get(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE username = ? AND attempt_time > datetime('now', '-15 minutes') AND success = 0`,
      [username]
    );
    return recentAttempts ? recentAttempts.count : 0;
  },

  async clearLoginAttempts(username) {
    db.run('DELETE FROM login_attempts WHERE username = ? AND success = 0', [username]);
    db.run(
      'UPDATE admin SET last_login = datetime("now") WHERE username = ?',
      [username]
    );
    save();
  },

  async isAccountLocked(username) {
    const attempts = get(
      `SELECT COUNT(*) as count FROM login_attempts 
       WHERE username = ? AND attempt_time > datetime('now', '-15 minutes') AND success = 0`,
      [username]
    );
    
    if (attempts && attempts.count > 5) {
      return Date.now() + (15 * 60 * 1000); // Locked for 15 minutes
    }
    return null;
  },

  // ============= STATISTICS =============

  getStats() {
    const total = get('SELECT COUNT(*) as count FROM links');
    const cats = get('SELECT COUNT(*) as count FROM categories');
    const banned = get('SELECT COUNT(*) as count FROM links WHERE is_banned = 1');
    return {
      total_links: total ? total.count : 0,
      total_categories: cats ? cats.count : 0,
      banned_links: banned ? banned.count : 0
    };
  }
};