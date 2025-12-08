# Lulo Cloud Environment Variables
# Copy this file to .env.local and fill in your values

# ===========================================
# SUPABASE (Database & Auth)
# ===========================================
# Get these from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===========================================
# CLOUDFLARE R2 (Video Storage)
# ===========================================
# Get these from: https://dash.cloudflare.com/?to=/:account/r2/api-tokens
CLOUDFLARE_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=lulo-recordings

# Optional: Custom domain for public R2 access
# R2_PUBLIC_URL=https://cdn.yourdomain.com

# ===========================================
# EXISTING KEYS (Already using)
# ===========================================
GEMINI_API_KEY=your-gemini-api-key
