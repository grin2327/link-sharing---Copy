# 🚀 Deployment Guide - LinkVault

## ⚠️ CRITICAL: Why GitHub Pages Doesn't Work

Your application is a **Node.js Express server**, not a static website. 

**GitHub Pages only hosts STATIC files** (HTML, CSS, JavaScript).

It **CANNOT run:**
- Node.js servers ❌
- Express applications ❌
- Database operations ❌
- Backend code ❌

### The Problem
```
❌ Your GitHub URL:  https://yourusername.github.io/link-sharing
   ↓
   GitHub Pages tries to serve static files only
   ↓
   index.html found but:
   - No Node.js runtime to execute server.js
   - No database backend
   - No API endpoints work
   - Application is broken
```

### The Solution
Deploy to a **Node.js-hosting platform** instead:

---

## ✅ Recommended Deployment Platforms (Free/Paid)

### 🏆 BEST OPTIONS (Recommended)

#### 1. **Render** (Easiest for Beginners)
- **Cost:** Free tier available, $7/month paid
- **Ease:** ⭐⭐⭐⭐⭐ (Easiest)
- **Setup Time:** 5 minutes

**Steps:**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Select your `link-sharing` repository
6. Configuration:
   - **Name:** `link-sharing` (or your choice)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Region:** Select closest to you
7. Add environment variables from your `.env` file
8. Click "Create Web Service"
9. Done! Your URL: `https://your-app-name.onrender.com`

**Important:** Add `.env` variables in Render dashboard:
- Go to Environment → Add Variable
- Add each variable from your `.env` file
- Click Deploy again

---

#### 2. **Railway** (Very Popular)
- **Cost:** $5 credit/month free, then pay-as-you-go
- **Ease:** ⭐⭐⭐⭐⭐ (Very Easy)
- **Setup Time:** 5 minutes

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "Create Project" → "Deploy from GitHub repo"
4. Select your `link-sharing` repository
5. Railway auto-detects Node.js
6. Add environment variables:
   - Open "Variables" tab
   - Copy contents from your `.env` file
   - Paste into the editor
7. Click "Deploy"
8. Your URL appears in "Deployments"

---

#### 3. **Heroku** (Popular but Paid Now)
- **Cost:** Paid only (~$7/month minimum)
- **Ease:** ⭐⭐⭐⭐ (Moderate)
- **Setup Time:** 10 minutes

**Steps:**
1. Install Heroku CLI: `npm install -g heroku`
2. Go to [heroku.com](https://heroku.com), create account
3. In your project folder:
   ```bash
   heroku login
   heroku create your-app-name
   ```
4. Add environment variables:
   ```bash
   heroku config:set SESSION_SECRET=<your-secret>
   heroku config:set ADMIN_PASSWORD=<your-password>
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com
   ```
5. Deploy:
   ```bash
   git push heroku main
   ```

---

#### 4. **Fly.io** (Powerful)
- **Cost:** Free tier available
- **Ease:** ⭐⭐⭐ (Moderate)
- **Setup Time:** 15 minutes

**Steps:**
1. Install: `npm install -g @fly.io/v1`
2. In your project folder:
   ```bash
   flyctl auth signup
   flyctl launch
   ```
3. Choose region, app name
4. Set secrets:
   ```bash
   flyctl secrets set SESSION_SECRET=<your-secret>
   flyctl secrets set ADMIN_PASSWORD=<your-password>
   ```
5. Deploy:
   ```bash
   flyctl deploy
   ```

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Generate a strong SESSION_SECRET:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  
- [ ] Change ADMIN_PASSWORD to strong password (12+ chars, uppercase, lowercase, number, special char)

- [ ] Set NODE_ENV=production

- [ ] Set SECURE_COOKIE=true

- [ ] Set CORS_ORIGIN to your deployment URL (e.g., https://your-app-name.onrender.com)

- [ ] Test locally first:
  ```bash
  npm install
  npm start
  # Visit http://localhost:3000
  # Try logging in with admin panel at /admin.html
  ```

---

## 🔒 Production Environment Variables

For production deployment, use these values:

```env
NODE_ENV=production
PORT=3000
SECURE_COOKIE=true
FORCE_HTTPS=true

# GENERATE NEW VALUES - NEVER use local development values!
SESSION_SECRET=<output-of-node-crypto-command>
ADMIN_PASSWORD=<your-strong-password>

# Set to your deployment domain
CORS_ORIGIN=https://your-app-name.onrender.com

# Keep rate limiting enabled
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_ATTEMPT_LIMIT=5
```

---

## 🚀 Option 1: Deploy to Render (RECOMMENDED)

### Step-by-Step with Screenshots

1. **Create Render Account**
   - Visit: https://render.com
   - Click "Sign up"
   - Select "GitHub" auth
   - Authorize Render to access your GitHub

2. **Create New Web Service**
   - Dashboard → "New +" → "Web Service"
   - Connect to GitHub
   - Find your `link-sharing` repository
   - Click "Connect"

3. **Configure Deployment**
   ```
   Name: link-sharing
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   ```

4. **Add Environment Variables**
   - Scroll to "Environment" section
   - Click "Add Environment Variable"
   - Add these variables:
   
   ```
   KEY                     | VALUE
   ------------------------|----------------------------------
   NODE_ENV               | production
   SESSION_SECRET         | <your-generated-secret>
   ADMIN_PASSWORD         | <your-password>
   CORS_ORIGIN            | https://link-sharing.onrender.com
   SECURE_COOKIE          | true
   RATE_LIMIT_WINDOW_MS   | 900000
   RATE_LIMIT_MAX_REQUESTS| 100
   LOGIN_ATTEMPT_LIMIT    | 5
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete
   - Your URL: `https://link-sharing.onrender.com`
   - Visit URL in browser → Should see your site!

---

## 🔧 Option 2: Deploy with Docker (Advanced)

If you want more control, create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Then deploy to:
- Docker Hub
- AWS ECR
- Digital Ocean
- Any container platform

---

## 📝 GitHub Setup (Before Uploading)

### 1. Create `.env` Locally (DO NOT COMMIT)
```bash
cp .env.example .env
# Edit .env with your values
```

### 2. Verify `.gitignore` Contains
```
.env
.env.local
node_modules/
data.sqlite
```

### 3. Upload to GitHub
```bash
git add .
git commit -m "Initial commit - LinkVault"
git push origin main
```

### 4. Deploy to Render/Railway
- They'll read `.env` variables from their dashboard
- They WON'T need `.env` file committed

---

## ✅ Test Your Deployment

1. **Visit your URL** (e.g., https://link-sharing.onrender.com)
2. **Should see:** LinkVault homepage
3. **Click Admin:** Go to `/admin.html`
4. **Login with:**
   - Username: `admin`
   - Password: (your ADMIN_PASSWORD from .env)
5. **Change password** on first login
6. **Test functionality:**
   - Add a category
   - Add a link
   - Search for links
   - View link details

---

## 🐛 Troubleshooting Deployment

### Issue: "Application failed to start"
**Solution:** Check build logs for errors, ensure all dependencies in `package.json`

### Issue: "Cannot find database"
**Solution:** Database auto-creates on startup. Check server logs.

### Issue: "API not responding"
**Solution:** 
- Check CORS_ORIGIN matches your deployment URL
- Ensure all env variables are set correctly
- Check server logs for errors

### Issue: "Login not working"
**Solution:**
- Ensure SESSION_SECRET is set
- Check ADMIN_PASSWORD is correct
- Browser cookies enabled
- Check security logs in console

---

## 📚 Additional Resources

- **Render Docs:** https://render.com/docs
- **Railway Docs:** https://railway.app/docs
- **Heroku Docs:** https://devcenter.heroku.com
- **Node.js Best Practices:** https://nodejs.org/en/docs/

---

## ❓ FAQ

**Q: Can I use GitHub Pages?**
A: No, it only hosts static files. Your app needs Node.js.

**Q: Is my data safe in production?**
A: Yes! All passwords hashed, SQL injection prevented, rate limiting enabled.

**Q: Can I use a custom domain?**
A: Yes! All platforms support custom domains in settings.

**Q: What if I want to self-host?**
A: Use a VPS (DigitalOcean, Linode, AWS EC2) with Node.js installed.

**Q: How do I backup my database?**
A: The SQLite file is in the project. Most platforms support file backups.

---

## 🎯 Next Steps

1. ✅ Choose a deployment platform (recommend **Render**)
2. ✅ Generate new SESSION_SECRET
3. ✅ Create strong ADMIN_PASSWORD
4. ✅ Deploy!
5. ✅ Test your live application
6. ✅ Share your URL!

Good luck! 🚀
