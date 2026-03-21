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

    it('should parse log, points market sell (timestamp)', () => {
        const line = '19:26:35 - 16/03/26 You sold 150x points to JjDja on the points market at $33,749 each for a total of $5,062,350';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('points');
        expect(result.amount).toBe(150);
        expect(result.price).toBe(33749);
    });

    it('should parse log, points market sell (no timestamp)', () => {
        const line = 'You sold 150x points to JjDja on the points market at $33,749 each for a total of $5,062,350';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('points');
        expect(result.amount).toBe(150);
        expect(result.price).toBe(33749);
    });

    it('should parse log, points market buy (timestamp)', () => {
        const line = '20:39:48 - 05/03/26 You bought 15x points from CeedXXX on the points market at $33,599 each for a total of $503,985';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('points');
        expect(result.amount).toBe(15);
        expect(result.price).toBe(33599);
    });

    it('should parse log, points market buy (no timestamp)', () => {
        const line = 'You bought 15x points from CeedXXX on the points market at $33,599 each for a total of $503,985';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.item).toBe('points');
        expect(result.amount).toBe(15);
        expect(result.price).toBe(33599);
    });

    it('should parse event, points market bought (timestamp)', () => {
        const line = '05:10:36 - 18/03/26 Phantomic bought 3,000 of your points that were on the market for $101,100,000';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('points');
        expect(result.amount).toBe(3000);
        expect(result.price).toBe(33700);
    });

    it('should parse event, points market bought (no timestamp)', () => {
        const line = 'Phantomic bought 3,000 of your points that were on the market for $101,100,000';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SELL');
        expect(result.item).toBe('points');
        expect(result.amount).toBe(3000);
        expect(result.price).toBe(33700);
    });

    it('should parse log, abroad buy (from location)', () => {
        const line = '21:02:31 - 17/03/26 You bought 23x Xanax at $805,000 each for a total of $18,515,000 from Switzerland';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('BUY');
        expect(result.tag).toBe('Abroad');
    });

    it('should parse log, anonymous mug', () => {
        const line = 'Someone anonymously mugged you for $4,446,201 sending you to the hospital for 0h 42m [view]';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('MUG');
        expect(result.amount).toBe(4446201);
    });

    it('should parse log, anonymous mug (timestamp)', () => {
        const line = '10:42:52 - 05/03/26 Someone anonymously mugged you for $4,446,201 sending you to the hospital for 0h 42m [view]';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('MUG');
        expect(result.amount).toBe(4446201);
    });

    it('should parse log, non-anonymous mug', () => {
        const line = 'tayzarstar mugged you for $13,584 sending you to the hospital for Oh 39m';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('MUG');
        expect(result.amount).toBe(13584);
    });

    it('should parse log, non-anonymous mug (timestamp)', () => {
        const line = '03:36:09 - 19/03/26 tayzarstar mugged you for $13,584 sending you to the hospital for Oh 39m';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('MUG');
        expect(result.amount).toBe(13584);
    });

    it('should parse log, museum exchange (plushies)', () => {
        const line = 'You exchanged 25x Plushie Set to the museum for 250 points';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SET_CONVERT');
        expect(result.setType).toBe('plushie');
        expect(result.times).toBe(25);
        expect(result.pointsEarned).toBe(250);
    });

    it('should parse log, museum exchange (flowers)', () => {
        const line = '02:23:27 - 13/03/26 You exchanged 3x Exotic Flower Set to the museum for 30 points';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SET_CONVERT');
        expect(result.setType).toBe('flower');
        expect(result.times).toBe(3);
        expect(result.pointsEarned).toBe(30);
    });

    it('should parse log, museum exchange (plushies timestamp)', () => {
        const line = '18:48:29 - 16/03/26 You exchanged 25x Plushie Set to the museum for 250 points';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SET_CONVERT');
        expect(result.setType).toBe('plushie');
    });

    it('should parse log, museum exchange (flowers no-timestamp)', () => {
        const line = 'You exchanged 3x Exotic Flower Set to the museum for 30 points';
        const result = parseLogLine(line) as any;
        expect(result).not.toBeNull();
        expect(result.type).toBe('SET_CONVERT');
        expect(result.setType).toBe('flower');
    });

    it('should return null for invalid formats', () => {
        expect(parseLogLine('invalid log line')).toBeNull();
        expect(parseLogLine('21:47:05 - 16/03/26')).toBeNull();
    });
});

import { formatToStandardLog } from './parser';

describe('formatToStandardLog', () => {
    it('should format BUY correctly', () => {
        const log = { type: 'BUY', item: 'xanax', amount: 10, price: 800000 } as any;
        const result = formatToStandardLog(log);
        expect(result).toBe('You bought 10x Xanax at $800,000 each for a total of $8,000,000');
        expect(parseLogLine(result)).toMatchObject(log);
    });

    it('should format BUY with tag correctly', () => {
        const log = { type: 'BUY', item: 'xanax', amount: 10, price: 800000, tag: 'Abroad' } as any;
        const result = formatToStandardLog(log);
        expect(result).toBe('You bought 10x Xanax at $800,000 each for a total of $8,000,000 from Switzerland');
        expect(parseLogLine(result)).toMatchObject({ ...log, item: 'xanax' });
    });

    it('should format SELL correctly', () => {
        const log = { type: 'SELL', item: 'xanax', amount: 5, price: 850000 } as any;
        const result = formatToStandardLog(log);
        expect(result).toContain('You sold 5x Xanax');
        expect(result).toContain('$850,000 each');
        // Note: parsing standard sell usually works due to "You sold ... on the item market" regex
        const parsed = parseLogLine(result) as any;
        expect(parsed.type).toBe('SELL');
        expect(parsed.item).toBe('xanax');
        expect(parsed.amount).toBe(5);
        expect(parsed.price).toBe(850000);
    });

    it('should format MUG correctly', () => {
        const log = { type: 'MUG', amount: 4446201 } as any;
        const result = formatToStandardLog(log);
        expect(result).toBe('Someone anonymously mugged you for $4,446,201');
    });

    it('should format SET_CONVERT correctly', () => {
        const log = { type: 'SET_CONVERT', setType: 'flower', times: 3, pointsEarned: 30 } as any;
        const result = formatToStandardLog(log);
        expect(result).toBe('You exchanged 3x Exotic Flower Set to the museum for 30 points');
    });
});
