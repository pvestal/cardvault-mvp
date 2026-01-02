# Create New Google OAuth Credentials for CardVault

The previous OAuth client has been deleted. Follow these steps to create new credentials:

## Steps to Create New OAuth Client

### 1. Go to Google Cloud Console
Navigate to: https://console.cloud.google.com/

### 2. Create or Select a Project
- If you don't have a project, click "Create Project"
- Name it something like "CardVault" or "Tower Apps"

### 3. Enable Google+ API
1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 4. Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required fields:
   - App name: CardVault
   - User support email: patrick.vestal@gmail.com
   - Authorized domains: Add `duckdns.org`
   - Developer contact: patrick.vestal@gmail.com
4. Add scopes: email, profile, openid
5. Save and continue

### 5. Create OAuth 2.0 Client ID
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "CardVault Web"
5. Add Authorized JavaScript origins:
   ```
   https://vestal-garcia.duckdns.org
   http://localhost:8082
   ```
6. Add Authorized redirect URIs:
   ```
   https://vestal-garcia.duckdns.org/api/cardvault/auth/google/callback
   http://localhost:3001/api/cardvault/auth/google/callback
   ```
7. Click "Create"

### 6. Copy Your New Credentials
You'll receive:
- Client ID: (something like: 123456789-abcdefg.apps.googleusercontent.com)
- Client Secret: (something like: GOCSPX-xxxxxxxxxxxxx)

### 7. Update CardVault Configuration
Edit `/opt/cardvault-mvp/backend/.env`:
```env
GOOGLE_CLIENT_ID=your-new-client-id
GOOGLE_CLIENT_SECRET=your-new-client-secret
```

### 8. Update Tower Vault (Optional)
If you want to store these in Tower vault for other apps:
```bash
# Update the vault.json with new credentials
vim /home/patrick/.tower_credentials/vault.json
```

### 9. Restart CardVault Backend
```bash
cd /opt/cardvault-mvp/backend
# Kill any existing process
pkill -f "tsx watch"
# Start fresh
npm run dev
```

## Alternative: Use a Different OAuth Provider

If you prefer not to create new Google credentials, you can use:
- GitHub OAuth (simpler setup)
- Microsoft OAuth
- Or implement username/password auth only

## Testing After Setup
1. Visit: https://vestal-garcia.duckdns.org/cardvault/login
2. Click "Continue with Google"
3. Should redirect to Google login
4. After auth, should redirect back to CardVault

## Common Issues
- **redirect_uri_mismatch**: Make sure URLs match exactly (including https://)
- **401 unauthorized**: Check client secret is correct
- **Application not verified**: Normal for development, click "Continue" when prompted