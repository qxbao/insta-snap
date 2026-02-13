# InstaSnap AI Coding Guide

## Project Overview
InstaSnap is a Chrome extension for tracking Instagram follower/following lists using **differential storage** architecture. It takes periodic snapshots and efficiently stores only deltas between snapshots (every 20th is a full checkpoint).

**Tech Stack**: Vue 3 + TypeScript, Vite + @crxjs/vite-plugin, Pinia stores, Vitest, Tailwind CSS 4, IndexedDB (Dexie), pnpm

## Architecture & Key Patterns

### Multi-Context Chrome Extension
The extension has 4 execution contexts that communicate via `chrome.runtime.sendMessage`:
1. **Background Service Worker** ([src/background.ts](../src/background.ts)) - Orchestrates lifecycle events
2. **Background Service** ([src/utils/bg-service.ts](../src/utils/bg-service.ts)) - Core business logic, encryption, alarms, message routing
3. **Content Script** ([src/content/content.ts](../src/content/content.ts)) - Injected into Instagram pages, scrapes data via Instagram GraphQL
4. **Popup** ([src/popup/Popup.vue](../src/popup/Popup.vue)) - Quick snapshot actions on current profile
5. **Dashboard** ([src/dashboard/Dashboard.vue](../src/dashboard/Dashboard.vue)) - Full-page analytics UI

### Security Architecture (NEW)
**End-to-End Encryption** for sensitive credentials:
- All Instagram API tokens (`appId`, `csrfToken`, `wwwClaim`) are **encrypted at rest**
- AES-GCM encryption via Web Crypto API in [src/utils/encrypt.ts](../src/utils/encrypt.ts)
- Master encryption key stored as `CryptoKey` in IndexedDB `internalConfig` table
- `BackgroundService` manages encryption lifecycle:
  - `checkSecurityConfig()` - Initialize/load encryption key on startup
  - `ensureReady()` - Guard for secure operations
  - Auto-migration from legacy `chrome.storage.local` to encrypted IndexedDB

**Encryption Flow**:
```typescript
// Write encrypted config
await database.writeEncryptedConfig("appId", value, encryptor);

// Read encrypted config  
const appId = await database.readEncryptedConfig("appId", encryptor);
```

### Storage Architecture (CRITICAL)
**IndexedDB with Dexie.js** in [src/utils/database.ts](../src/utils/database.ts):
- Every **20 snapshots** creates a **checkpoint** (full follower/following lists)
- Intermediate snapshots store only **deltas** (`add`/`rem` arrays)
- Four main tables: `userMetadata`, `snapshots`, `crons`, `internalConfig` (NEW)
- Compound indexes for efficient queries: `[belongToId+timestamp]`, `[belongToId+isCheckpoint+timestamp]`
- **Always** use `database.saveSnapshot()` - it handles checkpoint vs delta logic automatically

**Key Database Methods**:
- `saveSnapshot(uid, timestamp, followerIds, followingIds)` - Auto checkpointing
- `getFullList(uid, upToTimestamp?, isFollowers)` - Rebuild full list from checkpoint + deltas
- `getSnapshotHistory(uid, isFollowers)` - Get history timeline
- `getAllTrackedUsersWithMetadata()` - Dashboard data
- `saveCron(uid, interval, lastRun)` / `getCron(uid)` / `deleteCron(uid)` - Cron management
- `writeEncryptedConfig(key, value, encryptor)` / `readEncryptedConfig(key, encryptor)` - Secure storage (NEW)

**Storage Migration Path**:
1. Legacy: `chrome.storage.local` (plaintext credentials) ❌
2. Current: IndexedDB `internalConfig` (encrypted) ✅
3. Auto-migration runs on extension install/update

chrome.storage is **only used for**:
- `chrome.storage.session` for user locks (prevent duplicate snapshots)
- ⚠️ **Do NOT use `chrome.storage.local` for new features** - use encrypted IndexedDB

### Instagram Data Collection
[src/utils/instagram.ts](../src/utils/instagram.ts) uses Instagram's private GraphQL API:
- Query hashes: `c76146de99bb02f6415203be841dd25a` (followers), `d04b0a864b4b54837c0d870b0e77e076` (following)
- Paginated requests (50 users/request) using `after` cursors
- Requires `appId`, `csrfToken`, `wwwClaim` extracted from page HTML
- CORS handled by declarativeNetRequest rules ([src/constants/rules.ts](../src/constants/rules.ts))

### State Management
Two Pinia stores ([src/stores/](../src/stores/)):
- **app.store.ts**: User locks (prevent duplicate snapshots), cron schedules, tracked users list
- **ui.store.ts**: UI progress indicators for snapshot operations

User locks in `chrome.storage.session` expire after 10 minutes (`LOCK_TIMEOUT`)

### Background Service Architecture (NEW)
[src/utils/bg-service.ts](../src/utils/bg-service.ts) is the **single source of truth** for:
- **Encryption lifecycle**: Key generation, loading, validation
- **Message routing**: All `chrome.runtime.onMessage` handlers
- **Alarm management**: Cron snapshot scheduling (30min intervals)
- **Secure operations**: Guards via `ensureReady()` before handling sensitive data

**Key Methods**:
- `checkSecurityConfig()` - Initialize encryption + migrate legacy data
- `ensureReady()` - Async guard ensuring encryptor is ready
- `registerMessageListener()` - Main message router with security checks
- `initializeAlarms()` - Setup periodic snapshot alarms
- `handleAlarm()` - Process cron snapshots with abort support

**Secure Action Pattern**:
```typescript
// Actions requiring encryption
const secureActions = [ActionType.SEND_APP_DATA];

if (secureActions.includes(message.type)) {
  await this.ensureReady(); // Block until encryptor ready
  // ... handle secure operation
}
```

## Development Workflows

### Running & Building
```bash
pnpm dev          # Development with HMR (port 5173)
pnpm build        # Production build to dist/
pnpm test         # Vitest watch mode
pnpm test:coverage # Coverage report (60% threshold)
pnpm lint:fix     # Auto-fix ESLint issues
```

### Testing Conventions
- **happy-dom** environment (not jsdom)
- Chrome API mocked in [src/tests/setup.ts](../src/tests/setup.ts)
- Test files: `*.test.ts` or `*.spec.ts` in [src/tests/](../src/tests/)
- Use `vi.fn()` for mocks, not jest
- Mock `Encryptor` and `database` for security tests

### Vue Component Patterns
- **Script setup** with TypeScript (`<script setup lang="ts">`)
- Icons: `unplugin-icons` with `~icons/` imports (e.g., `~icons/fa6-solid/camera`)
- Tailwind v4 with `@import "tailwindcss"` in CSS
- No `emits` needed with `<script setup>` - direct `defineEmits()`

## Common Tasks

### Adding New Encrypted Config
1. Write: `await database.writeEncryptedConfig("myKey", "value", encryptor)`
2. Read: `const val = await database.readEncryptedConfig("myKey", encryptor)`
3. Add to migration if replacing `chrome.storage.local` key

### Adding New IndexedDB Tables/Fields
1. Update schema in [src/types/database.d.ts](../src/types/database.d.ts)
2. Increment version number in `database.ts` constructor
3. Add migration logic if needed: `this.version(3).stores({...})`
4. Use Dexie compound indexes for query optimization

### Creating Message Actions
1. Add action type to [src/constants/actions.ts](../src/constants/actions.ts)
2. Add handler in `BackgroundService.routeMessage()` in [src/utils/bg-service.ts](../src/utils/bg-service.ts)
3. If action uses encryption, add to `secureActions` array in `registerMessageListener()`
4. Return `true` for async handlers to keep message channel open

### Adding New Alarm/Cron Jobs
1. Create alarm in `BackgroundService.initializeAlarms()`
2. Handle in `BackgroundService.handleAlarm()` with abort controller support
3. Use `ensureReady()` if accessing encrypted credentials

### Debugging Extension
- Load `dist/` folder as unpacked extension after `pnpm build`
- Background logs: Extensions → InstaSnap → Service Worker → Console
- Content script logs: Instagram page → DevTools Console
- IndexedDB: DevTools → Application → IndexedDB → InstaSnapDB
  - Check `internalConfig` table for encrypted values (stored as `ArrayBuffer`)
- Use `createLogger(context)` for structured logging

## Project-Specific Rules

1. **Never bypass storage lock**: Always use `appStore.tryLockUser()` before snapshots
2. **Use encrypted IndexedDB for credentials**: `chrome.storage.local` is legacy only
3. **Security-first message handling**: Use `ensureReady()` guard before accessing `encryptor`
4. **Path aliases**: Use `@/` for absolute imports (resolves to `src/`)
5. **Unused vars**: Prefix with `_` (e.g., `_sender`) - enforced by ESLint
6. **No `console.*` in production**: Use `logger.info/warn/error` from [src/utils/logger.ts](../src/utils/logger.ts)
7. **Chrome API types**: Import from `@types/chrome`, not `chrome-types`
8. **Keep message channel open**: Return `true` from `registerMessageListener` for async operations
9. **Type validation**: Always validate `CryptoKey` with `instanceof` before use
10. **Abort controller**: Support graceful cancellation in long-running operations (alarms)

## Integration Points

- **Vite + CRX Plugin**: Hot reload works for popup/dashboard, not background worker (requires full reload)
- **Alarms API**: Background triggers cron snapshots every 30 minutes via `CHECK_SNAPSHOT_SUBSCRIPTIONS`
- **Storage Sync**: Background broadcasts lock changes to content script via `storage.onChanged`
- **Content Script → Page**: Reads Instagram state by parsing DOM (`findAppId`, `findUserId`)
- **Encryption Layer**: All credential storage goes through `Encryptor` + IndexedDB `internalConfig`
- **Message Security**: `BackgroundService` validates security readiness before routing sensitive messages

## Security Considerations

### Encryption Best Practices
- **Never log** decrypted credentials (`appId`, `csrfToken`, `wwwClaim`)
- **Always await** `ensureReady()` before using `encryptor`
- **Validate types**: Check `value instanceof CryptoKey` when loading from IndexedDB
- **Error handling**: Catch encryption failures and throw meaningful errors
- **Key persistence**: Master key stored as non-extractable `CryptoKey` in IndexedDB

### Migration Safety
- Auto-migration runs **once** on install/update
- Legacy `chrome.storage.local` keys deleted after successful migration
- Parallel reads (check both sources) during transition
- Fail-safe: Keep old data if migration fails

### Threat Model
- **Protected**: Instagram API credentials at rest (disk encryption)
- **Not protected**: Data in transit (relies on Instagram HTTPS)
- **Not protected**: Extension code (user can inspect/modify)
- **Mitigated**: XSS via CSP + declarativeNetRequest rules
