# InstaSnap AI Coding Guide

## Project Overview
InstaSnap is a Chrome extension for tracking Instagram follower/following lists using **differential storage** architecture. It takes periodic snapshots and efficiently stores only deltas between snapshots (every 20th is a full checkpoint).

**Tech Stack**: Vue 3 + TypeScript, Vite + @crxjs/vite-plugin, Pinia stores, Vitest, Tailwind CSS 4, IndexedDB (Dexie), pnpm

## Architecture & Key Patterns

### Multi-Context Chrome Extension
The extension has 4 execution contexts that communicate via `chrome.runtime.sendMessage`:
1. **Background Service Worker** ([src/background.ts](../src/background.ts)) - Manages alarms, scheduled snapshots, Chrome APIs
2. **Content Script** ([src/content/content.ts](../src/content/content.ts)) - Injected into Instagram pages, scrapes data via Instagram GraphQL
3. **Popup** ([src/popup/Popup.vue](../src/popup/Popup.vue)) - Quick snapshot actions on current profile
4. **Dashboard** ([src/dashboard/Dashboard.vue](../src/dashboard/Dashboard.vue)) - Full-page analytics UI

### Storage Architecture (CRITICAL)
**IndexedDB with Dexie.js** in [src/utils/database.ts](../src/utils/database.ts):
- Every **20 snapshots** creates a **checkpoint** (full follower/following lists)
- Intermediate snapshots store only **deltas** (`add`/`rem` arrays)
- Three main tables: `userMetadata`, `snapshots`, `crons`
- Compound indexes for efficient queries: `[belongToId+timestamp]`, `[belongToId+isCheckpoint+timestamp]`
- **Always** use `database.saveSnapshot()` - it handles checkpoint vs delta logic automatically

**Key Database Methods**:
- `saveSnapshot(uid, timestamp, followerIds, followingIds)` - Auto checkpointing
- `getFullList(uid, upToTimestamp?, isFollowers)` - Rebuild full list from checkpoint + deltas
- `getSnapshotHistory(uid, isFollowers)` - Get history timeline
- `getAllTrackedUsersWithMetadata()` - Dashboard data
- `saveCron(uid, interval, lastRun)` / `getCron(uid)` / `deleteCron(uid)` - Cron management

chrome.storage is **only used for**:
- `chrome.storage.session` for user locks (prevent duplicate snapshots)
- `chrome.storage.local` for: `appId`, `csrfToken`, `wwwClaim` (Instagram API credentials)

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

### Vue Component Patterns
- **Script setup** with TypeScript (`<script setup lang="ts">`)
- Icons: `unplugin-icons` with `~icons/` imports (e.g., `~icons/fa6-solid/camera`)
- Tailwind v4 with `@import "tailwindcss"` in CSS
- No `emits` needed with `<script setup>` - direct `defineEmits()`

## Common Tasks

### Adding New IndexedDB Tables/Fields
1. Update schema in [src/types/database.d.ts](../src/types/database.d.ts)
2. Increment version number in `database.ts` constructor
3. Add migration logic if needed: `this.version(2).stores({...})`
4. Use Dexie compound indexes for query optimization

### Creating Message Actions
1. Add action type to [src/constants/actions.ts](../src/constants/actions.ts)
2. Add handler in [src/background.ts](../src/background.ts) `onMessage.addListener`
3. Register in content script [src/content/content.ts](../src/content/content.ts) if page interaction needed

### Debugging Extension
- Load `dist/` folder as unpacked extension after `pnpm build`
- Background logs: Extensions → InstaSnap → Service Worker → Console
- Content script logs: Instagram page → DevTools Console
- IndexedDB: DevTools → Application → IndexedDB → InstaSnapDB
- Use `createLogger(context)` for structured logging

## Project-Specific Rules

1. **Never bypass storage lock**: Always use `appStore.tryLockUser()` before snapshots
2. **Use IndexedDB for data**: chrome.storage is **only** for locks and Instagram API tokens
3. **Path aliases**: Use `@/` for absolute imports (resolves to `src/`)
4. **Unused vars**: Prefix with `_` (e.g., `_sender`) - enforced by ESLint
5. **No `console.*` in production**: Use `logger.info/warn/error` from [src/utils/logger.ts](../src/utils/logger.ts)
6. **Chrome API types**: Import from `@types/chrome`, not `chrome-types`

## Integration Points

- **Vite + CRX Plugin**: Hot reload works for popup/dashboard, not background worker (requires full reload)
- **Alarms API**: Background triggers cron snapshots every 30 minutes via `CHECK_SNAPSHOT_SUBSCRIPTIONS`
- **Storage Sync**: Background broadcasts lock changes to content script via `storage.onChanged`
- **Content Script → Page**: Reads Instagram state by parsing DOM (`findAppId`, `findUserId`)
