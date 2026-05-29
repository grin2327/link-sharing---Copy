# 🔐 Quick Reference Guide - Security Features

## 🚀 Getting Started (Copy & Paste Commands)

### 1. Initialize Project
```bash
npm install
cp .env.example .env
```

### 2. Generate Secure Session Secret
```bash
# Linux/Mac:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Windows PowerShell:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Edit `.env` File
```bash
SESSION_SECRET=<paste the generated value above>
ADMIN_PASSWORD=<create a password: min 12 chars, 1 upper, 1 lower, 1 number, 1 special>
NODE_ENV=production
SECURE_COOKIE=true
CORS_ORIGIN=https://your-domain.com
```

### 4. Start Server
```bash
npm start      # Production
npm run dev    # Development (auto-reload)
```

---

## 🔑 Admin Password Requirements

```
Minimum 12 characters
Must include:
  ✓ At least 1 UPPERCASE letter (A-Z)
  ✓ At least 1 lowercase letter (a-z)
  ✓ At least 1 Number (0-9)
  ✓ At least 1 Special character (@$!%*?&)

Valid Examples:
  ✓ MyPassword123!
  ✓ SecureP@ss2024
  ✓ LinkVault$2026Admin
  ✓ P@ssw0rd!Secure

Invalid Examples:
  ✗ password          (no uppercase, number, special char)
  ✗ Password123       (no special character)
  ✗ P@ssw0rd          (11 characters - too short)
  ✗ PASSWORD123!      (no lowercase letters)
```

---

## 📊 API Quick Reference

### Public Endpoints (No Auth Required)
```bash
# Get all categories
curl http://localhost:3000/api/categories

# Search links with pagination
curl "http://localhost:3000/api/links?search=nodejs&page=1&limit=20"

# Get trending links
curl http://localhost:3000/api/links/trending

# Submit new link
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "title": "Example Link",
    "description": "A useful link",
    "category_id": 1,
    "image_url": "https://example.com/image.jpg"
  }'
```

### Admin Endpoints (Authentication Required)
```bash
# Login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "YourPassword123!"}'

# Get admin status
curl -b "linkVaultSession=<session_id>" \
  http://localhost:3000/api/admin/me

# Change password
curl -X POST http://localhost:3000/api/admin/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword456@"
  }'

# Logout
curl -X POST http://localhost:3000/api/admin/logout
```

---

## 🛡️ Security Features Checklist

| Feature | Status | Details |
|---------|--------|---------|
| SQL Injection Prevention | ✅ | Parameterized queries |
| XSS Protection | ✅ | HTML encoding + CSP |
| CSRF Protection | ✅ | SameSite cookies |
| Brute Force Protection | ✅ | 5 attempts → lockout |
| Rate Limiting | ✅ | 100 req/15 min |
| Password Hashing | ✅ | Bcrypt (cost: 12) |
| Session Security | ✅ | HttpOnly, SameSite |
| HTTPS Support | ✅ | Enforced in prod |
| Input Validation | ✅ | Server-side |
| Error Handling | ✅ | Generic messages |

---

## 🚨 Emergency Commands

### Unlock Admin Account
```bash
# If account is locked due to failed attempts, wait 15 minutes
# Or access database directly:

# View database (if you have sqlite3):
sqlite3 data.sqlite "SELECT * FROM login_attempts WHERE username='admin';"

# Clear failed login attempts:
sqlite3 data.sqlite "DELETE FROM login_attempts WHERE username='admin' AND success=0;"
```

### Reset Admin Password
```bash
# Option 1: Delete database (loses all data)
rm data.sqlite

# Option 2: Restore from backup
cp data.sqlite.backup data.sqlite

# Option 3: Modify database directly
sqlite3 data.sqlite "UPDATE admin SET password_hash='<new_hash>' WHERE username='admin';"
```

### Database Backup & Restore
```bash
# Backup
cp data.sqlite data.sqlite.backup

# Restore
cp data.sqlite.backup data.sqlite

# Automated backup (add to crontab)
0 2 * * * cp /path/to/data.sqlite /path/to/backups/data.sqlite.$(date +\%Y\%m\%d)
```

---

## 🔍 Monitoring & Logging

### Check Login Attempts
```bash
# View recent login attempts (requires sqlite3):
sqlite3 data.sqlite "SELECT * FROM login_attempts ORDER BY attempt_time DESC LIMIT 20;"

# View failed login attempts:
sqlite3 data.sqlite "SELECT * FROM login_attempts WHERE success=0 ORDER BY attempt_time DESC LIMIT 10;"

# Count failed attempts per username:
sqlite3 data.sqlite "SELECT username, COUNT(*) as failed_attempts FROM login_attempts WHERE success=0 GROUP BY username;"
```

### Check Admin Account Status
```bash
sqlite3 data.sqlite "SELECT username, last_login, password_changed_at FROM admin;"
```

---

## 🧪 Test Attacks

### Test 1: SQL Injection (Should be Safe)
```bash
curl "http://localhost:3000/api/links?search=test'; DROP TABLE links; --"
# Result: Safe - treated as literal text search
```

### Test 2: XSS Injection (Should be Safe)
```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://example.com",
    "title":"<img src=x onerror=alert(\"xss\")>",
    "category_id": 1
  }'
# Result: Safe - HTML-encoded in database and output
```

### Test 3: Rate Limiting (Should Block After 5 Attempts)
```bash
for i in {1..10}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}' -w "\nStatus: %{http_code}\n"
  sleep 1
done
# Result: After 5 attempts, returns 429 Too Many Requests
```

### Test 4: Session Hijacking (Should Fail)
```bash
# Get valid session cookie
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourPassword123!"}' -c cookies.txt

# Try to use session from different origin (should work but demonstrate SameSite)
curl -b cookies.txt http://localhost:3000/api/admin/me

# Result: Session works, but only because same-origin
```

---

## 📋 Environment Variables Reference

```bash
# Security (CRITICAL - Change These!)
SESSION_SECRET=<64-char hex string>
ADMIN_PASSWORD=<Strong password>

# Server Configuration
PORT=3000
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # Per window
LOGIN_ATTEMPT_LIMIT=5              # Attempts before lockout
LOGIN_LOCKOUT_DURATION_MS=900000   # 15 minutes

# Security Settings
SECURE_COOKIE=true                 # HTTPS only in production
FORCE_HTTPS=true                   # Redirect HTTP to HTTPS

# CORS Configuration
CORS_ORIGIN=https://your-domain.com
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist
```bash
# 1. Generate new SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Create strong ADMIN_PASSWORD (12+ chars, complex)
# 3. Set NODE_ENV=production
# 4. Set SECURE_COOKIE=true
# 5. Set CORS_ORIGIN to your domain

# 6. Update dependencies
npm audit fix

# 7. Backup database
cp data.sqlite data.sqlite.prod.backup

# 8. Test on staging
npm start

# 9. Generate HTTPS certificates
# Using Let's Encrypt:
sudo certbot certonly --standalone -d your-domain.com

# 10. Configure reverse proxy (nginx)
# See SECURITY.md for nginx configuration

# 11. Start in production
NODE_ENV=production npm start
```

---

## 📞 Security Issues Found?

1. **Do NOT** post publicly
2. **Do NOT** create public GitHub issues
3. **Do NOT** share on social media
4. **Contact** maintainer privately
5. **Allow time** for patch development
6. **Coordinate** responsible disclosure

---

## 🔗 Useful Links

- [Node.js Security Guide](https://nodejs.org/en/docs/guides/security/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)

---

## 💾 Database Queries

### View All Users
```sql
SELECT id, username, last_login, password_changed_at FROM admin;
```

### View Recent Login Attempts
```sql
SELECT * FROM login_attempts 
ORDER BY attempt_time DESC 
LIMIT 50;
```

### Check Account Lockout Status
```sql
SELECT username, COUNT(*) as recent_failures 
FROM login_attempts 
WHERE success = 0 
AND attempt_time > datetime('now', '-15 minutes')
GROUP BY username;
```

### Clear All Failed Login Attempts
```sql
DELETE FROM login_attempts WHERE success = 0;
```

### View Total Links by Category
```sql
SELECT c.name, COUNT(l.id) as count 
FROM categories c 
LEFT JOIN links l ON c.id = l.category_id 
GROUP BY c.id, c.name;
```

---

## 🎯 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Port 3000 already in use" | Another process using port | `lsof -i :3000` or change PORT |
| "Cannot read .env" | File missing or wrong path | `cp .env.example .env` |
| "Invalid credentials" | Wrong password | Check ADMIN_PASSWORD in .env |
| "Account locked" | Too many failed attempts | Wait 15 minutes or clear login_attempts |
| "Cannot reach server" | Server not running | Run `npm start` |
| "CORS error" | CORS_ORIGIN mismatch | Update CORS_ORIGIN in .env |

---

**Last Updated:** May 29, 2026  
**Version:** 2.0  
**Status:** ✅ Production Ready
