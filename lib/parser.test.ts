import { describe, it, expect } from 'vitest';
import { parseLogLine } from './parser';

describe('parseLogLine', () => {
    it('should parse standard log, b;item;qty;price format', () => {
        const result = parseLogLine('b;Xanax;10;800000') as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(10);
        expect(result.price).toBe(800000);
    });

    it('should parse standard log, b;item;qty;;total format', () => {
        const result = parseLogLine('b;Xanax;10;;8000000') as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.price).toBe(800000);
    });

    // Events
    it('should parse event, bazaar bought (no timestamp)', () => {
        const line = 'shabboing bought 1 x Can of X-MASS from your bazaar for $3,107,976.';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('can of x-mass');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(3107976);
    });

    it('should parse event, bazaar bought (with timestamp)', () => {
        const line = '19:32:19 - 16/03/26 shabboing bought 1 x Can of X-MASS from your bazaar for $3,107,976.';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('can of x-mass');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(3107976);
    });

    // Logs
    it('should parse log, Torn system buy', () => {
        const line = '21:49:48 - 06/03/26 You bought 19x Xanax at $688,996 each for a total of $13,090,924';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(19);
        expect(result.price).toBe(688996);
    });

    it('should parse log, Torn system sell with fees', () => {
        const line = '05:15:35 - 14/03/26 You sold a Feathery Hotel Coupon on the item market to basic_ash1 at $13,099,994 each for a total of $12,444,994 after $655,000 in fees';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('feathery hotel coupon');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(12444994); // Net price after fees
    });

    it('should parse log, bazaar sell (no timestamp)', () => {
        const line = 'You sold 5x Cardholder on your bazaar to MaxYourSandals at $7,415 each for a total of $37,075';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('cardholder');
        expect(result.amount).toBe(5);
        expect(result.price).toBe(7415);
    });

    it('should parse log, bazaar sell (timestamp)', () => {
        const line = '19:25:58 - 16/03/26 You sold 5x Cardholder on your bazaar to MaxYourSandals at $7,415 each for a total of $37,075';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('cardholder');
        expect(result.amount).toBe(5);
        expect(result.price).toBe(7415);
    });

    it('should parse log, bazaar sell single (no timestamp)', () => {
        const line = 'You sold a Can of X-MASS on your bazaar to shabboing at $3,107,976 each for a total of $3,107,976';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('can of x-mass');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(3107976);
    });

    it('should parse log, bazaar sell single (timestamp)', () => {
        const line = '19:32:19 - 16/03/26 You sold a Can of X-MASS on your bazaar to shabboing at $3,107,976 each for a total of $3,107,976';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('can of x-mass');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(3107976);
    });

    it('should parse log, bazaar buy (no timestamp)', () => {
        const line = 'You bought 2x Xanax on Hellgend\'s bazaar at $820,000 each for a total of $1,640,000';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(2);
        expect(result.price).toBe(820000);
    });

    it('should parse log, bazaar buy (timestamp)', () => {
        const line = '05:08:48 - 17/03/26 You bought 2x Xanax on Hellgend\'s bazaar at $820,000 each for a total of $1,640,000';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(2);
        expect(result.price).toBe(820000);
    });

    it('should parse log, bazaar buy single (no timestamp)', () => {
        const line = 'You bought some Xanax on Hellgend\'s bazaar at $820,000 each for a total of $820,000';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(820000);
    });

    it('should parse log, bazaar buy single (timestamp)', () => {
        const line = '05:08:42 - 17/03/26 You bought some Xanax on Hellgend\'s bazaar at $820,000 each for a total of $820,000';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(820000);
    });

    it('should return null for invalid formats', () => {
        expect(parseLogLine('invalid log line')).toBeNull();
        expect(parseLogLine('21:47:05 - 16/03/26')).toBeNull();
    });
});
