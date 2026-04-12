export interface BlackboxLog {
    event: string;
    data: any;
    timestamp: string;
}

export interface BlackboxData {
    id: string;
    createdAt: string;
    logs: BlackboxLog[];
}

export function formatTimestamp(timestamp: string): string {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString();
}
