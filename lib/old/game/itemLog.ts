export type TornItemSource = "item-market" | "bazaar" | "points-market" | "museum" | "attack";

export class TornItemLog {
    itemID: number;
    price: number;
    source: TornItemSource;

    // Noraml Stock
    normalAmtInput: number;
    normalAmt: number = 0;
    normalTotalAmt: number = 0;
    normalCostBasis: number = 0;
    // Abroad Stock
    abroadAmtInput: number;
    abroadAmt: number = 0;
    abroadTotalAmt: number = 0;
    abroadCostBasis: number = 0;
    // Skipped Stock.
    skipAmt: number = 0;

    constructor(
        itemID: number,
        price: number,
        source: TornItemSource,
        normalAmt: number = 0,
        abroadAmt: number = 0,
        previousLog: TornItemLog | null = null
    ) {
        this.itemID = itemID;
        this.price = price;
        this.source = source;
        this.normalAmtInput = normalAmt;
        this.abroadAmtInput = abroadAmt;
        this.updateStats(previousLog);
    }

    /**
     * Updates the log stats based on the given previous log.
     * @param previousLog The previous log.
     * @param forwardStock Whether to forward the stock or not.
     */
    updateStats(previousLog: TornItemLog | null, forwardStock: boolean = true) {
        // Initial Verification.
        if (previousLog && previousLog.itemID !== this.itemID) {
            throw new Error("Log item ID mismatch.");
        }

        let normalAmt = this.normalAmtInput;
        let abroadAmt = this.abroadAmtInput;

        const previousTotalNormalStock = previousLog ? previousLog.normalTotalAmt : 0;
        const previouseNormalCostBasis = previousLog ? previousLog.normalCostBasis : 0;
        const previousTotalAbroadStock = previousLog ? previousLog.abroadTotalAmt : 0;
        const previousAbroadCostBasis = previousLog ? previousLog.abroadCostBasis : 0;

        // Noraml Stock.
        if (normalAmt >= 0) {
            // Buying.
            this.normalAmt = normalAmt;
            this.normalTotalAmt = previousTotalNormalStock + normalAmt;
            this.normalCostBasis =
                (previouseNormalCostBasis * previousTotalNormalStock + normalAmt * this.price) /
                (previousTotalNormalStock + normalAmt);
        } else {
            // Selling.
            const absNormalAmt = Math.abs(normalAmt);
            const possible = Math.min(previousTotalAbroadStock, absNormalAmt);

            this.normalAmt = -possible;
            this.normalTotalAmt = previousTotalNormalStock - possible;
            this.normalCostBasis = previousAbroadCostBasis;

            // Skip or move remaining stock.
            if (!forwardStock) {
                this.skipAmt = absNormalAmt - possible;
            } else {
                abroadAmt -= absNormalAmt - possible;
            }
        }

        // Abroad Stock.
        if (abroadAmt >= 0) {
            // Buying.
            this.abroadAmt = abroadAmt;
            this.abroadTotalAmt = previousTotalAbroadStock + abroadAmt;
            this.abroadCostBasis =
                (previousAbroadCostBasis * previousTotalAbroadStock + abroadAmt * this.price) /
                (previousTotalAbroadStock + abroadAmt);
        } else {
            // Selling.
            const absAbroadAmt = Math.abs(abroadAmt);
            const possible = Math.min(previousTotalNormalStock, absAbroadAmt);

            this.abroadAmt = -possible;
            this.abroadTotalAmt = previousTotalAbroadStock - possible;
            this.abroadCostBasis = previousAbroadCostBasis;

            // Skip remaining stock.
            this.skipAmt = absAbroadAmt - possible;
        }
    }

    /**
     * Converts the transaction list to an interface.
     * @returns Record<string, any>: The interface.
     */
    toInterface(): Record<string, any> {
        return {
            itemID: this.itemID,
            price: this.price,
            source: this.source,
            normalAmtInput: this.normalAmtInput,
            normalAmt: this.normalAmt,
            normalTotalAmt: this.normalTotalAmt,
            normalCostBasis: this.normalCostBasis,
            abroadAmtInput: this.abroadAmtInput,
            abroadAmt: this.abroadAmt,
            abroadTotalAmt: this.abroadTotalAmt,
            abroadCostBasis: this.abroadCostBasis,
            skipAmt: this.skipAmt,
        };
    }

    /**
     * Converts a raw log object into a standard log object.
     * @param input The input object.
     * @returns TornItemLog: The converted object.
     */
    static fromInterface(input: Record<string, any>): TornItemLog {
        const item = new TornItemLog(
            input.itemID,
            input.price,
            input.source,
            input.normalAmtInput,
            input.abroadAmtInput,
            null
        );

        item.normalAmt = input.normalAmt;
        item.normalTotalAmt = input.normalTotalAmt;
        item.normalCostBasis = input.normalCostBasis;
        item.abroadAmt = input.abroadAmt;
        item.abroadTotalAmt = input.abroadTotalAmt;
        item.abroadCostBasis = input.abroadCostBasis;
        item.skipAmt = input.skipAmt;

        return item;
    }
}
