"use client";

import { UnderConstructionPage } from "./UnderConstructionPage";

/**
 * Wrapper that shows UnderConstructionPage in production mode when underConstruction flag is true.
 * @param component (React.ComponentType): The page component to wrap
 * @param underConstruction (boolean): Whether this page is under construction
 * @returns (React.ComponentType): The wrapped component
 */
export function withUnderConstruction<T extends React.ComponentType<any>>(
    component: T,
    underConstruction: boolean
): T {
    if (!underConstruction) {
        return component;
    }

    const isProduction = process.env.NEXT_PUBLIC_PRODUCTION_MODE === "true";

    if (isProduction) {
        return UnderConstructionPage as any;
    }

    return component;
}
