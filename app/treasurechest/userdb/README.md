# User Database Viewer

A developer tool to inspect the local IndexedDB data managed by Dexie.js.

## Files

- `page.tsx`: The main client-side page for browsing databases, tables, and records.

## Features

- **Database Selection:** Switch between different Dexie database instances defined in the schema registry.
- **Table Navigation:** Sidebar listing all tables in the selected database.
- **Paginated View:** Displays table data in a modern, paginated grid (200 records per page).
- **Object Inspection:** Automatically stringifies nested objects for quick viewing.
