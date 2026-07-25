import { describe, it, expect } from "vitest";
import { DataManagementService } from "./DataManagementService";

describe("DataManagementService", () => {
    it("should instantiate and execute clearAllData cleanly", async () => {
        const service = new DataManagementService();
        await expect(service.clearAllData()).resolves.not.toThrow();
    });
});
