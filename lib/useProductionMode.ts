/**
 * Returns whether the app is running in production mode.
 * @returns (boolean): True if production mode is enabled
 */
export function useProductionMode(): boolean {
    if (typeof window === "undefined") {
        return process.env.NEXT_PUBLIC_PRODUCTION_MODE === "true";
    }
    return process.env.NEXT_PUBLIC_PRODUCTION_MODE === "true";
}
