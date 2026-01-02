# Update Google OAuth Redirect URI for CardVault

## Current Setup
- **Client ID**: 735162600972-blo099tl869mmk2b981t5beubh59fmju.apps.googleusercontent.com
- **Status**: Credentials loaded from Tower vault
- **Provider**: Active and available in CardVault

## Required Update in Google Cloud Console

You need to add the CardVault redirect URI to your Google OAuth application.

### Steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with the client ID above)
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. In the **Authorized redirect URIs** section, add these URIs:

### Production URIs to Add:
```
https://vestal-garcia.duckdns.org/api/cardvault/auth/google/callback
```

### Development URIs (Optional):
```
http://localhost:3001/api/auth/google/callback
```

6. Click **Save**

## Test the Integration

After updating the redirect URI, you can test the Google OAuth flow:

1. Navigate to: https://vestal-garcia.duckdns.org/cardvault/login
2. You should see the "Continue with Google" button
3. Click it to test the OAuth flow

## Current OAuth Flow

1. User clicks "Continue with Google"
2. Redirected to Google for authentication
3. Google redirects back to `/api/cardvault/auth/google/callback`
4. Backend processes the OAuth response
5. User is redirected to the CardVault app with JWT token

## Troubleshooting

If you get a **redirect_uri_mismatch** error:
- The URI in Google Console must match EXACTLY
- Check for trailing slashes
- Ensure you're using HTTPS for production
- The URI is case-sensitive

## Notes

- The Google OAuth credentials are already configured in CardVault
- The backend is set up to handle the OAuth flow
- The frontend will display the Google login button automatically
- User data will be stored in the CardVault database upon successful authentication