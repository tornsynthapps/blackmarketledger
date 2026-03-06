export type TransactionType = 'BUY' | 'SELL' | 'MUG' | 'CONVERT';

export interface BaseTransaction {
    id: string;
    date: number; // timestamp
}

export interface TradeTransaction extends BaseTransaction {
    type: 'BUY' | 'SELL';
    item: string;
    amount: number;
    price: number;
}

export interface MugTransaction extends BaseTransaction {
    type: 'MUG';
    amount: number; // money lost
}

export interface ConvertTransaction extends BaseTransaction {
    type: 'CONVERT';
    fromItem: string;
    toItem: string;
    fromAmount: number;
    toAmount: number;
}

export type Transaction = TradeTransaction | MugTransaction | ConvertTransaction;

export type ParsedTradeLog = Omit<TradeTransaction, 'id' | 'date'>;
export type ParsedMugLog = Omit<MugTransaction, 'id' | 'date'>;
export type ParsedConvertLog = Omit<ConvertTransaction, 'id' | 'date'>;

export type ParsedLog = ParsedTradeLog | ParsedMugLog | ParsedConvertLog;

function normalizeItemName(name: string): string {
    const lower = name.trim().toLowerCase();

    // Handle aliases
    if (lower === 'flush' || lower === 'flushies' || lower === 'flushie') {
        return 'Flushie';
    }
    if (lower === 'point' || lower === 'points') {
        return 'Points';
    }

    // Return purely lowercase for consistent internal storage
    return lower;
}

export function formatItemName(name: string): string {
    // Title Case for general items (handling spaces and hyphens)
    return name.replace(/(?:^|[\s-])\w/g, (txt) => {
        return txt.toUpperCase();
    });
}

/**
* Parses shorthand logs into transaction objects.
* Supported formats:
* b;<item>;<amount>;<price> (Buy with individual price)
* b;<item>;<amount>;;<total_cost> (Buy with empty individual and total)
* s;<item>;<amount>;<price> (Sell)
* s;<item>;<amount>;;<total_cost> (Sell)
* m;<amount> (Mug loss)
* c;<ratio_flushies>;<times> (Convert flushies to points)
*/
export function parseLogLine(line: string): ParsedLog | null {
    const parts = line.trim().split(';');
    if (parts.length < 2) return null;

    const action = parts[0].toLowerCase();

    try {
        if (action === 'b' || action === 's') {
            if (parts.length < 4) return null;
            const item = normalizeItemName(parts[1]);
            const amountStr = parts[2].trim().replace(/,/g, '');
            const amount = parseInt(amountStr, 10);
            let price = NaN;

            // Standard format: b;Xanax;100;800000
            if (parts[3].trim() !== '') {
                const priceStr = parts[3].trim().replace(/,/g, '');
                price = parseInt(priceStr, 10);
            }
            // Total format: b;Xanax;100;;80000000
            else if (parts.length >= 5 && parts[4].trim() !== '') {
                const totalCostStr = parts[4].trim().replace(/,/g, '');
                const totalCost = parseInt(totalCostStr, 10);
                if (!isNaN(totalCost) && !isNaN(amount) && amount > 0) {
                    price = totalCost / amount;
                }
            }

            if (isNaN(amount) || isNaN(price)) return null;

            return {
                type: action === 'b' ? 'BUY' : 'SELL',
                item,
                amount,
                price
            } as ParsedTradeLog;
        } else if (action === 'm') {
            const amountStr = parts[1].trim().replace(/,/g, '');
            const amount = parseInt(amountStr, 10);
            if (isNaN(amount)) return null;

            return {
                type: 'MUG',
                amount
            } as ParsedMugLog;
        } else if (action === 'c') {
            if (parts.length < 3) return null;
            const ratioStr = parts[1].trim().replace(/,/g, '');
            const timesStr = parts[2].trim().replace(/,/g, '');
            const ratio = parseInt(ratioStr, 10);
            const times = parseInt(timesStr, 10);

            if (isNaN(ratio) || isNaN(times)) return null;

            return {
                type: 'CONVERT',
                fromItem: 'Flushie',
                toItem: 'Points',
                fromAmount: ratio * times,
                toAmount: 10 * times
            } as ParsedConvertLog;
        }
    } catch (e) {
        return null;
    }

    return null;
}

export function parseLogs(input: string): ParsedLog[] {
    return input
        .split('\n')
        .map(parseLogLine)
        .filter((log): log is ParsedLog => log !== null);
}
