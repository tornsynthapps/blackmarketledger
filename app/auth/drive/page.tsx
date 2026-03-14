"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useJournal } from '@/store/useJournal';

function AuthHandler() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Exchanging code for tokens...');

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            setStatus(`Authentication Failed: ${error}`);
            return;
        }

        if (!code) {
            setStatus('No authorization code found in URL.');
            return;
        }

        const exchangeCode = async () => {
            try {
                // Using exact details requested by the user. Leaking client secret directly in client for prototyping.
                const clientId = '9823261627-tnm3qiimgukmvop7ai7oc150n26njlak.apps.googleusercontent.com';
                const clientSecret = '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';
                const redirectUri = 'http://localhost:3000/auth/drive';

                const response = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        code,
                        client_id: clientId,
                        client_secret: clientSecret,
                        redirect_uri: redirectUri,
                        grant_type: 'authorization_code'
                    })
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error_description || data.error || 'Failed to exchange token');
                }

                // Tokens acquired successfully!
                setStatus('Tokens acquired! Sending to extension...');
                
                // Fetch email logic so the extension can show it
                let email = 'Unknown Server Email';
                try {
                    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${data.access_token}` }
                    });
                    if (profileRes.ok) {
                        const profile = await profileRes.json();
                        if (profile.email) {
                            email = profile.email;
                        }
                    }
                } catch(e) {}

                // Send the tokens and profile back to the extension using the content script relay mechanism
                const messageId = crypto.randomUUID();
                window.postMessage({
                    type: 'BML_SYNC_REQUEST',
                    id: messageId,
                    action: 'store_drive_tokens',
                    data: {
                        accessToken: data.access_token,
                        refreshToken: data.refresh_token,
                        expiresIn: data.expires_in,
                        email: email
                    }
                }, '*');

                setTimeout(() => {
                    setStatus('Success! You can close this tab and return to the BML Connect extension.');
                    // Close the tab automatically if permitted by browser
                    // window.close();  
                }, 1500);

            } catch (err: any) {
                console.error(err);
                setStatus(`Error during token exchange: ${err.message}`);
            }
        };

        exchangeCode();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="bg-panel border border-border/50 rounded-lg p-8 shadow-xl max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-4 tracking-tight">Google Drive Authorization</h1>
                <p className="text-foreground/70 mb-6">{status}</p>
                
                {status.includes('Success') && (
                    <div className="text-primary font-medium flex flex-col gap-2">
                        <span className="text-4xl block mb-2">✅</span>
                        You may now close this tab.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DriveAuthPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthHandler />
        </Suspense>
    );
}
