# Domain Services

This folder contains the business logic for the application, organized into service classes. Services interact with domain objects and registries to perform complex operations and enforce business rules.

## Files

- **BaseService.ts**: Abstract base class for all domain services.
- **ItemLogService.ts**: Service for managing item logs, including UID-aware persistence, retrieval, wrapper recalculation, and cost-basis updates through the `ItemLogRegistry`.
