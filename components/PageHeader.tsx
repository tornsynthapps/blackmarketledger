"use client";

import { HugeiconsIcon } from "@hugeicons/react";

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: any;
    children?: React.ReactNode;
}

/**
 * A minimal wrapper component for page titles and descriptions.
 * Ensures consistent styling across all pages.
 */
export function PageHeader({ title, description, icon: Icon, children }: PageHeaderProps) {
    return (
        <div className="bg-panel border-2 border-primary p-4 relative overflow-hidden flex items-center justify-between mb-6">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rotate-45 pointer-events-none" />
            <div className="flex items-center gap-4">
                {Icon && <HugeiconsIcon icon={Icon} size={24} className="text-primary" />}
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter leading-none">{title}</h1>
                    {description && (
                        <p className="font-mono text-[9px] text-muted uppercase tracking-widest mt-1">{description}</p>
                    )}
                </div>
            </div>
            {children && <div className="z-10">{children}</div>}
        </div>
    );
}
