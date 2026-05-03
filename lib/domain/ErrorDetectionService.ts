import { BaseService } from "./BaseService";

/**
 * Service for detecting inconsistencies and errors in item logs.
 */
export class ErrorDetectionService extends BaseService {
    protected get SERVICE_NAME() {
        return "ErrorDetectionService";
    }

    // TODO: Check for manual-transfer logs with more than 2 logs.
}
