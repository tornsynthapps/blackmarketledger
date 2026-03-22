import { describe, it, expect } from 'vitest';
import { calculateInventory, buildTransactionsWithLogs } from './transactionBuilder';
import { ParsedLog, Transaction } from './parser';

describe('transactionBuilder', () => {
    describe('calculateInventory', () => {
        it('should calculate basic inventory from buys and sells', () => {
            const txns: Transaction[] = [
                { id: '1', date: 100, type: 'BUY', item: 'xanax', amount: 10, price: 800000, tag: 'Normal' },
                { id: '2', date: 200, type: 'SELL', item: 'xanax', amount: 3, price: 850000, tag: 'Normal' }
            ];
            const inv = calculateInventory(txns);
            const xanax = inv.get('xanax');
            expect(xanax.stock).toBe(7);
            expect(xanax.totalCost).toBe(5600000); // 7 * 800,000
            expect(xanax.realizedProfit).toBe(150000); // 3 * (850,000 - 800,000)
        });

        it('should handle abroad stock separately', () => {
            const txns: Transaction[] = [
                { id: '1', date: 100, type: 'BUY', item: 'xanax', amount: 10, price: 800000, tag: 'Normal' },
                { id: '2', date: 150, type: 'BUY', item: 'xanax', amount: 5, price: 700000, tag: 'Abroad' },
                { id: '3', date: 200, type: 'SELL', item: 'xanax', amount: 3, price: 850000, tag: 'Abroad' }
            ];
            const inv = calculateInventory(txns);
            const xanax = inv.get('xanax');
            expect(xanax.stock).toBe(10);
            expect(xanax.abroadStock).toBe(2);
            expect(xanax.abroadTotalCost).toBe(1400000); // 2 * 700,000
            expect(xanax.abroadRealizedProfit).toBe(450000); // 3 * (850,000 - 700,000)
        });
    });

    describe('buildTransactionsWithLogs', () => {
        it('should skip logs when skipNegativeStock is ON and inventory is missing', () => {
            const baseTxns: Transaction[] = [];
            const logs: ParsedLog[] = [
                { type: 'SELL', item: 'xanax', amount: 5, price: 850000 }
            ];
            const result = buildTransactionsWithLogs(baseTxns, logs, true);
            expect(result.length).toBe(0);
        });

        it('should fulfill logs when skipNegativeStock is ON and inventory is available', () => {
            const baseTxns: Transaction[] = [
                { id: '1', date: 100, type: 'BUY', item: 'xanax', amount: 10, price: 800000, tag: 'Normal' }
            ];
            const logs: ParsedLog[] = [
                { type: 'SELL', item: 'xanax', amount: 5, price: 850000 }
            ];
            const result = buildTransactionsWithLogs(baseTxns, logs, true);
            expect(result.length).toBe(2); // base + 1 new
            expect((result[1] as any).amount).toBe(5);
            expect((result[1] as any).tag).toBe('Normal');
        });

        it('should split logs when skipNegativeStock is ON and inventory is partially available (normal + abroad)', () => {
            const baseTxns: Transaction[] = [
                { id: '1', date: 100, type: 'BUY', item: 'xanax', amount: 3, price: 800000, tag: 'Normal' },
                { id: '2', date: 110, type: 'BUY', item: 'xanax', amount: 5, price: 700000, tag: 'Abroad' }
            ];
            const logs: ParsedLog[] = [
                { type: 'SELL', item: 'xanax', amount: 10, price: 850000 }
            ];
            const result = buildTransactionsWithLogs(baseTxns, logs, true);
            // Result should have baseTxns + 2 new transactions (3 from normal, 5 from abroad)
            expect(result.length).toBe(4);
            const newTxns = result.slice(2);
            expect((newTxns[0] as any).amount).toBe(3);
            expect((newTxns[0] as any).tag).toBe('Normal');
            expect((newTxns[1] as any).amount).toBe(5);
            expect((newTxns[1] as any).tag).toBe('Abroad');
        });

        it('should NOT skip logs when skipNegativeStock is OFF', () => {
            const baseTxns: Transaction[] = [];
            const logs: ParsedLog[] = [
                { type: 'SELL', item: 'xanax', amount: 5, price: 850000 }
            ];
            const result = buildTransactionsWithLogs(baseTxns, logs, false);
            expect(result.length).toBe(1);
            expect((result[0] as any).amount).toBe(5);
            expect((result[0] as any).tag).toBe('Normal'); // Default tag
        });

        it('should apply partial SET_CONVERT when skipNegativeStock is ON', () => {
            // Assume flower set items are available in stock but only enough for 1 set
            const baseTxns: Transaction[] = [
                { id: '1', date: 100, type: 'BUY', item: 'dahlia', amount: 1, price: 1000, tag: 'Normal' },
                { id: '2', date: 100, type: 'BUY', item: 'orchid', amount: 1, price: 1000, tag: 'Normal' },
                { id: '3', date: 100, type: 'BUY', item: 'african violet', amount: 1, price: 1000, tag: 'Normal' },
                { id: '4', date: 100, type: 'BUY', item: 'cherry blossom', amount: 1, price: 1000, tag: 'Normal' },
                { id: '5', date: 100, type: 'BUY', item: 'peony', amount: 1, price: 1000, tag: 'Normal' },
                { id: '6', date: 100, type: 'BUY', item: 'ceibo flower', amount: 1, price: 1000, tag: 'Normal' },
                { id: '7', date: 100, type: 'BUY', item: 'edelweiss', amount: 1, price: 1000, tag: 'Normal' },
                { id: '8', date: 100, type: 'BUY', item: 'crocus', amount: 1, price: 1000, tag: 'Normal' },
                { id: '9', date: 100, type: 'BUY', item: 'heather', amount: 1, price: 1000, tag: 'Normal' },
                { id: '10', date: 100, type: 'BUY', item: 'tribulus omanense', amount: 1, price: 1000, tag: 'Normal' },
                { id: '11', date: 100, type: 'BUY', item: 'banana orchid', amount: 1, price: 1000, tag: 'Normal' }
            ];
            const logs: ParsedLog[] = [
                { type: 'SET_CONVERT', setType: 'flower', times: 5, pointsEarned: 50 }
            ];
            const result = buildTransactionsWithLogs(baseTxns, logs, true);
            const setConvertTxn = result.find(t => t.type === 'SET_CONVERT');
            expect(setConvertTxn).toBeDefined();
            expect((setConvertTxn as any).times).toBe(1);
            expect((setConvertTxn as any).pointsEarned).toBe(10);
        });

        it('should skip logs that were already imported by Torn log id', () => {
            const baseTxns: Transaction[] = [
                { id: '1', date: 100, type: 'BUY', item: 'xanax', amount: 10, price: 800000, tag: 'Normal', tornLogId: '123' }
            ];
            const logs: ParsedLog[] = [
                { type: 'BUY', item: 'xanax', amount: 5, price: 700000, tornLogId: '123', loggedAt: 1000 }
            ];
            const result = buildTransactionsWithLogs(baseTxns, logs, false);
            expect(result).toHaveLength(1);
        });
    });
});
