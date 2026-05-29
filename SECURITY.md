# 🔒 Security Documentation

## Overview
This LinkVault application has been hardened against common web attacks and vulnerabilities. This document outlines all security measures implemented and best practices for deployment.

---

## 🛡️ Security Features Implemented

### 1. **Authentication & Authorization**

#### Strong Password Requirements
- Minimum 11 characters
- Must contain: uppercase, lowercase, number, and special character (@$!%*?&)
- Passwords are hashed using bcryptjs (cost factor: 11)
- Password change **required** on first admin login

#### Session Management
- Session ID regeneration after login (prevents session fixation attacks)
- HttpOnly cookies (prevents XSS access to session tokens)
- Secure cookie flag enabled in production (HTTPS only)
- SameSite=Strict (prevents CSRF attacks)
- 24-hour session timeout

#### Account Lockout
- Failed login attempts tracked in database
- Account locked after 5 failed attempts within 15 minutes
- Automatic unlock after 15-minute lockdown period

---

### 2. **Rate Limiting**

#### Global Rate Limiting
- 100 requests per 15-minute window per IP
- Protects against DDoS and automated attacks

#### Login Endpoint Protection
- 5 login attempts per 15 minutes (strict)
- Failed attempts are counted (successful logins don't reset counter)
- Returns 429 status code when limit exceeded

---

### 3. **Input Validation & Sanitization**

#### Server-Side Validation
- All inputs validated using express-validator
- URL format validation (must start with http:// or https://)
- Length limits enforced:
  - Title: 1-500 characters
  - Description: 0-2000 characters
  - URLs: 0-2048 characters
  - Category name: 1-100 characters
  - Search query: 0-200 characters

#### Output Encoding
- All user-supplied data HTML-encoded before output
- Prevents XSS attacks through data injection

#### SQL Injection Prevention
- **All database queries use parameterized statements**
- No string concatenation in SQL queries
- Input validation before database operations

---

### 4. **Security Headers (Helmet.js)**

```
- Content-Security-Policy: Restricts resource loading
- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff (prevents MIME sniffing)
- X-XSS-Protection: Enabled
- Strict-Transport-Security: HSTS headers (1 year max-age)
- Referrer-Policy: strict-origin-when-cross-origin
```

---

### 5. **CORS Protection**

- CORS explicitly configured
- Only allows requests from configured origin
- Credentials required for cross-origin requests
- Prevents unauthorized cross-origin data access

---

### 6. **Error Handling**

- Generic error messages in production (no sensitive details leaked)
- Detailed error logging on server side
- No stack traces exposed to clients
- Proper HTTP status codes returned

---

### 7. **Database Security**

#### Schema with Security Fields
```sql
-- Admin table tracks password changes and login history
admin (id, username, password_hash, password_changed_at, 
       password_change_required, last_login, created_at)

-- Login attempts tracked for audit and lockout
login_attempts (id, username, attempt_time, success, 
                ip_address, user_agent)
```

#### Bcrypt Password Hashing
- Cost factor: 12 (high security, slower but safer)
- Salted hashes prevent rainbow table attacks

---

### 8. **File Upload Restrictions**

- No file uploads accepted by server
- Image URLs are validated and sanitized
- Images loaded from external sources only
- No arbitrary file execution

---

## 🔧 Environment Configuration

### Required .env Variables

Create a `.env` file in the project root:

```bash
# Security - MUST CHANGE THESE!
SESSION_SECRET=your-extremely-long-random-secret-key-change-this-in-production
ADMIN_PASSWORD=ChangeMe123!@Strong

# Server
PORT=3000
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_ATTEMPT_LIMIT=5
LOGIN_LOCKOUT_DURATION_MS=900000

# HTTPS Configuration
FORCE_HTTPS=true
SECURE_COOKIE=true

# CORS
CORS_ORIGIN=https://your-domain.com
```

### ⚠️ CRITICAL: First-Time Setup

1. Copy `.env.example` to `.env`
2. **Change ALL security values** (SESSION_SECRET, ADMIN_PASSWORD, etc.)
3. Use strong random values:
   ```bash
   # Generate session secret on Linux/Mac:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

---

## 🚀 Production Deployment Checklist

- [ ] `.env` file created with production values
- [ ] `NODE_ENV=production` set in environment
- [ ] `SECURE_COOKIE=true` enabled
- [ ] HTTPS/SSL certificate configured
- [ ] `CORS_ORIGIN` set to your domain
- [ ] SESSION_SECRET is cryptographically random (32+ bytes)
- [ ] ADMIN_PASSWORD changed from default
- [ ] Database backed up before deployment
- [ ] Firewall rules configured
- [ ] Regular security updates scheduled
- [ ] Monitoring/logging configured
- [ ] Backup strategy implemented

---

## 🔐 Authentication Flow

```
1. User submits username + password
2. Password checked against bcrypt hash in database
3. Failed attempts logged
4. After 5 failures in 15 min → account locked
5. Successful login triggers session regeneration
6. Check if password change required
7. If required, force password change before access
8. Session ID stored in httpOnly cookie
9. Subsequent requests validated via session
```

---

## 🛡️ Attack Prevention

### SQL Injection
✅ **Prevented** - Parameterized queries with sql.js
```javascript
// SAFE - uses parameterized query
query('SELECT * FROM users WHERE id = ?', [userId])

// UNSAFE - never do this!
query(`SELECT * FROM users WHERE id = ${userId}`)
```

### Cross-Site Scripting (XSS)
✅ **Prevented** - Output encoding + CSP headers
```javascript
// User input automatically HTML-escaped
userInput = "<script>alert('xss')</script>"
// Stored/rendered as: &lt;script&gt;alert('xss')&lt;/script&gt;
```

### Cross-Site Request Forgery (CSRF)
✅ **Prevented** - SameSite=Strict cookies
- Cookies only sent on same-site requests
- Attackers cannot forge requests from other domains

### Session Fixation
✅ **Prevented** - Session regeneration on login
- New session ID issued after authentication
- Old session invalidated

### Brute Force Attacks
✅ **Prevented** - Login rate limiting + account lockout
- 5 attempts per 15 minutes
- Account locked after threshold

### Clickjacking
✅ **Prevented** - X-Frame-Options: DENY
- Page cannot be embedded in iframes

### MIME Type Sniffing
✅ **Prevented** - X-Content-Type-Options: nosniff
- Browser respects Content-Type header

---

## 📊 Logging & Monitoring

### Login Attempts Table
All login attempts are logged:
- Username
- Attempt timestamp
- Success/failure
- IP address (when available)
- User agent

**Query to check recent failed attempts:**
```sql
SELECT * FROM login_attempts 
WHERE username = 'admin' 
AND success = 0 
AND attempt_time > datetime('now', '-24 hours')
ORDER BY attempt_time DESC;
```

---

## 🔄 Password Management

### Changing Admin Password

1. Go to Admin Panel
2. On first login, password change is **mandatory**
3. Enter current password
4. Enter new password (must meet requirements)
5. Confirm new password
6. Password updated in database

**Password Requirements:**
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

### Resetting Admin Password

If password is forgotten:
1. Reset the database (`data.sqlite` file)
2. Or modify `db.js` temporarily to set a new hash
3. Restart server

---

## 🧪 Testing Security

### Test Rate Limiting
```bash
# Should fail after 5 attempts
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
done
```

### Test Input Validation
```bash
# Try XSS injection in link title
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://example.com",
    "title":"<script>alert(\"xss\")</script>",
    "category_id": 1
  }'
# Should be sanitized/rejected
```

### Test SQL Injection Prevention
```bash
# Try SQL injection in search
curl "http://localhost:3000/api/links?search=test' OR '1'='1"
# Parameterized queries prevent this
```

---

## 🔍 Security Best Practices

### For Administrators

1. **Change Password Immediately** - Don't use default credentials
2. **Use Strong Passwords** - Follow the 12+ char requirement
3. **Regular Backups** - Back up `data.sqlite` regularly
4. **Monitor Login Attempts** - Check for suspicious activity
5. **Keep Server Updated** - Update Node.js and packages
6. **Use HTTPS** - Always enable SSL/TLS in production
7. **Restrict Access** - Use firewall rules to limit access
8. **Log Rotation** - Archive and rotate logs regularly
9. **Security Updates** - Subscribe to security advisories

### For Deployment

1. Run behind reverse proxy (nginx, Apache)
2. Enable SSL/TLS certificates (Let's Encrypt)
3. Set up WAF (Web Application Firewall)
4. Enable VPN for admin panel access (optional)
5. Use environment variables for secrets (not in code)
6. Implement automated backups
7. Set up monitoring/alerting
8. Use strong host credentials
9. Keep firewall rules strict
10. Regular security audits

---

## 🚨 Security Incidents

### What to Do If Compromised

1. **Immediate Actions:**
   - Take server offline
   - Change all credentials
   - Review logs for suspicious activity
   - Check database for unauthorized data changes

2. **Investigation:**
   - Analyze login_attempts table
   - Check web server logs
   - Review database audit logs
   - Look for unauthorized file changes

3. **Recovery:**
   - Restore from clean backup
   - Reset all passwords
   - Update dependencies for patches
   - Re-enable server with new credentials

4. **Post-Incident:**
   - Document incident details
   - Implement preventive measures
   - Notify users if data was exposed
   - Update security policies

---

## 📚 References

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Node.js Security**: https://nodejs.org/en/docs/guides/security/
- **Express Security**: https://expressjs.com/en/advanced/best-practice-security.html
- **NIST Guidelines**: https://csrc.nist.gov/publications/detail/sp/800-63-3/final

---

## 📞 Security Contact

If you discover a security vulnerability, please report it responsibly:

1. Do NOT post publicly on social media
2. Do NOT create public GitHub issues
3. Email security details to the maintainer
4. Allow time for patch development
5. Coordinate responsible disclosure

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-05-29 | Complete security hardening |
| 1.0 | - | Initial release |

---

**Last Updated:** May 29, 2026
**Security Level:** ⭐⭐⭐⭐ (Enterprise-Grade)
