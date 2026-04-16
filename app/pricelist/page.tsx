import type { Metadata } from "next";
import PricelistClientPage from "./PricelistClientPage";
import { Suspense } from "react";

export const metadata: Metadata = {
    title: "Public Pricelist | BlackMarket Ledger",
    description: "Public Torn pricelist viewer powered by Weav3r market data.",
};

export default function PricelistPage() {
    return (
        <Suspense fallback={null}>
            <PricelistClientPage />
        </Suspense>
    );
}
