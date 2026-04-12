import { LocalStorageInterface } from "./old/interfaces/localstorage";

const DEBUG =
    process.env.NEXT_PUBLIC_DEBUG === "true" ||
    LocalStorageInterface.isDebugModeOn() ||
    process.env.DEBUG === "true";

export function mydebug(object: any, message?: string): void {
    if (DEBUG) {
        console.log(message, object);
    }
}
