# Vercel Deployment Guide - Fix Supabase Environment Variables

## 🚨 Error Fix: "Missing Supabase environment variables"

Your app is failing because Vercel doesn't have access to your Supabase credentials. Here's how to fix it:

## 📋 Required Environment Variables

Your app needs these two environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🔧 Step-by-Step Fix

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (this is your `VITE_SUPABASE_URL`)
   - **anon public** key (this is your `VITE_SUPABASE_ANON_KEY`)

### 2. Add Environment Variables to Vercel

#### Option A: Through Vercel Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your deployed project
3. Go to **Settings** tab
4. Click **Environment Variables** in the sidebar
5. Add these variables:

```
Name: VITE_SUPABASE_URL
Value: https://your-project-id.supabase.co
Environment: Production, Preview, Development
```

```
Name: VITE_SUPABASE_ANON_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your anon key)
Environment: Production, Preview, Development
```

#### Option B: Through Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
# Paste your Supabase URL when prompted

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your Supabase anon key when prompted
```

### 3. Redeploy Your Application

After adding the environment variables:

#### Option A: Trigger Redeploy from Dashboard
1. Go to your project's **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

#### Option B: Push a New Commit
```bash
# Make a small change and push
git commit --allow-empty -m "Trigger redeploy with env vars"
git push origin main
```

## 🔍 Verify the Fix

1. Wait for the deployment to complete
2. Visit your live site
3. Open browser console (F12)
4. The "Missing Supabase environment variables" error should be gone
5. Try creating an account or logging in

## 📝 Example Environment Variables

Your environment variables should look like this:

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODM2NzIwMCwiZXhwIjoxOTUzOTQzMjAwfQ.example-signature
```

## ⚠️ Security Notes

- ✅ The **anon key** is safe to expose in frontend code
- ✅ These are public keys designed for client-side use
- ❌ Never expose your **service_role** key in frontend code
- ❌ Never commit environment variables to your repository

## 🐛 Troubleshooting

### Still getting the error?
1. **Check variable names**: Must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. **Check environments**: Make sure variables are set for "Production"
3. **Redeploy**: Environment variables only take effect after redeployment
4. **Check Supabase URL**: Should start with `https://` and end with `.supabase.co`

### Test locally first:
```bash
# Create .env.local file (don't commit this!)
echo "VITE_SUPABASE_URL=your-url-here" > .env.local
echo "VITE_SUPABASE_ANON_KEY=your-key-here" >> .env.local

# Test the build
npm run build
npm run preview
```

## 🎉 After Fixing

Once the environment variables are set and you've redeployed:
1. Your app should load without console errors
2. Users can sign up and log in
3. Anonymous messaging will work
4. Media uploads will function (after running the database scripts)

## 📞 Need Help?

If you're still having issues:
1. Check the Vercel deployment logs for other errors
2. Verify your Supabase project is active and accessible
3. Test the environment variables in Vercel's preview environment first
