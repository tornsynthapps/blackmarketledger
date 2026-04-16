"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotFound() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const match = pathname.match(/^\/pricelist\/(\d+)$/);
        if (!match) return;

        router.replace(`/pricelist?userID=${match[1]}`);
    }, [pathname, router]);

    return (
        <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
            <h1 className="text-4xl text-foreground">Page Not Found</h1>
            <p className="font-mono text-sm uppercase tracking-[0.18em] text-muted">
                This path does not exist.
            </p>
            <Link
                href="/pricelist?userID=3165209"
                className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
            >
                Open Pricelist
            </Link>
        </div>
    );
}
