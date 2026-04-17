import Image from "next/image";
import { formatItemName } from "@/lib/old/parser";
import { ItemSetIcon } from "@/components/ItemSetIcon";
import { Cascadia_Code } from "next/font/google";

const cascadia = Cascadia_Code({
    subsets: ["latin"],
    weight: ["400", "700"],
    display: "swap",
});

type PublicPricelistCardProps = {
    itemId: number;
    name: string;
    buyPrice: number;
    marketPrice: number | null;
    bulkBuyPrice: number | null;
    bulkThreshold: number | null;
    isFavorite: boolean;
    onToggleFavorite: (itemId: number, name: string) => void;
};

const formatMoney = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "N/A";

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDelta = (buyPrice: number, marketPrice: number | null) => {
    if (!marketPrice || marketPrice <= 0) {
        return {
            label: "—",
            tone: "text-muted",
        };
    }

    const percentage = ((buyPrice - marketPrice) / marketPrice) * 100;
    const rounded = Math.abs(percentage).toFixed(1);

    if (Math.abs(percentage) < 0.05) {
        return {
            label: "0.0%",
            tone: "text-info",
        };
    }

    if (percentage > 0) {
        return {
            label: `+${rounded}%`,
            tone: "text-success",
        };
    }

    return {
        label: `-${rounded}%`,
        tone: "text-danger",
    };
};

export function PublicPricelistCard({
    itemId,
    name,
    buyPrice,
    marketPrice,
    bulkBuyPrice,
    bulkThreshold,
    isFavorite,
    onToggleFavorite,
}: PublicPricelistCardProps) {
    const delta = formatDelta(buyPrice, marketPrice);

    return (
        <article 
            className="group relative flex items-center justify-between bg-panel/70 px-4 py-2 hover:bg-panel-elevated"
        >
            <button
                type="button"
                className={`absolute inset-y-0 left-0 overflow-hidden transition-all duration-300 z-10 flex items-center justify-center cursor-pointer ${
                    isFavorite 
                        ? "w-1 bg-warning group-hover:w-16 group-hover:bg-warning/20 border-r border-transparent group-hover:border-warning/50 backdrop-blur-[2px]" 
                        : "w-1 bg-transparent group-hover:w-16 group-hover:bg-panel border-r border-transparent group-hover:border-border backdrop-blur-[2px]"
                }`} 
                onClick={(e) => {
                    e.preventDefault();
                    onToggleFavorite(itemId, name);
                }}
                title={isFavorite ? "Remove favorite" : "Add favorite"}
            >
                <div className="opacity-0 transition-opacity whitespace-nowrap group-hover:opacity-100">
                    <svg className={`w-8 h-8 ${isFavorite ? 'text-warning fill-warning' : 'text-muted fill-transparent group-hover:text-primary group-hover:fill-primary/20'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                </div>
            </button>

            <div className="flex items-center gap-4 min-w-0 flex-1 relative">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                    {name.toLowerCase().includes("flower set") || name.toLowerCase().includes("plushie set") ? (
                        <ItemSetIcon name={name} className="h-12 w-12" />
                    ) : itemId > 0 ? (
                        <Image
                            src={`https://www.torn.com/images/items/${itemId}/large.png`}
                            alt={formatItemName(name)}
                            width={64}
                            height={64}
                            className="h-12 w-12 object-contain drop-shadow-sm transition-transform group-hover:scale-110"
                            loading="lazy"
                        />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-foreground/10" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-xl font-medium text-foreground leading-tight">
                        {formatItemName(name)}
                    </h2>
                    {(bulkThreshold || bulkBuyPrice) && (
                        <div className="flex items-center gap-2 mt-0.5 opacity-70">
                            {bulkThreshold ? (
                                <span className="text-[10px] uppercase text-info">
                                    Bulk {bulkThreshold}+
                                </span>
                            ) : null}
                            {bulkBuyPrice ? (
                                <span className={`text-[10px] text-foreground ${cascadia.className}`}>
                                    @ {formatMoney(bulkBuyPrice)}
                                </span>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>

            <div className={`flex shrink-0 flex-col items-end gap-0.5 ml-4 ${cascadia.className}`}>
                <p className="text-[15px] font-bold text-foreground">
                    {formatMoney(buyPrice)}
                </p>
                <div className={`text-[11px] font-bold ${delta.tone}`}>
                    {delta.label}
                </div>
            </div>
        </article>
    );
}

