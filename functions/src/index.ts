import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Configuration for your OAuth Client
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || '9823261627-tnm3qiimgukmvop7ai7oc150n26njlak.apps.googleusercontent.com';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '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';
// const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'https://blackmarketledger.web.app/auth/drive';
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/drive';

/**
 * Endpoint to exchange a Google OAuth code for tokens and store the refresh token
 * securely in Firestore, returning the access token to the client.
 */
export const exchangeDriveAuthCode = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated with Firebase Auth
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { code } = data;
    if (!code) {
        throw new functions.https.HttpsError('invalid-argument', 'The "code" parameter is required.');
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: OAUTH_CLIENT_ID,
                client_secret: OAUTH_CLIENT_SECRET,
                redirect_uri: OAUTH_REDIRECT_URI,
                grant_type: 'authorization_code'
            })
        });

        const tokenData: any = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token Exchange Error:', tokenData);
            throw new functions.https.HttpsError('internal', 'Failed to exchange auth code.');
        }

        const { access_token, refresh_token, expires_in } = tokenData;

        // If a refresh token is provided (happens on first consent), store it securely in Firestore
        if (refresh_token) {
            await admin.firestore().collection('userTokens').doc(context.auth.uid).set({
                driveRefreshToken: refresh_token,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // Return the short-lived access token to the client (who can pass it to the extension)
        return {
            accessToken: access_token,
            expiresIn: expires_in
        };
    } catch (error) {
        console.error('exchangeDriveAuthCode error:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred during token exchange.');
    }
});

/**
 * Endpoint to get a new access token using the stored refresh token.
 */
export const refreshDriveToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    try {
        // Retrieve the stored refresh token for this user
        const doc = await admin.firestore().collection('userTokens').doc(context.auth.uid).get();
        if (!doc.exists || !doc.data()?.driveRefreshToken) {
            throw new functions.https.HttpsError('failed-precondition', 'No refresh token found for user.');
        }

        const refreshToken = doc.data()!.driveRefreshToken;

        // Exchange refresh token for a new access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: OAUTH_CLIENT_ID,
                client_secret: OAUTH_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        const tokenData: any = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token Refresh Error:', tokenData);
            throw new functions.https.HttpsError('internal', 'Failed to refresh token.');
        }

        return {
            accessToken: tokenData.access_token,
            expiresIn: tokenData.expires_in
        };
    } catch (error) {
        console.error('refreshDriveToken error:', error);
        throw new functions.https.HttpsError('internal', 'An error occurred during token refresh.');
    }
});
