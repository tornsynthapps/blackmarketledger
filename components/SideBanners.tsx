"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface PromoBannersProps {
  className?: string;
}

export function PromoBannersDesktop({ className }: PromoBannersProps) {
  return (
    <div className={cn("max-w-6xl mt-2 mb-2 mx-auto px-4 h-full flex items-center justify-end gap-3 promo-banners-top", className)}>
      {/* Discord */}
      <a
        href="https://discord.gg/Xz4GZfh4ep"
        target="_blank"
        rel="noreferrer noopener"
        className="group flex items-center h-8 bg-[#5865f2] hover:bg-[#4752c4] transition-all duration-200 border border-black/10 shrink-0 px-3"
      >
        <div className="h-full w-auto py-2.5">
          <Image
            src="/discord/logo/light.png"
            alt="Discord"
            width={100}
            height={40}
            className="h-full w-auto object-contain"
          />
        </div>
      </a>

      {/* Buy me a coffee */}
      <a
        href="https://buymeacoffee.com/pixelghost3165209"
        target="_blank"
        rel="noreferrer noopener"
        className="group flex items-center h-8 hover:opacity-90 transition-all duration-200 border border-black/10 shrink-0"
      >
        <Image
          src="/bmcbrand/buttons/red-button.png"
          alt="Buy me a coffee"
          width={200}
          height={60}
          className="h-full w-auto"
        />
      </a>
    </div>
  );
}
