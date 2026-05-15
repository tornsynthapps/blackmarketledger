export interface SyncCursor {
    lastTimestamp: number;
    lastLogId: string;
}

export interface TornLogEntry {
    id: number | string;
    timestamp: number;
    title?: string;
    details?: {
        id?: number;
        title?: string;
        category?: string;
    };
    data?: Record<string, unknown>;
    params?: Record<string, unknown>;
}

export interface NormalizedLog {
    id: string;
    timestamp: number;
    category: string;
    typeId: number;
    title: string;
    data: Record<string, unknown>;
    params: Record<string, unknown>;
}

export function normalizeTornLog(entry: TornLogEntry): NormalizedLog {
    return {
        id: String(entry.id),
        timestamp: Number(entry.timestamp),
        category: entry.details?.category || "",
        typeId: Number(entry.details?.id || 0),
        title: entry.title || entry.details?.title || "",
        data: (entry.data as Record<string, unknown>) || {},
        params: (entry.params as Record<string, unknown>) || {},
    };
}
