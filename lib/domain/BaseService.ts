import { Logger } from "./Logger";

/**
 * Abstract base class for all domain services.
 * Provides a common foundation for business logic services.
 */
export abstract class BaseService {
    /**
     * The name of the service used for logging and identification.
     */
    protected get SERVICE_NAME(): string {
        return "BaseService";
    };

    /**
     * Logger instance for the service.
     */
    protected readonly logger: Logger;

    /**
     * Creates a new instance of the base service.
     * @returns (BaseService): Base service instance
     * @sideEffects Initializes the service logger
     */
    protected constructor() {
        // Initialize logger using the SERVICE_NAME getter
        this.logger = new Logger(this.SERVICE_NAME);
    }
}
