export const PARSER_VERSION = '1.1.0';
export type TransactionType = 'BUY' | 'SELL' | 'MUG' | 'CONVERT';

export type TransactionTag = 'Abroad' | 'Normal';
export type TransactionSourceType = 'item-market' | 'bazaar' | 'trade' | 'points-market' | 'museum';

export interface BaseTransaction {
    id: string;
    date: number; // timestamp
    tag?: TransactionTag; // Used to differentiate source of items
    sourceType?: TransactionSourceType;
    loggedAt?: number;
    tornLogId?: string;
    weav3rReceiptId?: string;
    tradeGroupId?: string;
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

export interface SetConvertTransaction extends BaseTransaction {
    type: 'SET_CONVERT';
    setType: 'flower' | 'plushie';
    times: number;
    pointsEarned: number;
}

export type Transaction = TradeTransaction | MugTransaction | ConvertTransaction | SetConvertTransaction;

export type ParsedTradeLog = Omit<TradeTransaction, 'id' | 'date'>;
export type ParsedMugLog = Omit<MugTransaction, 'id' | 'date'>;
export type ParsedConvertLog = Omit<ConvertTransaction, 'id' | 'date'>;
export type ParsedSetConvertLog = Omit<SetConvertTransaction, 'id' | 'date'>;

export type ParsedLog = ParsedTradeLog | ParsedMugLog | ParsedConvertLog | ParsedSetConvertLog;

export const FLOWER_SET = [
    'dahlia', 'orchid', 'african violet', 'cherry blossom', 'peony',
    'ceibo flower', 'edelweiss', 'crocus', 'heather', 'tribulus omanense', 'banana orchid'
];

export const PLUSHIE_SET = [
    'sheep plushie', 'teddy bear plushie', 'kitten plushie', 'jaguar plushie', 'wolverine plushie', 'nessie plushie',
    'red fox plushie', 'monkey plushie', 'chamois plushie', 'panda plushie', 'lion plushie', 'camel plushie',
    'stingray plushie'
];

export function normalizeItemName(name: string): string {
    const lower = name.trim().toLowerCase();

    // Handle aliases
    if (lower === 'flush' || lower === 'flushies' || lower === 'flushie') {
        return 'flushie';
    }
    if (lower === 'point' || lower === 'points') {
        return 'points';
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
* cf;<times> (Convert flower sets to points)
* cp;<times> (Convert plushie sets to points)
*/
export function parseLogLine(line: string): ParsedLog | null {
    // e.g. "19:26:35 - 16/03/26 You sold 150x points to JjDja on the points market at $33,749 each for a total of $5,062,350"
    // e.g. "20:39:48 - 05/03/26 You bought 15x points from CeedXXX on the points market at $33,599 each for a total of $503,985"
    const pointsMarketLogRegex = /You (bought|sold) ([\d,]+)x (points) (?:from|to) .+? on the points market at \$([\d,]+) each for a total of \$([\d,]+)/i;
    const pointsMarketLogMatch = line.match(pointsMarketLogRegex);
    if (pointsMarketLogMatch) {
        const action = pointsMarketLogMatch[1].toLowerCase();
        const type = action === 'bought' ? 'BUY' : 'SELL';
        const amount = parseInt(pointsMarketLogMatch[2].replace(/,/g, ''), 10);
        const price = parseInt(pointsMarketLogMatch[4].replace(/,/g, ''), 10);
        const total = parseInt(pointsMarketLogMatch[5].replace(/,/g, ''), 10);

        if (!isNaN(amount) && !isNaN(price)) {
            return {
                type,
                item: 'points',
                amount,
                price: type === 'SELL' ? total / amount : price
            } as ParsedTradeLog;
        }
    }

    // e.g. "05:10:36 - 18/03/26 Phantomic bought 3,000 of your points that were on the market for $101,100,000"
    const pointsMarketEventRegex = /.+? bought ([\d,]+) of your points that were on the market for \$([\d,]+)/i;
    const pointsMarketEventMatch = line.match(pointsMarketEventRegex);
    if (pointsMarketEventMatch) {
        const amount = parseInt(pointsMarketEventMatch[1].replace(/,/g, ''), 10);
        const total = parseInt(pointsMarketEventMatch[2].replace(/,/g, ''), 10);

        if (!isNaN(amount) && !isNaN(total) && amount > 0) {
            return {
                type: 'SELL',
                item: 'points',
                amount,
                price: total / amount
            } as ParsedTradeLog;
        }
    }

    // Try parsing Torn system event logs for purchases:
    // e.g. "17:49:48 - 06/03/26 You bought 19x Xanax at $688,996 each for a total of $13,090,924 from Japan"
    // e.g. "07:28:09 - 07/03/26 You bought 22x Crocus on Frengesp's bazaar at $7,099 each for a total of $156,178"
    // e.g. "07:28:33 - 07/03/26 You bought 58x Crocus on the item market from lesbiampires at $8,189 each for a total of $474,962"
    // e.g. "You bought a Bottle of Tequila on Botato's bazaar at $666 each for a total of $666"
    const tornBuyRegex = /You bought ([\d,]+x|a|some) (.+?)(?: on .+? bazaar| on the item market from .+?)? at \$([\d,]+) each(?: for a total of \$([\d,]+)(?: (?:from|in) (.+))?)?/i;
    const tornBuyMatch = line.match(tornBuyRegex);
    if (tornBuyMatch) {
        let amount = 1;
        const amountMatch = tornBuyMatch[1].toLowerCase();
        const price = parseInt(tornBuyMatch[3].replace(/,/g, ''), 10);
        const total = tornBuyMatch[4] ? parseInt(tornBuyMatch[4].replace(/,/g, ''), 10) : NaN;
        const isAbroad = !!tornBuyMatch[5];

        if (amountMatch.endsWith('x')) {
            amount = parseInt(amountMatch.replace(/,/g, ''), 10);
        } else if (amountMatch === 'some' || amountMatch === 'a') {
            if (!isNaN(total) && !isNaN(price) && price > 0) {
                amount = Math.round(total / price);
            }
        }

        const item = normalizeItemName(tornBuyMatch[2]);

        if (!isNaN(amount) && !isNaN(price)) {
            return {
                type: 'BUY',
                item,
                amount,
                price,
                ...(isAbroad && { tag: 'Abroad' })
            } as ParsedTradeLog;
        }
    }

    // e.g. "05:15:35 - 14/03/26 You sold a Feathery Hotel Coupon on the item market to basic_ash1 at $13,099,994 each for a total of $12,444,994 after $655,000 in fees"
    // e.g. "08:39:21 - 21/02/26 You sold 2x Xanax on the item market to JohnAConstantin at $838,000 each for a total of $1,592,200 after $83,800 in fees"
    // e.g. "07:37:32 - 22/02/26 You sold some Xanax on the item market to antilene at $840,000 each for a total of $798,000 after $42,000 in fees"
    const tornSellRegex = /You sold ([\d,]+x|a|some) (.+?) on the item market to .+? at \$([\d,]+) each for a total of \$([\d,]+)/i;
    const tornSellMatch = line.match(tornSellRegex);
    if (tornSellMatch) {
        const item = normalizeItemName(tornSellMatch[2]);
        const price = parseInt(tornSellMatch[3].replace(/,/g, ''), 10);
        const total = parseInt(tornSellMatch[4].replace(/,/g, ''), 10);
        let amount = 1;

        const amountMatch = tornSellMatch[1].toLowerCase();
        if (amountMatch.endsWith('x')) {
            amount = parseInt(amountMatch.replace(/,/g, ''), 10);
        } else if (amountMatch === 'some' || amountMatch === 'a') {
            if (!isNaN(total) && !isNaN(price) && price > 0) {
                amount = Math.round(total / price);
            }
        }

        if (!isNaN(amount) && !isNaN(price) && !isNaN(total)) {
            return {
                type: 'SELL',
                item,
                amount,
                price: total / amount
            } as ParsedTradeLog;
        }
    }

    // e.g. "You sold a Casket on your bazaar to apneatic at $44,999 each for a total of $44,999"
    // e.g. "You sold 2x Firewalk Virus on your bazaar to Kalisa at $20,799,999 each for a total of $41,599,998"
    const tornBazaarSellRegex = /You sold ([\d,]+x|a|some) (.+?) on your bazaar to .+? at \$([\d,]+) each for a total of \$([\d,]+)/i;
    const tornBazaarSellMatch = line.match(tornBazaarSellRegex);
    if (tornBazaarSellMatch) {
        const item = normalizeItemName(tornBazaarSellMatch[2]);
        const price = parseInt(tornBazaarSellMatch[3].replace(/,/g, ''), 10);
        const total = parseInt(tornBazaarSellMatch[4].replace(/,/g, ''), 10);
        let amount = 1;

        const amountMatch = tornBazaarSellMatch[1].toLowerCase();
        if (amountMatch.endsWith('x')) {
            amount = parseInt(amountMatch.replace(/,/g, ''), 10);
        } else if (amountMatch === 'some' || amountMatch === 'a') {
            if (!isNaN(total) && !isNaN(price) && price > 0) {
                amount = Math.round(total / price);
            }
        }

        if (!isNaN(amount) && !isNaN(price) && !isNaN(total)) {
            return {
                type: 'SELL',
                item,
                amount,
                price: total / amount
            } as ParsedTradeLog;
        }
    }

    // e.g. "shabboing bought 1 x Can of X-MASS from your bazaar for $3,107,976."
    // e.g. "19:32:19 - 16/03/26 shabboing bought 1 x Can of X-MASS from your bazaar for $3,107,976."
    const bazaarEventRegex = /.*? bought ([\d,]+)\s*x\s*(.+?) from your bazaar for \$([\d,]+)/i;
    const bazaarEventMatch = line.match(bazaarEventRegex);
    if (bazaarEventMatch) {
        const item = normalizeItemName(bazaarEventMatch[2]);
        const amount = parseInt(bazaarEventMatch[1].replace(/,/g, ''), 10);
        const total = parseInt(bazaarEventMatch[3].replace(/,/g, ''), 10);
        if (!isNaN(amount) && !isNaN(total) && amount > 0) {
            return {
                type: 'SELL',
                item,
                amount,
                price: total / amount
            } as ParsedTradeLog;
        }
    }

    // Someone anonymously mugged you for $4,446,201 sending you to the hospital for 0h 42m [view]
    const tornAnonMugRegex = /Someone anonymously mugged you for \$([\d,]+)/i;
    const tornAnonMugMatch = line.match(tornAnonMugRegex);
    if (tornAnonMugMatch) {
        const amount = parseInt(tornAnonMugMatch[1].replace(/,/g, ''), 10);
        if (!isNaN(amount)) {
            return {
                type: 'MUG',
                amount
            } as ParsedMugLog;
        }
    }

    // You exchanged 25x Plushie Set to the museum for 250 points
    // You exchanged 3x Exotic Flower Set to the museum for 30 points
    const museumExchangeRegex = /You exchanged ([\d,]+)x (.+?) Set to the museum for ([\d,]+) points/i;
    const museumExchangeMatch = line.match(museumExchangeRegex);
    if (museumExchangeMatch) {
        const times = parseInt(museumExchangeMatch[1].replace(/,/g, ''), 10);
        const setTypeRaw = museumExchangeMatch[2].toLowerCase();
        const pointsEarned = parseInt(museumExchangeMatch[3].replace(/,/g, ''), 10);
        
        if (!isNaN(times) && !isNaN(pointsEarned)) {
            let setType: 'flower' | 'plushie' = 'plushie';
            if (setTypeRaw.includes('flower')) {
                setType = 'flower';
            }
            
            return {
                type: 'SET_CONVERT',
                setType,
                times,
                pointsEarned
            } as ParsedSetConvertLog;
        }
    }

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

            let tag: TransactionTag | undefined = undefined;
            // Support explicit tag at the end (b;Xanax;100;800000;Abroad or b;Xanax;100;;8000000;Abroad)
            if (parts.length >= 5) {
                const potentialTag = parts[parts.length - 1].trim().toLowerCase();
                if (potentialTag === 'abroad') tag = 'Abroad';
                if (potentialTag === 'normal') tag = 'Normal';
            }

            return {
                type: action === 'b' ? 'BUY' : 'SELL',
                item,
                amount,
                price,
                ...(tag && { tag })
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
                fromItem: 'flushie',
                toItem: 'points',
                fromAmount: ratio * times,
                toAmount: 10 * times
            } as ParsedConvertLog;
        } else if (action === 'cf' || action === 'cp') {
            if (parts.length < 2) return null;
            const timesStr = parts[1].trim().replace(/,/g, '');
            const times = parseInt(timesStr, 10);

            if (isNaN(times) || times <= 0) return null;

            const isFlower = action === 'cf';
            return {
                type: 'SET_CONVERT',
                setType: isFlower ? 'flower' : 'plushie',
                times,
                pointsEarned: times * 10
            } as ParsedSetConvertLog;
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

export function formatToStandardLog(parsed: ParsedLog): string {
    const formattedPrice = (price: number) => {
        return Math.floor(price).toLocaleString('en-US');
    };

    if (parsed.type === 'BUY') {
        const total = parsed.amount * parsed.price;
        const tag = parsed.tag === 'Abroad' ? ` from ${parsed.item === 'xanax' ? 'Switzerland' : 'Abroad'}` : ''; // Example
        return `You bought ${parsed.amount}x ${formatItemName(parsed.item)} at $${formattedPrice(parsed.price)} each for a total of $${formattedPrice(total)}${tag}`;
    }

    if (parsed.type === 'SELL') {
        const total = parsed.amount * parsed.price;
        return `You sold ${parsed.amount}x ${formatItemName(parsed.item)} on the item market to someone at $${formattedPrice(parsed.price)} each for a total of $${formattedPrice(total)}`;
    }

    if (parsed.type === 'MUG') {
        return `Someone anonymously mugged you for $${parsed.amount.toLocaleString('en-US')}`;
    }

    if (parsed.type === 'SET_CONVERT') {
        const setName = parsed.setType === 'flower' ? 'Exotic Flower' : 'Plushie';
        return `You exchanged ${parsed.times}x ${setName} Set to the museum for ${parsed.pointsEarned} points`;
    }

    return '';
}
