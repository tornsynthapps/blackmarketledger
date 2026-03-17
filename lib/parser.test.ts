import { describe, it, expect } from 'vitest';
import { parseLogLine } from './parser';

describe('parseLogLine', () => {
    it('should parse simple "b;item;qty;price" format', () => {
        const result = parseLogLine('b;Xanax;10;800000') as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(10);
        expect(result.price).toBe(800000);
    });

    it('should parse "b;item;qty;;total" format', () => {
        const result = parseLogLine('b;Xanax;10;;8000000') as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.price).toBe(800000);
    });

    // Events
    it('should parse bazaar "bought" events (no timestamp)', () => {
        const line = 'shabboing bought 1 x Can of X-MASS from your bazaar for $3,107,976.';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('can of x-mass');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(3107976);
    });

    it('should parse bazaar "bought" events (with timestamp)', () => {
        const line = '19:32:19 - 16/03/26 shabboing bought 1 x Can of X-MASS from your bazaar for $3,107,976.';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('can of x-mass');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(3107976);
    });

    // Logs
    it('should parse Torn system buy logs', () => {
        const line = '21:49:48 - 06/03/26 You bought 19x Xanax at $688,996 each for a total of $13,090,924';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(19);
        expect(result.price).toBe(688996);
    });

    it('should parse Torn system sell logs with fees (item market)', () => {
        const line = '05:15:35 - 14/03/26 You sold a Feathery Hotel Coupon on the item market to basic_ash1 at $13,099,994 each for a total of $12,444,994 after $655,000 in fees';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('feathery hotel coupon');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(12444994); // Net price after fees
    });

    it('should parse Torn bazaar sell logs (single item)', () => {
        const line = 'You sold a Casket on your bazaar to apneatic at $44,999 each for a total of $44,999';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('casket');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(44999);
    });

    it('should parse Torn bazaar sell logs (multiple items)', () => {
        const line = 'You sold 2x Firewalk Virus on your bazaar to Kalisa at $20,799,999 each for a total of $41,599,998';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('firewalk virus');
        expect(result.amount).toBe(2);
        expect(result.price).toBe(20799999);
    });

    it('should parse Torn bazaar sell logs (with "some")', () => {
        const line = 'You sold some Xanax on your bazaar to im_ at $819,999 each for a total of $819,999';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('xanax');
        expect(result.amount).toBe(1);
        expect(result.price).toBe(819999);
    });

    it('should return null for invalid formats', () => {
        expect(parseLogLine('invalid log line')).toBeNull();
        expect(parseLogLine('21:47:05 - 16/03/26')).toBeNull();
    });
});
