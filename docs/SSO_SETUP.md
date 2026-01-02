# CardVault SSO Setup Guide

This guide explains how to configure Single Sign-On (SSO) authentication for CardVault using Google and Apple OAuth providers.

## Prerequisites

- CardVault backend running on port 3001
- CardVault frontend running on port 8082
- Access to Google Cloud Console and/or Apple Developer Account

## Google OAuth Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API for your project

### 2. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: CardVault
   - User support email: your-email@example.com
   - Authorized domains: vestal-garcia.duckdns.org
   - Developer contact: your-email@example.com

### 3. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure the following:
   - Name: CardVault Web
   - Authorized JavaScript origins:
     - `https://vestal-garcia.duckdns.org`
     - `http://localhost:8082` (for development)
   - Authorized redirect URIs:
     - `https://vestal-garcia.duckdns.org/api/cardvault/auth/google/callback`
     - `http://localhost:3001/api/auth/google/callback` (for development)
5. Copy the Client ID and Client Secret

### 4. Configure CardVault Backend

Edit `/opt/cardvault-mvp/backend/.env` and add:

```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

## Apple OAuth Setup

### 1. Apple Developer Account Setup

1. Log in to [Apple Developer](https://developer.apple.com/)
2. Navigate to "Certificates, Identifiers & Profiles"

### 2. Create an App ID

1. Go to "Identifiers" and click the "+" button
2. Select "App IDs" and continue
3. Select "App" as the type
4. Fill in:
   - Description: CardVault
   - Bundle ID: com.yourdomain.cardvault
5. Enable "Sign in with Apple" capability
6. Save the App ID

### 3. Create a Service ID

1. In "Identifiers", click "+" again
2. Select "Services IDs"
3. Fill in:
   - Description: CardVault Web
   - Identifier: com.yourdomain.cardvault.web
4. Enable "Sign in with Apple"
5. Configure the domain:
   - Domain: vestal-garcia.duckdns.org
   - Return URL: https://vestal-garcia.duckdns.org/api/cardvault/auth/apple/callback

### 4. Create a Private Key

1. Go to "Keys" and click "+"
2. Name the key: CardVault Auth Key
3. Enable "Sign in with Apple"
4. Configure the key with your App ID
5. Download the .p8 key file (save it securely!)
6. Note the Key ID

### 5. Configure CardVault Backend

Edit `/opt/cardvault-mvp/backend/.env` and add:

```env
APPLE_CLIENT_ID=com.yourdomain.cardvault.web
APPLE_TEAM_ID=your-10-character-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_KEYID.p8
```

## Testing SSO

### 1. Restart the Backend

```bash
cd /opt/cardvault-mvp/backend
npm run dev
```

### 2. Check Available Providers

```bash
curl http://localhost:3001/api/auth/providers
```

You should see the configured providers in the response.

### 3. Test Login Flow

1. Navigate to https://vestal-garcia.duckdns.org/cardvault/login
2. You should see "Continue with Google" and/or "Continue with Apple" buttons
3. Click a button to test the OAuth flow

## Troubleshooting

### Google OAuth Issues

- **Error: redirect_uri_mismatch**
  - Ensure the redirect URI in Google Console matches exactly
  - Check for trailing slashes
  - Verify protocol (http vs https)

- **Error: access_denied**
  - User cancelled the consent flow
  - Check OAuth consent screen configuration

### Apple OAuth Issues

- **Invalid client**
  - Verify the Service ID matches APPLE_CLIENT_ID
  - Check that the domain is verified in Apple Developer Console

- **Invalid redirect_uri**
  - Ensure the Return URL in Service ID configuration matches exactly
  - Domain must be verified

### General Issues

- **SSO buttons not showing**
  - Check that OAuth credentials are set in .env
  - Verify backend is reading environment variables
  - Check browser console for errors

## Security Considerations

1. **Never commit OAuth credentials to Git**
   - Keep them in .env files
   - Use environment variables in production

2. **Use HTTPS in production**
   - OAuth providers require secure connections
   - Protects tokens in transit

3. **Rotate credentials regularly**
   - Update OAuth secrets periodically
   - Monitor for suspicious activity

4. **Implement rate limiting**
   - Protect against brute force attacks
   - Consider using a service like Redis for session storage

## Next Steps

After configuring SSO:

1. Test with multiple user accounts
2. Implement user profile management
3. Add logout functionality
4. Consider adding more OAuth providers (GitHub, Microsoft, etc.)
5. Implement account linking for users with multiple auth methods