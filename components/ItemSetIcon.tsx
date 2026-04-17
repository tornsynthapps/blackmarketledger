"use client";

import React from "react";
import { FLOWER_SET_ITEMS, PLUSHIE_SET_ITEMS } from "@/lib/old/parser";

interface ItemSetIconProps {
    name: string;
    className?: string;
}

export const ItemSetIcon: React.FC<ItemSetIconProps> = ({ name, className }) => {
    const isFlower = name.toLowerCase().includes("flower");
    const isPlushie = name.toLowerCase().includes("plushie");

    const items = isFlower ? FLOWER_SET_ITEMS : isPlushie ? PLUSHIE_SET_ITEMS : [];

    if (items.length === 0) return null;

    // Use a 3x3 grid for a "square" look (9 items)
    const displayItems = items;

    return (
        <div className={`grid grid-cols-3 content-center justify-items-center ${className}`}>
            {displayItems.map((item) => (
                <img
                    key={item.id}
                    src={`https://www.torn.com/images/items/${item.id}/large.png`}
                    alt={item.name}
                    className="w-full h-full object-contain bg-foreground/[0.02] rounded-sm p-0.5 shadow-sm"
                    loading="lazy"
                />
            ))}
        </div>
    );
};
