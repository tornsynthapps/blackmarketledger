import { KeyNotFoundError, LocalStorageInterface } from "@/lib/interfaces/localstorage";
import { TornAPI } from "@/lib/game/api";
import { TornUser } from "@/lib/game/user";
import { mydebug } from "../debug";

// Cache data to reduce calls to LocalStorageInterface
let user: TornUser | null = null;

export class MetadataInterface {
    /**
     * Returns the user ID from the LocalStorageInterface.
     */
    static async getUserID(): Promise<number> {
        if (!user) {
            try {
                user = LocalStorageInterface.getUser();
            } catch (error) {
                if (error instanceof KeyNotFoundError) {
                    const response = await TornAPI.getBasicUserDetails();
                    mydebug(response, "MetadataInterface.getUserID: User details fetched");
                    user = new TornUser(response.id, response.name);
                    LocalStorageInterface.setUser(user);
                } else {
                    throw error;
                }
            }
        }
        return user.id;
    }
}
