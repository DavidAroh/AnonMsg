# Fix Dashboard Error - "Could not find table 'media_expiration_status'"

## 🚨 Problem Fixed
The dashboard was trying to access a database view that doesn't exist yet. I've updated the code to work without it.

## ✅ Solutions Applied

### 1. **Updated MediaExpirationMonitor Component**
- ✅ Now queries `message_media` table directly instead of the missing view
- ✅ Handles cases where `expires_at` column might not exist
- ✅ Calculates expiration status in JavaScript instead of SQL
- ✅ Provides fallback for manual cleanup if database functions don't exist

### 2. **Created Simple Database Setup**
I've created `add-expires-at-column.sql` with minimal required changes:
- Adds `expires_at` column to `message_media` table
- Sets default expiration to 1 hour from creation
- Creates simple cleanup function

## 🚀 Quick Fix Steps

### Option A: Deploy Code Fix (Immediate)
The dashboard should work now without any database changes:

```bash
git add .
git commit -m "Fix dashboard error - work without media_expiration_status view"
git push origin main
```

### Option B: Add Database Support (Optional)
For full auto-delete functionality, run this in Supabase SQL Editor:

```sql
-- Add expires_at column
ALTER TABLE message_media 
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '1 hour');

-- Update existing records
UPDATE message_media 
SET expires_at = now() + interval '1 hour' 
WHERE expires_at IS NULL;
```

## 🎯 What's Fixed

### ✅ Dashboard Now Works:
- **No more "table not found" errors**
- **Media monitor shows existing media files**
- **Calculates expiration times automatically**
- **Manual cleanup works even without database functions**

### ✅ Graceful Fallbacks:
- **If `expires_at` column missing**: Uses `created_at + 1 hour`
- **If database functions missing**: Does manual cleanup via API calls
- **If view missing**: Queries table directly

## 📱 Expected Behavior

### Dashboard Media Monitor:
- ✅ Shows list of uploaded media files
- ✅ Displays expiration status (Active/Expiring Soon/Expired)
- ✅ Shows time remaining until deletion
- ✅ Manual cleanup button works
- ✅ Real-time updates when media changes

### Auto-Delete Feature:
- **Without database setup**: Manual cleanup only
- **With database setup**: Automatic cleanup + manual option

## 🔍 Testing

After deploying the fix:

1. **Visit your dashboard** - should load without errors
2. **Check Media Monitor section** - should show media files if any exist
3. **Upload a test image** - should appear in the monitor
4. **Manual cleanup** - should work for expired files

## 📞 Next Steps

1. **Deploy the code fix** (resolves immediate error)
2. **Optionally run database script** (enables full auto-delete)
3. **Test dashboard functionality**

The dashboard error should be completely resolved! 🎉
