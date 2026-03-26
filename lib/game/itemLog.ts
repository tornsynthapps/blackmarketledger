export type TornItemSource =
    | "item-market"
    | "bazaar"
    | "points-market"
    | "museum"
    | "attack";

export class TornItemLog {
    itemID: number;
    price: number;
    source: TornItemSource;

    // Noraml Stock
    normalAmt: number = 0;
    normalTotalAmt: number = 0;
    normalCostBasis: number = 0;
    // Abroad Stock
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
        previousLog: TornItemLog | null = null,
    ) {
        this.itemID = itemID;
        this.price = price;
        this.source = source;
        this.updateStats(previousLog, normalAmt, abroadAmt);
    }

    updateStats(
        previousLog: TornItemLog | null,
        normalAmt: number,
        abroadAmt: number,
        forwardStock: boolean = true,
    ) {
        // Initial Verification.
        if (previousLog && previousLog.itemID !== this.itemID) {
            throw new Error("Log item ID mismatch.");
        }

        const previousTotalNormalStock = previousLog
            ? previousLog.normalTotalAmt
            : 0;
        const previouseNormalCostBasis = previousLog
            ? previousLog.normalCostBasis
            : 0;
        const previousTotalAbroadStock = previousLog
            ? previousLog.abroadTotalAmt
            : 0;
        const previousAbroadCostBasis = previousLog
            ? previousLog.abroadCostBasis
            : 0;

        // Noraml Stock.
        if (normalAmt >= 0) {
            // Buying.
            this.normalAmt = normalAmt;
            this.normalTotalAmt = previousTotalNormalStock + normalAmt;
            this.normalCostBasis =
                (previouseNormalCostBasis * previousTotalNormalStock +
                    normalAmt * this.price) /
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
                (previousAbroadCostBasis * previousTotalAbroadStock +
                    abroadAmt * this.price) /
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
}
