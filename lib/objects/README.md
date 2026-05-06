# `lib/objects`

Object models and Dexie registries for persisted domain data.

## Files

- `BaseObject.ts`: Shared base object metadata and a generic Dexie registry for object persistence.
- `ItemLog.ts`: Item log domain object plus a Dexie registry for storing and reading item logs.
- `ItemLogWrapper.ts`: Item log wrapper domain object plus a Dexie registry for grouping related item log entries.
- `SystemLog.ts`: System log domain object plus a Dexie registry for application-wide logging.
- `Trade.ts`: Trade domain object plus a Dexie registry for persisting Torn trade data.
