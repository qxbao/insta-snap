# InstaSnap Architecture

This document provides a comprehensive overview of the architecture and design decisions behind the InstaSnap browser extension. It covers the core components, data flow, storage mechanisms, security considerations, and development workflows that make up the extension. Use this as a primary reference for architectural understanding, feature implementation, or as context for AI-assisted development.

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Extension Contexts](#extension-contexts)
- [Storage Architecture](#storage-architecture)
- [Security Architecture](#security-architecture)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Instagram API Integration](#instagram-api-integration)
- [Key Design Patterns](#key-design-patterns)
- [Build System](#build-system)

---

## Project Overview

InstaSnap is a browser extension that enables users to track Instagram follower/following lists through an efficient **differential storage** architecture. The extension takes periodic snapshots and stores only the differences (deltas) between consecutive snapshots, with full checkpoints created every 20 snapshots for data integrity.

**Key Features:**

- Manual and automated snapshot scheduling
- Differential storage for space efficiency
- End-to-end encryption for sensitive credentials
- Local-only data storage (no external servers)
- Comprehensive analytics dashboard
- Cross-browser compatibility (Chrome, Firefox)

---

## Technology Stack

### Core Framework

- **Vue 3** with Composition API (`<script setup>`)
- **TypeScript** for type safety
- **Pinia** for state management
- **Vue I18n** for internationalization

### Build Tools

- **Vite** - Fast build tool and dev server
- **@crxjs/vite-plugin** - Chrome extension development
- **pnpm** - Package manager (v10.28.2)

### UI & Styling

- **Tailwind CSS 4** - Utility-first CSS framework
- **unplugin-icons** - Icon components on-demand
- **ECharts** - Data visualization

### Storage & Encryption

- **IndexedDB** via **Dexie.js** - Client-side database
- **Web Crypto API** - AES-GCM encryption, with non-extractable keys

### Testing

- **Vitest** - Unit testing framework
- **@testing-library/vue** - Component testing
- **happy-dom** - DOM simulation
- **fake-indexeddb** - IndexedDB mocking

### Browser APIs

- **webextension-polyfill** - Cross-browser WebExtension API

---

## Architecture Overview

InstaSnap follows a **multi-context browser extension architecture** with four isolated execution environments that communicate via message passing:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Extension                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────────────┐     │
│  │  Background      │◄────────►│  Background Service      │     │
│  │  Service Worker  │  manages │  (bg-service.ts)         │     │
│  │  (background.ts) │          │  - Business Logic        │     │
│  └──────────────────┘          │  - Encryption Lifecycle  │     │
│           │                    │  - Message Router        │     │
│           │                    │  - Alarm Handler         │     │
│           │                    └──────────────────────────┘     │
│           │                                  │                  │
│           ▼                                  ▼                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              IndexedDB (InstaSnapDB)                │        │
│  │  - userMetadata   - snapshots                       │        │
│  │  - crons          - internalConfig                  │        │
│  └─────────────────────────────────────────────────────┘        │
│           ▲                                 ▲                   │
│           │                                 │                   │
│  ┌────────┴──────────┐            ┌─────────┴────────┐          │
│  │  Content Script   │            │  User Interfaces │          │
│  │  (content.ts)     │            │  - Popup.vue     │          │
│  │  - DOM Scraping   │            │  - Dashboard.vue │          │
│  │  - GraphQL API    │            │  - Stats         │          │
│  └───────────────────┘            └──────────────────┘          │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
            ▼
  ┌─────────────────────┐
  │  Instagram.com      │
  │  - User profiles    │
  │  - GraphQL API      │
  └─────────────────────┘
```

---

## Extension Contexts

### 1. Background Service Worker ([background.ts](src/background.ts))

**Purpose:** Extension lifecycle orchestrator

**Responsibilities:**

- Initialize on install/update/startup
- Register declarativeNetRequest rules for CORS
- Trigger data migration from legacy storage
- Setup alarm schedulers
- Initialize BackgroundService singleton
- Route storage change events

**Key Events:**

```typescript
browser.runtime.onInstalled // Setup declarativeNetRequest rules, migrate data, init alarms
browser.runtime.onStartup // Check security config
browser.storage.onChanged // Broadcast lock changes
browser.runtime.onMessage // Delegate to BackgroundService
browser.alarms.onAlarm // Delegate to BackgroundService
```

### 2. Background Service ([bg-service.ts](src/utils/bg-service.ts))

**Purpose:** Core business logic and security coordinator

**Responsibilities:**

- **Encryption Lifecycle:**
  - Generate/load master encryption key
  - Migrate legacy plaintext credentials to encrypted storage
  - Validate cryptographic operations
- **Message Routing:**
  - Handle all `browser.runtime.sendMessage` actions
  - Guard secure operations with `ensureReady()`
- **Alarm Management:**
  - Schedule periodic snapshots (30-min intervals)
  - Process cron jobs with abort controller support
- **Data Operations:**
  - Orchestrate snapshot saves
  - Manage user metadata bulk updates

**Security Guards:**

```typescript
// Actions requiring encryption
const secureActions = [ActionType.SEND_APP_DATA]
if (secureActions.includes(message.type)) {
  await this.ensureReady() // Block until encryptor is ready
}
```

### 3. Content Script ([content.ts](src/content/content.ts))

**Purpose:** Instagram page interaction layer

**Responsibilities:**

- Inject into `https://www.instagram.com/*` pages
- Scrape Instagram GraphQL API credentials from page HTML:
  - `appId` - Instagram App ID
  - `csrfToken` - CSRF token from cookies
  - `wwwClaim` - Session claim header
- Extract user IDs from profile pages
- Fetch paginated follower/following lists via GraphQL
- Send scraped data to background for storage

**Execution Context:**

- Runs in isolated JavaScript environment
- Access to page DOM but not page JavaScript variables
- Communicates via `browser.runtime.sendMessage`

### 4. User Interfaces

#### Popup ([popup/Popup.vue](src/popup/Popup.vue))

- **Trigger:** Click extension icon
- **Purpose:** Quick snapshot actions on current Instagram profile. A new profile first record must be captured using Popup.
- **Features:** Start snapshot, view progress, access dashboard

#### Dashboard ([dashboard/Dashboard.vue](src/dashboard/Dashboard.vue))

- **Trigger:** Click "Options" in extension menu
- **Purpose:** Full analytics and management UI
- **Features:**
  - View all tracked users with avatars/usernames
  - Snapshot history timeline
  - Growth analytics with charts (ECharts)
  - User comparison (followers/unfollowers)
  - Cron job scheduling

---

## Storage Architecture

### IndexedDB Schema ([database.ts](src/utils/database.ts))

**Database:** `InstaSnapDB` (Dexie v3)

#### Tables

**1. userMetadata**

To display user info without extra API calls, we store basic metadata for each tracked user. Avatar URL might be expired after some time, but we update it on every snapshot.

```typescript
interface UserMetadata {
  id: string // Instagram user ID (primary key)
  username: string // @username
  fullName: string // Display name
  avatarURL: string // Profile picture URL
  updatedAt: number // Last update timestamp
}
// Indexes: id, username
```

**2. snapshots**

Records all snapshots with differential storage. Each snapshot references a user (belongToId) and contains either a full checkpoint or a delta of changes.

```typescript
interface SnapshotData {
  id?: number // Auto-increment primary key
  belongToId: string // User ID
  isCheckpoint: number // 1 = full snapshot, 0 = delta
  timestamp: number // Snapshot time (ms)
  followers: {
    add: string[] // New followers (or full list if checkpoint)
    rem: string[] // Removed followers
  }
  following: {
    add: string[] // New following (or full list if checkpoint)
    rem: string[] // Removed following
  }
}
// Indexes: [belongToId+timestamp], [belongToId+isCheckpoint+timestamp]
```

**3. crons**

To manage automated snapshot schedules, we store cron configurations for each user. The background service checks this table on every alarm trigger to determine which users need snapshots.

```typescript
interface SnapshotCron {
  uid: string // User ID (primary key)
  interval: number // Interval in hours (min: 1, max: 168)
  lastRun: number // Last execution timestamp (ms)
}
// Indexes: uid, lastRun
```

**4. internalConfig** (v3 - Encrypted Storage)

For sensitive data like API credentials, we encrypt data before storing with AES-GCM and includes the IV for decryption (`EncryptedData` struct). The master key is non-extractable and stored securely in IndexedDB.

```typescript
interface InternalConfig {
  key: string // Config key (primary key)
  value: string | number | boolean | CryptoKey | EncryptedData
}
// Used for: encryptionKey, appId, csrfToken, wwwClaim
```

### Differential Storage Algorithm

**Checkpoint Strategy:**

- Every **20 snapshots** creates a **checkpoint** (full lists)
- Intermediate snapshots store only **deltas** (add/rem arrays)
- Reduces storage by ~95% for typical usage

**Save Flow:**

```typescript
async saveSnapshot(uid, timestamp, followerIds, followingIds) {
  // 1. Find last checkpoint before this timestamp
  const lastCheckpoint = await findLastCheckpoint(uid, timestamp);

  // 2. Count snapshots since checkpoint
  const snapshotsSinceCheckpoint = await countSinceCheckpoint(uid, lastCheckpoint);

  // 3. Decide: checkpoint or delta?
  if (snapshotsSinceCheckpoint >= 20 || !lastCheckpoint) {
    // Save as checkpoint (full lists in 'add' array, empty 'rem')
    return saveCheckpoint(uid, timestamp, followerIds, followingIds);
  }

  // 4. Calculate delta from previous state
  const previousState = await reconstructFullList(uid, timestamp - 1);
  const delta = {
    followers: {
      add: followerIds.filter(id => !previousState.followers.has(id)),
      rem: Array.from(previousState.followers).filter(id => !followerIds.includes(id))
    },
    following: { /* same logic */ }
  };
  return saveDelta(uid, timestamp, delta);
}
```

**Read Flow (Reconstruct Full List):**

```typescript
async getFullList(uid, upToTimestamp?, isFollowers = true) {
  // 1. Find nearest checkpoint <= timestamp
  const checkpoint = await findCheckpoint(uid, upToTimestamp);

  // 2. Start with checkpoint data
  const result = new Set(checkpoint.followers.add);

  // 3. Apply all deltas chronologically
  const deltas = await getSnapshotsBetween(checkpoint.ts, upToTimestamp);
  for (const delta of deltas) {
    delta.followers.add.forEach(id => result.add(id));
    delta.followers.rem.forEach(id => result.delete(id));
  }

  return Array.from(result);
}
```

### Storage Migration ([migrate.ts](src/utils/migrate.ts))

**Legacy System:** `browser.storage.local` (flat key-value pairs, unencrypted)

**Current System:** IndexedDB (encrypted credentials, structured tables)

**Migration Trigger:**

- On extension install/update
- Runs in `BackgroundService.checkSecurityConfig()`

**Migration Process:**

1. Check for encryption key in `internalConfig`
2. Generate new AES-GCM key if missing
3. Read legacy data from `browser.storage.local`:
   - `snapShots_*` → `snapshots` table
   - `usersMetadata_*` → `userMetadata` table
   - `snapshotCron_*` → `crons` table
4. Encrypt credentials (`appId`, `csrfToken`, `wwwClaim`)
5. Save to IndexedDB
6. **Delete from `browser.storage.local`** after successful migration

---

## Security Architecture

### E2E Encryption ([encrypt.ts](src/utils/encrypt.ts))

**Algorithm:** AES-GCM-256

**Key Management:**

- **Master Key:** Non-extractable `CryptoKey` stored in IndexedDB `internalConfig.encryptionKey`
- **Lifetime:** Generated once, persists across sessions
- **Extraction:** No (Web Crypto API security)

**Encryption Process:**

```typescript
class Encryptor {
  private key: CryptoKey

  async encrypt(data: string): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12)) // Random IV
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.key,
      new TextEncoder().encode(data),
    )
    return { encrypted, iv } // Store both
  }

  async decrypt(encryptedData: ArrayBuffer, iv: Uint8Array): Promise<string> {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, this.key, encryptedData)
    return new TextDecoder().decode(decrypted)
  }
}
```

**What's Encrypted:**

- Instagram API credentials:
  - `appId` - Application ID
  - `csrfToken` - Cross-Site Request Forgery token
  - `wwwClaim` - Session claim header
- Stored as `{encrypted: ArrayBuffer, iv: Uint8Array}` in `internalConfig` table

**What's NOT Encrypted:**

- Snapshot data (follower/following IDs)
- User metadata (usernames, avatars)
- Cron schedules

### Security Guards

**Background Service Readiness:**

```typescript
// All secure operations must await this
private async ensureReady(): Promise<void> {
  await this.initPromise;
  if (!this.encryptor) {
    throw new Error("Security system failed to initialize");
  }
}

// Usage in message handler
if (secureActions.includes(message.type)) {
  await this.ensureReady(); // Blocks until encryption ready
  const appId = await database.readEncryptedConfig("appId", this.encryptor);
}
```

### Threat Model

| Threat                     | Mitigation                                 | Status                                                                |
| -------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Credential theft from disk | AES-GCM-256 encryption at rest             | ✅ Protected                                                          |
| XSS attacks                | CSP + declarativeNetRequest rules          | ✅ Mitigated                                                          |
| Man-in-the-middle          | Instagram HTTPS (not extension controlled) | ⚠️ Relies on Instagram                                                |
| Extension code tampering   | None                                       | ⚠️ Vulnerable if the extension is not installed through trusted store |
| Data exfiltration          | No network requests (local-only storage)   | ✅ Protected                                                          |

---

## Data Flow

### Snapshot Creation Flow

```
┌─────────┐                                          ┌──────────────┐
│  User   │                                          │   Instagram  │
│ (Popup) │                                          │   GraphQL    │
└────┬────┘                                          └──────▲───────┘
     │                                                      │
     │ 1. Click "Take Snapshot"                             │
     │                                                      │
     ▼                                                      │
┌────────────────────┐                                      │
│  Popup.vue         │                                      │
│  - Validate page   │                                      │
│  - Try lock user   │                                      │
│  - Call content    │                                      │
│    script function │                                      │
└─────────┬──────────┘                                      │
          │                                                 │
          │ 2. Invoke content script                        │
          │                                                 │
          ▼                                                 │
┌─────────────────────────────────────────┐                 │
│  Content Script                         │                 │
│  - Extract appId, csrfToken, wwwClaim   │                 │
│  - Parse user profile (findUserId)      │                 │
│  - Send SEND_APP_DATA to background     │                 │
│  - fetchUsers(followers)                │─────────────────┘
│  - fetchUsers(following)                │ 3. Fetch paginated
└─────────┬───────────────────────────────┘    followers/following
          │                                     (50 users/request)
          │ 4. Send messages to background:
          │    - BULK_UPSERT_USER_METADATA
          │    - SAVE_SNAPSHOT
          │    - NOTIFY_SNAPSHOT_COMPLETE
          ▼
┌─────────────────────────────────────────┐
│  BackgroundService                      │
│  - Route messages                       │
│  - ensureReady() for SEND_APP_DATA      │
│  - Encrypt & save credentials           │
│  - database.bulkUpsertUserMetadata()    │
│  - database.saveSnapshot()              │──┐
│  - Unlock user                          │  │
└─────────────────────────────────────────┘  │
                                             │ 5. Save to IndexedDB
          ┌──────────────────────────────────┘
          ▼
┌─────────────────────────────────────────┐
│  Database.saveSnapshot()                │
│  - Calculate checkpoint vs delta        │
│  - Compute diffs if delta               │
│  - Insert into snapshots table          │
└─────────┬───────────────────────────────┘
          │
          │ 6. Broadcast completion
          │
          ▼
┌─────────────────────────────────────────┐
│  Content Script / Popup                 │
│  - Update progress bar                  │
│  - Show success notification            │
└─────────────────────────────────────────┘
```

### Cron Snapshot Flow

```
┌──────────────────┐
│  browser.alarms  │
│  (every 30 min)  │
└────────┬─────────┘
         │
         │ 1. Alarm "CHECK_SNAPSHOT_SUBSCRIPTIONS" fires
         │
         ▼
┌─────────────────────────────────────────┐
│  BackgroundService.handleAlarm()        │
│  - Check if alarm already processing    │
│  - Create AbortController               │
│  - ensureReady() to load credentials    │
└─────────┬───────────────────────────────┘
          │
          │ 2. Query database.getAllCrons()
          │     and decrypt credentials
          │
          ▼
┌─────────────────────────────────────────┐
│  Filter due crons:                      │
│  crons.filter(c => now - c.lastRun >=   │
│                     c.interval * Hour)  │
│  (interval is in hours)                 │
└─────────┬───────────────────────────────┘
          │
          │ 3. For each due cron:
          │
          ▼
┌─────────────────────────────────────────┐
│  - processCronSnapshot(uid, ...)        │
│    * fetchUsers(followers)              │
│    * fetchUsers(following)              │
│    * bulkUpsertUserMetadata()           │
│    * saveSnapshot()                     │
│    * saveCron() with updated lastRun    │
│  - Wait with jitter (5-15s) between     │
│    users to avoid rate limiting         │
└─────────────────────────────────────────┘
```

---

## State Management

### Pinia Stores ([stores/](src/stores/))

#### 1. App Store ([app.store.ts](src/stores/app.store.ts))

**Purpose:** User lock management and tracking state

```typescript
interface AppState {
  activeLocks: Record<string, number>
  locksLoaded: boolean
  snapshotCrons: SnapshotCron[]
  scLoaded: boolean
  trackedUsers: TrackedUser[]
  trackedUsersLoaded: boolean
  storageMetadata: StorageEstimate | null
}

// Key Methods:
tryLockUser(uid: string): boolean       // Acquire 10-min lock
unlockUser(uid: string): void           // Release lock
loadLocks(): void                       // Load from browser.storage.session
```

**Lock Mechanism:**

- Prevents concurrent snapshots for same user
- Stored in `browser.storage.session` (expires on browser close)
- May be unlocked via Popup
- Timeout: 10 minutes (`LOCK_TIMEOUT`)
- Broadcast via `browser.storage.onChanged` to all contexts

#### 2. UI Store ([ui.store.ts](src/stores/ui.store.ts))

**Purpose:** UI progress indicators

```typescript
interface UIStoreState {
  isNotifyVisible: boolean
  notifyMessage: string
  notifyType: string
  loading: boolean
  progress: {
    target: string
    loaded: number
  }
}

// Key Methods:
showNotification(
  message: string,
  type: "success" | "error" | "info" = "info",
  duration = 3000,
): void
hideNotification(): void
setLoading(isLoading: boolean): void
setLoadingProgress(progress: number, target: string): void
```

#### 3. Modal Store ([modal.store.ts](src/stores/modal.store.ts))

**Purpose:** Dialog management (cron scheduling, confirmations)

---

## Instagram API Integration

### GraphQL Endpoints ([instagram.ts](src/utils/instagram.ts))

**Base URL:** `https://www.instagram.com/graphql/query`

**Query Hashes:**

- Followers: `c76146de99bb02f6415203be841dd25a`
- Following: `d04b0a864b4b54837c0d870b0e77e076`

**Request Format:**

```typescript
const variables = {
  id: uid, // Target user ID
  include_reel: true, // Include story data
  fetch_mutual: true, // Include mutual follow status
  first: 50, // Users per page (max 50)
  after: cursor, // Pagination cursor (null for first page)
}
const url = `${base}/?query_hash=${hash}&variables=${encodeURIComponent(JSON.stringify(variables))}`
```

**Response Structure:**

```typescript
{
  data: {
    user: {
      edge_followed_by: {  // or edge_follow for following
        count: number,
        page_info: {
          has_next_page: boolean,
          end_cursor: string
        },
        edges: [
          {
            node: {
              id: string,
              username: string,
              full_name: string,
              profile_pic_url: string,
              is_verified: boolean
            }
          }
        ]
      }
    }
  }
}
```

### Credential Extraction
Those data stored encrypted in `internalConfig` table

**appId (Instagram App ID):**

```typescript
function findAppId(): string {
  const bodyHTML = document.querySelector("body")?.innerHTML
  const match = bodyHTML?.match(/"APP_ID":"(\d+)"/)
  return match ? match[1] : ""
}
```

**csrfToken:**

```typescript
function exportCSRFToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ""
}
```

**wwwClaim:**

```typescript
const wwwClaim = sessionStorage.getItem("www-claim-v2") || ""
```

### CORS Handling ([rules.ts](src/constants/rules.ts))

**Method:** `declarativeNetRequest` API (Manifest V3)

**Purpose:** Allow extension to access Instagram resources and CDN images cross-origin

```typescript
const EXTENSION_ORIGIN = Browser.runtime.getURL("").slice(0, -1)

export const ExtensionRules: Browser.DeclarativeNetRequest.Rule[] = [
  // Rule 1: Instagram.com API and images
  {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "access-control-allow-origin",
          operation: "set",
          value: EXTENSION_ORIGIN,
        },
        {
          header: "cross-origin-resource-policy",
          operation: "set",
          value: "cross-origin",
        },
        {
          header: "access-control-allow-methods",
          operation: "set",
          value: "GET, POST, OPTIONS",
        },
        {
          header: "access-control-allow-headers",
          operation: "set",
          value: "Content-Type, Authorization",
        },
      ],
    },
    condition: {
      urlFilter: "||instagram.com",
      resourceTypes: ["image", "xmlhttprequest"],
    },
  },
  // Rule 2: Instagram CDN images
  {
    id: 2,
    priority: 2,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "cross-origin-resource-policy",
          operation: "set",
          value: "cross-origin",
        },
        {
          header: "access-control-allow-origin",
          operation: "set",
          value: "*",
        },
      ],
    },
    condition: {
      urlFilter: "||cdninstagram.com",
      resourceTypes: ["image"],
    },
  },
  // Rule 3: Facebook CDN images (used by Instagram)
  {
    id: 3,
    priority: 2,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "cross-origin-resource-policy",
          operation: "set",
          value: "cross-origin",
        },
        {
          header: "access-control-allow-origin",
          operation: "set",
          value: "*",
        },
      ],
    },
    condition: {
      urlFilter: "||fbcdn.net",
      resourceTypes: ["image"],
    },
  },
]
```

**Applied in:** `browser.runtime.onInstalled` event via `browser.declarativeNetRequest.updateDynamicRules()`

---

## Key Design Patterns

### 1. Message Passing Architecture

All inter-context communication uses `browser.runtime.sendMessage`:

```typescript
// Sender (Popup/Content Script)
const response = await browser.runtime.sendMessage({
  type: ActionType.TAKE_SNAPSHOT,
  payload: { uid: "123456789" },
})

// Receiver (Background Service)
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === ActionType.TAKE_SNAPSHOT) {
    handleSnapshot(message.payload).then(sendResponse)
  }
  return true // Must return true to keep message channel open for async operations
})
```

### 2. Security-First Guard Pattern

```typescript
// In BackgroundService
const secureActions = [ActionType.SEND_APP_DATA] as const;

registerMessageListener(message, sender, sendResponse) {
  if (secureActions.includes(message.type)) {
    this.ensureReady() // Blocks until encryptor initialized
      .then(() => this.routeMessage(message, sender, sendResponse))
      .catch((error) => {
        this.logger.error("Failed to ensure security ready:", error);
        sendResponse({ success: false, error: error.message }, sender);
      });
    return true; // Keep channel open
  }
  return this.routeMessage(message, sender, sendResponse);
}
```

### 3. Abort Controller for Long Operations

```typescript
class BackgroundService {
  private alarmAbortController: AbortController | null = null
  private isAlarmProcessing = false

  async handleAlarm(alarm: Alarm) {
    if (alarm.name !== ActionType.CHECK_SNAPSHOT_SUBSCRIPTIONS) return

    if (this.isAlarmProcessing) {
      this.logger.info("Cancelling previous alarm execution")
      this.alarmAbortController?.abort()
    }

    this.alarmAbortController = new AbortController()
    this.isAlarmProcessing = true

    try {
      await this.ensureReady()
      if (this.alarmAbortController.signal.aborted) return
      // ... process cron snapshots with abort signal
    } finally {
      this.isAlarmProcessing = false
      this.alarmAbortController = null
    }
  }
}
```

### 4. Compound Indexes for Efficient Queries

```typescript
this.version(2).stores({
  snapshots: "++id, belongToId, [belongToId+timestamp], [belongToId+isCheckpoint+timestamp]",
})

// Usage:
const lastCheckpoint = await db.snapshots
  .where("[belongToId+isCheckpoint+timestamp]")
  .between([uid, 1, Dexie.minKey], [uid, 1, maxTimestamp])
  .last()
```

### 5. Structured Logging ([logger.ts](src/utils/logger.ts))

```typescript
const logger = createLogger("ComponentName")
logger.info("Operation started", { uid: "123" })
logger.warn("Rate limit approaching")
logger.error("Failed to fetch", error)
```

---

## Build System

### Vite Configuration ([vite.config.ts](vite.config.ts))

**Plugins:**

- `@vitejs/plugin-vue` - Vue 3 SFC compilation
- `@crxjs/vite-plugin` - Chrome extension hot reload
- `@tailwindcss/vite` - Tailwind CSS 4 integration
- `unplugin-vue-components` - Auto-import components
- `unplugin-icons` - Icon components on-demand
- `rollup-plugin-visualizer` - Bundle size analysis

**Key Features:**

- **Hot Module Replacement (HMR):**
  - Works for Popup and Dashboard
  - **Does NOT work for background worker** (requires full reload)
- **Build Outputs:**
  - Chrome: `dist/` (standard build)
  - Firefox: `dist/` + `firefox-patch.js` (post-process manifest)

### Scripts

```json
{
  "dev": "vite", // Dev server on :5173
  "build": "vite build", // Production build
  "build:firefox": "vite build && node firefox-patch.js", // Firefox build
  "test": "vitest", // Watch mode
  "test:coverage": "vitest --coverage", // 60% threshold
  "lint:fix": "eslint . --fix"
}
```

### Firefox Compatibility ([firefox-patch.js](firefox-patch.js))

**Purpose:** Adjust manifest.json for Firefox compatibility

**Changes:**

- Convert `service_worker` → `scripts` (Manifest V2 background pages)
- Adjust permission formats
- Add Firefox-specific fields

---

## Development Workflows

### Adding New Encrypted Config

```typescript
// Write
await database.writeEncryptedConfig("myNewKey", "secretValue", encryptor)

// Read
const value = await database.readEncryptedConfig("myNewKey", encryptor)

// Migrate from browser.storage.local
if (oldValue && !(await database.internalConfig.get("myNewKey"))) {
  await database.writeEncryptedConfig("myNewKey", oldValue, encryptor)
  await browser.storage.local.remove("myNewKey")
}
```

### Adding New Message Action

```typescript
// 1. Define in constants/actions.ts
export enum ActionType {
  TAKE_SNAPSHOT = "isnap-take-snap",
  GET_USER_INFO = "isnap-get-user-info",
  SYNC_LOCKS = "isnap-sync-locks",
  NOTIFY_SNAPSHOT_COMPLETE = "isnap-notify-snapshot-complete",
  SEND_APP_DATA = "isnap-send-app-data",
  CHECK_SNAPSHOT_SUBSCRIPTIONS = "isnap-check-snapshot-subscriptions",
  SAVE_USER_METADATA = "isnap-save-user-metadata",
  BULK_UPSERT_USER_METADATA = "isnap-bulk-upsert-user-metadata",
  SAVE_SNAPSHOT = "isnap-save-snapshot",
  MY_NEW_ACTION = "isnap-my-new-action" // Example for new action
}

// 2. Add handler in BackgroundService.routeMessage()
async routeMessage(message: ExtensionMessage) {
  switch (message.type) {
    case ActionType.MY_NEW_ACTION:
      await this.handleMyAction(message.payload);
      break;
  }
}

// 3. If action uses encryption, add to secureActions array
const secureActions = [..., ActionType.MY_NEW_ACTION];
```

### Adding New IndexedDB Table

```typescript
// 1. Define interface in types/database.d.ts
interface MyNewTable {
  id: string
  data: string
}

// 2. Update Database class in utils/database.ts
class Database extends Dexie {
  myNewTable!: Table<MyNewTable, string>

  constructor() {
    super("InstaSnapDB")
    // Increment version number
    this.version(4).stores({
      myNewTable: "id, data", // Define indexes
    })
    this.myNewTable = this.table("myNewTable")
  }
}
```

---

## Project-Specific Rules

1. **Never bypass storage locks:** Always use `appStore.tryLockUser()` before snapshots
2. **Use encrypted IndexedDB for credentials:** `browser.storage.local` is legacy only
3. **Security-first message handling:** Use `ensureReady()` guard before accessing encryptor
4. **Return `true` in message listeners:** Required for async operations to keep channel open
5. **No `console.*` in production:** Use `logger.info/warn/error`
7. **Unused parameters:** Prefix with `_` (e.g., `_sender`)
8. **Type validation:** Always validate `CryptoKey` with `instanceof` before use
9. **Abort controller support:** Gracefully cancel long-running operations
10. **Never log decrypted credentials:** High security risk

---

## Testing Strategy

### Unit Tests ([tests/](src/tests/))

**Framework:** Vitest + happy-dom

**Coverage Requirements:**

- Statements: 60%
- Branches: 60%
- Functions: 60%
- Lines: 60%

**Key Test Files:**

- `utils/database.test.ts` - Differential storage logic
- `utils/encrypt.test.ts` - AES-GCM encryption
- `stores/app.store.test.ts` - Lock mechanism
- `components/*.test.ts` - Vue component rendering

**Mocking Strategy:**

```typescript
// Browser API
vi.mock("./utils/polyfill", () => ({
  browser: {
    runtime: { sendMessage: vi.fn() },
    storage: { session: { get: vi.fn(), set: vi.fn() } },
  },
}))

// IndexedDB
import "fake-indexeddb/auto"

// Encryptor
const mockEncryptor = {
  encrypt: vi.fn().mockResolvedValue({ encrypted: new ArrayBuffer(32), iv: new Uint8Array(12) }),
  decrypt: vi.fn().mockResolvedValue("decrypted-value"),
}
```

---

## Deployment

### Chrome Web Store

1. Build: `pnpm build`
2. Zip `dist/` folder
3. Upload to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Firefox Add-ons

1. Build: `pnpm build:firefox`
2. Zip `dist/` folder
3. Upload to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)

### Manual Installation (Development)

1. Build: `pnpm build`
2. Chrome: `chrome://extensions` → Load unpacked → Select `dist/`
3. Firefox: `about:debugging` → Load Temporary Add-on → Select `dist/manifest.json`

---

## Performance Considerations

### Storage Optimization

- **Differential snapshots:** ~95% storage reduction vs full snapshots
- **Checkpoint frequency:** Balance between storage and reconstruction speed
- **Compound indexes:** Fast queries without full table scans

### Rate Limiting

- Instagram API: 50 users/request (MAX_USERS_PER_REQUEST constant)
- Retry logic: Exponential backoff for failed requests with jitter
  - **IGFetch defaults:** maxRetries: 3, retryDelay: 2000ms, timeout: 15000ms (15s)
  - **fetchWithRetry defaults:** maxRetries: 3, retryDelay: 1000ms, timeout: 10000ms (10s)
  - Base delay with exponential backoff: `baseDelay * 2^attempt`
  - Max delay capped at 1 minute for rate limit responses
- Rate limit handling: Respects Instagram's Retry-After header when receiving 429 status

### Memory Management

- **Lazy loading:** Dashboard loads user data on demand
- **LRU Cache for snapshot details:** MAX_CACHED_SNAPSHOTS = 50 in SnapshotHistory component
- **LRU Cache:** General purpose cache utility in [lru-cache.ts](src/utils/lru-cache.ts)
- **Efficient queries:** Uses Dexie compound indexes to minimize memory usage

---

## Future Architecture Enhancements

### Planned Improvements

1. **WebWorker for Snapshot Processing:** Offload diff calculations to prevent UI blocking
2. **Backup/Restore:** Export/import database backups
3. **Multi-account Support:** Track multiple Instagram accounts simultaneously

### Known Limitations

1. **No cross-device sync:** Data stored locally per browser profile
2. **Slow fetching:** Slow for very large accounts (100k+ followers) due to pagination and rate limits
3. **Instagram API changes:** Relies on undocumented GraphQL endpoints
4. **Rate limiting:** No control over Instagram's rate limits

---

## References

### Key Files

- Manifest: [public/manifest.json](public/manifest.json)
- Background: [src/background.ts](src/background.ts)
- BackgroundService: [src/utils/bg-service.ts](src/utils/bg-service.ts)
- Database: [src/utils/database.ts](src/utils/database.ts)
- Encryption: [src/utils/encrypt.ts](src/utils/encrypt.ts)
- Instagram API: [src/utils/instagram.ts](src/utils/instagram.ts)
- Actions: [src/constants/actions.ts](src/constants/actions.ts)
- Types: [src/types/database.d.ts](src/types/database.d.ts)

### External Documentation

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [WebExtension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Dexie.js](https://dexie.org)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)

---

**Last Updated:** February 22, 2026  
**Version:** 1.3.0
**License:** GPL-3.0-only
