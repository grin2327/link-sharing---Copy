require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { body, query, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============= SECURITY MIDDLEWARE =============

// Helmet for security headers (XSS, clickjacking, MIME sniffing protection)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameGuard: { action: 'deny' },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: false }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: false,
}));

// Rate limiting - Global
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => NODE_ENV === 'development',
});
app.use(limiter);

// Strict rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_ATTEMPT_LIMIT) || 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: false,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Session configuration - HARDENED
app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    console.warn('⚠️ WARNING: SESSION_SECRET not set in .env file!');
    return 'default-dev-key-change-in-production';
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: NODE_ENV === 'production' || process.env.SECURE_COOKIE === 'true',
    sameSite: 'strict',
    domain: undefined,
  },
  name: 'linkVaultSession',
}));

// Regenerate session ID after login to prevent fixation attacks
const regenerateSession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// ============= SECURITY UTILITIES =============

function sanitize(str) {
  if (!str) return '';
  return String(str).replace(/[<>&"']/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function validatePassword(password) {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
  return re.test(password);
}

function validateUrl(urlString) {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

// ============= MIDDLEWARE FUNCTIONS =============

function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Unauthorized: Admin session required' });
  }
  next();
}

// ============= PUBLIC API ROUTES =============

app.get('/api/categories', (req, res) => {
  try {
    const categories = db.categories;
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Search links with pagination
app.get('/api/links', [
  query('search').optional().trim().isLength({ max: 200 }),
  query('category').optional().trim().isLength({ max: 100 }),
  query('page').optional().isInt({ min: 1, max: 10000 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['newest', 'oldest']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const search = (req.query.search || '').substring(0, 200);
    const category = (req.query.category || '').substring(0, 100);
    const sort = req.query.sort || 'newest';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const links = db.searchLinks({ search, category, sort, limit, offset });
    const total = db.getLinkCount({ search, category });

    res.json({
      links: links.map(l => ({
        ...l,
        url: sanitize(l.url),
        title: sanitize(l.title),
        description: sanitize(l.description),
        category_name: sanitize(l.category_name),
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/links/trending', (req, res) => {
  try {
    const links = db.links
      .filter(l => !l.is_banned)
      .sort((a, b) => b.views - a.views || new Date(b.date_posted) - new Date(a.date_posted))
      .slice(0, 8)
      .map(l => ({
        ...l,
        url: sanitize(l.url),
        title: sanitize(l.title),
        description: sanitize(l.description),
        category_name: sanitize(db.getCategoryName(l.category_id)),
      }));
    res.json(links);
  } catch (error) {
    console.error('Error fetching trending:', error);
    res.status(500).json({ error: 'Failed to fetch trending links' });
  }
});

// Submit a new link
app.post('/api/links', [
  body('url').trim().isURL().withMessage('Invalid URL format'),
  body('title').trim().isLength({ min: 1, max: 500 }).withMessage('Title must be 1-500 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description too long'),
  body('category_id').isInt().withMessage('Invalid category'),
  body('image_url').optional().trim().isLength({ max: 2000 }).withMessage('Image URL too long'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { url, title, description, category_id, image_url } = req.body;

    if (!validateUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const catExists = db.categories.find(c => c.id === parseInt(category_id));
    if (!catExists) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const link = db.addLink({
      url: url.substring(0, 2048),
      title: title.substring(0, 500),
      description: (description || '').substring(0, 2000),
      category_id: parseInt(category_id),
      image_url: (image_url || '').substring(0, 2048),
    });

    res.status(201).json({
      ...link,
      url: sanitize(link.url),
      title: sanitize(link.title),
      description: sanitize(link.description),
    });
  } catch (error) {
    console.error('Error adding link:', error);
    res.status(500).json({ error: 'Failed to add link' });
  }
});

// Record link view
app.post('/api/links/:id/view', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid link ID' });
    }
    db.incrementViews(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording view:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// ============= ADMIN AUTHENTICATION ROUTES =============

// Admin login with brute force protection
app.post('/api/admin/login', loginLimiter, [
  body('username').trim().isLength({ min: 1, max: 100 }),
  body('password').trim().isLength({ min: 8, max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  try {
    const { username, password } = req.body;

    const attemptCount = await db.recordLoginAttempt(username);

    if (attemptCount > parseInt(process.env.LOGIN_ATTEMPT_LIMIT || 5)) {
      const lockedUntil = await db.isAccountLocked(username);
      if (lockedUntil) {
        return res.status(429).json({
          error: 'Account temporarily locked due to multiple failed login attempts. Try again later.',
          lockedUntil,
        });
      }
    }

    if (!db.verifyAdmin(username, password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await db.clearLoginAttempts(username);

    await regenerateSession(req);

    req.session.adminId = 1;
    req.session.username = username;
    req.session.loginTime = Date.now();
    req.session.passwordChangeRequired = await db.isPasswordChangeRequired(username);

    res.json({
      success: true,
      username,
      passwordChangeRequired: req.session.passwordChangeRequired,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin logout
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('linkVaultSession');
    res.json({ success: true });
  });
});

// Check admin session
app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({
    username: req.session.username,
    passwordChangeRequired: req.session.passwordChangeRequired,
  });
});

// Change admin password (REQUIRED after first login)
app.post('/api/admin/change-password', requireAdmin, [
  body('currentPassword').trim().isLength({ min: 8 }),
  body('newPassword').trim().custom((value) => {
    if (!validatePassword(value)) {
      throw new Error('Password must be at least 12 characters with uppercase, lowercase, number, and special character');
    }
    return true;
  }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!db.verifyAdmin(req.session.username, currentPassword)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    db.updateAdminPassword(req.session.username, newPassword);
    await db.clearPasswordChangeFlag(req.session.username);

    req.session.passwordChangeRequired = false;
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============= ADMIN LINKS MANAGEMENT =============

app.get('/api/admin/links', requireAdmin, (req, res) => {
  try {
    const links = db.links
      .map(l => ({
        ...l,
        category_name: db.getCategoryName(l.category_id),
      }))
      .sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted))
      .slice(0, 500);

    res.json({
      links: links.map(l => ({
        ...l,
        url: sanitize(l.url),
        title: sanitize(l.title),
      })),
      stats: db.getStats(),
    });
  } catch (error) {
    console.error('Error fetching admin links:', error);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

app.delete('/api/admin/links/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid link ID' });
    }
    db.deleteLink(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

app.post('/api/admin/links/:id/ban', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid link ID' });
    }
    db.banLink(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error banning link:', error);
    res.status(500).json({ error: 'Failed to ban link' });
  }
});

app.post('/api/admin/links/:id/unban', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid link ID' });
    }
    db.unbanLink(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unbanning link:', error);
    res.status(500).json({ error: 'Failed to unban link' });
  }
});

// ============= ADMIN CATEGORIES MANAGEMENT =============

app.get('/api/admin/categories', requireAdmin, (req, res) => {
  try {
    const cats = db.categories.map(c => ({
      ...c,
      name: sanitize(c.name),
      link_count: db.links.filter(l => l.category_id === c.id && !l.is_banned).length,
    }));
    res.json(cats);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/admin/categories', requireAdmin, [
  body('name').trim().isLength({ min: 1, max: 100 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const cat = db.addCategory(req.body.name);
    if (!cat) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    res.status(201).json({
      ...cat,
      name: sanitize(cat.name),
    });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Failed to add category' });
  }
});

app.put('/api/admin/categories/:id', requireAdmin, [
  body('name').trim().isLength({ min: 1, max: 100 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const ok = db.updateCategory(id, req.body.name);
    if (!ok) {
      return res.status(409).json({ error: 'Category not found or name already exists' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const result = db.deleteCategory(id);
    if (result > 0) {
      return res.status(400).json({
        error: `Cannot delete category: ${result} link(s) still assigned`,
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ============= ERROR HANDLING =============

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid request token' });
  }

  res.status(500).json({
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ============= SERVER STARTUP =============

db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🔒 Secure Link Sharing Platform running on http://localhost:${PORT}`);
      console.log(`🔐 Environment: ${NODE_ENV}`);
      console.log(`📋 Make sure to set SESSION_SECRET in .env file\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Critical startup failure:', err);
    process.exit(1);
  });

module.exports = app;