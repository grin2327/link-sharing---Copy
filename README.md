# 🔒 LinkVault - Secure Link Sharing Platform

A permanent link-sharing platform with categories, admin panel, and **enterprise-grade security** to protect against all types of hackers (beginner to professional level).

## 🚀 Features

✅ **Public Link Sharing** - Share links by category
✅ **Trending Links** - Automatic trending calculation
✅ **Admin Dashboard** - Manage links and categories
✅ **Search & Filter** - Find links by title, description, or URL
✅ **Link Banning** - Remove malicious content
✅ **Category Management** - Organize links efficiently

---

## 🔐 Security Features

- **Brute Force Protection** - Account lockout after 5 failed attempts
- **Strong Password Enforcement** - 12+ chars with complexity requirements
- **SQL Injection Prevention** - Parameterized queries for all database operations
- **XSS Protection** - HTML encoding + Content Security Policy headers
- **CSRF Prevention** - SameSite strict cookies
- **Rate Limiting** - Global and per-endpoint rate limiting
- **Session Security** - Session ID regeneration, HttpOnly cookies, HSTS headers
- **Input Validation** - Strict server-side validation for all inputs
- **Error Handling** - Generic error messages (no information disclosure)
- **SSL/TLS Support** - Full HTTPS support for production

---

## 📋 Prerequisites

- Node.js 16+ (LTS recommended)
- npm or yarn
- 50MB disk space minimum

---

## ⚙️ Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment Configuration

```bash
cp .env.example .env
```

### 3. Update .env File

Edit `.env` and change these critical values:

```bash
# GENERATE STRONG RANDOM SECRETS!
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ADMIN_PASSWORD=<Strong Password with 12+ chars, uppercase, lowercase, number, special char>
NODE_ENV=production
SECURE_COOKIE=true
CORS_ORIGIN=https://your-domain.com
```

**⚠️ IMPORTANT:**
- Never commit `.env` to version control
- Use cryptographically random values
- Change these values for each deployment

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will run on http://localhost:3000

---

## 🎯 First-Time Admin Setup

1. Navigate to http://localhost:3000/admin.html
2. Login with:
   - Username: `admin`
   - Password: (from ADMIN_PASSWORD in .env)
3. **Change Password Immediately** (enforced on first login)
4. Create strong new password following requirements:
   - Minimum 12 characters
   - Must contain: uppercase, lowercase, number, special char

---

## 📁 Project Structure

```
.
├── db.js                 # Database with security features
├── server.js            # Express server with security middleware
├── package.json         # Dependencies with security packages
├── .env.example         # Environment template (COPY THIS!)
├── SECURITY.md          # Detailed security documentation
├── public/
│   ├── app.js           # Public frontend JS
│   ├── index.html       # Public home page
│   ├── admin.html       # Admin panel with password change
│   └── style.css        # Styles
└── data.sqlite          # SQLite database (auto-created)
```

---

## 🔌 API Endpoints

### Public Endpoints

- `GET /api/categories` - Get all categories
- `GET /api/links` - Search links with pagination
- `GET /api/links/trending` - Get trending links
- `POST /api/links` - Submit new link
- `POST /api/links/:id/view` - Record link view

### Authentication Endpoints

- `POST /api/admin/login` - Admin login (rate-limited)
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/me` - Check session status
- `POST /api/admin/change-password` - Change admin password

### Admin Endpoints (requires authentication)

- `GET /api/admin/links` - Get all links for moderation
- `DELETE /api/admin/links/:id` - Delete link
- `POST /api/admin/links/:id/ban` - Ban link
- `POST /api/admin/links/:id/unban` - Unban link
- `GET /api/admin/categories` - Get all categories
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

---

## 🛡️ Security Configuration

### Login Attempt Tracking
- Monitored in `login_attempts` table
- Account locked after 5 failures in 15 minutes
- All attempts logged with timestamp

### Database Backup
```bash
# Backup your database
cp data.sqlite data.sqlite.backup

# Restore from backup
cp data.sqlite.backup data.sqlite
```

### Password Requirements
```
Minimum 12 characters
Must contain:
  ✓ Uppercase letter (A-Z)
  ✓ Lowercase letter (a-z)
  ✓ Number (0-9)
  ✓ Special character (@$!%*?&)
```

---

## 🚀 Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Enable `SECURE_COOKIE=true`
3. Generate new SESSION_SECRET
4. Set strong ADMIN_PASSWORD
5. Update CORS_ORIGIN to your domain

### HTTPS/SSL
```bash
# Using Let's Encrypt with certbot:
sudo certbot certonly --standalone -d your-domain.com

# Update server to use certificates
# Configure reverse proxy (nginx, Apache)
```

### Reverse Proxy Example (Nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Systemd Service (Linux)
```ini
# /etc/systemd/system/linkvault.service
[Unit]
Description=LinkVault Secure Link Sharing Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/www-data/linkvault
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

---

## 🧪 Testing

### Manual Testing
```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
done

# Test XSS protection
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://example.com",
    "title":"<script>alert(\"xss\")</script>",
    "category_id": 1
  }'
```

---

## 📊 Database Schema

### Users Table
```sql
admin (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_changed_at TEXT,
  password_change_required INTEGER,
  last_login TEXT,
  created_at TEXT
)
```

### Login Attempts Table
```sql
login_attempts (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  attempt_time TEXT,
  success INTEGER,
  ip_address TEXT,
  user_agent TEXT
)
```

### Links Table
```sql
links (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id INTEGER,
  image_url TEXT,
  date_posted TEXT,
  views INTEGER,
  is_banned INTEGER
)
```

### Categories Table
```sql
categories (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT
)
```

---

## 🔒 Security Best Practices

1. **Change Default Password** - Do this immediately
2. **Use HTTPS** - Always in production
3. **Backup Database** - Regular backups to safe location
4. **Monitor Logs** - Check for suspicious activity
5. **Update Dependencies** - Run `npm audit` and update regularly
6. **Restrict Access** - Use firewall rules and VPN if needed
7. **Strong Passwords** - Follow all requirements
8. **Secure Deployment** - Use environment variables, not hardcoded secrets

---

## 🆘 Troubleshooting

### "Cannot reach server"
- Ensure `npm start` or `npm run dev` is running
- Check if port 3000 is available
- Check firewall settings

### "Invalid credentials"
- Verify username is `admin`
- Check ADMIN_PASSWORD in `.env` file
- Ensure `.env` file is in project root

### "Account locked"
- Wait 15 minutes
- Or check `login_attempts` table and clear failed attempts

### "Password change required"
- Complete password change on first login
- New password must meet requirements

---

## 📚 Documentation

- **[SECURITY.md](SECURITY.md)** - Detailed security documentation
- **[API Guide](#api-endpoints)** - API endpoint reference
- **[OWASP Top 10](https://owasp.org/www-project-top-ten/)** - Web security best practices

---

## 📝 License

MIT License - Feel free to use and modify

---

## 🤝 Contributing

Security vulnerabilities should be reported responsibly and not publicly disclosed.

---

## 📞 Support

For issues and questions, please check the troubleshooting section or review SECURITY.md

---

**Last Updated:** May 29, 2026  
**Security Level:** ⭐⭐⭐⭐ (Enterprise-Grade)  
**Version:** 2.0 (Hardened)
