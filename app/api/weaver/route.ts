import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { userId, receiptId, apiKey } = await request.json();

        if (!userId || !receiptId || !apiKey) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const url = `https://weav3r.dev/api/trades/${userId}/${receiptId}?apiKey=${apiKey}`;

        console.log(url)
        // Weav3r API uses GET request
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Weaver API error: ${response.status} ${response.statusText}`, details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch from Weaver API', details: error.message },
            { status: 500 }
        );
    }
}
