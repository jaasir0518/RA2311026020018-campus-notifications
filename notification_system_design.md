# Notification System Design

## Stage 1

### Objective

Stage 1 solves the priority inbox requirement for campus notifications. The system fetches protected notifications from the provided API, filters out already viewed notification IDs when supplied, and returns the top `n` unread notifications using a priority rule based on:

- notification type weight: `Placement > Result > Event`
- recency: newer notifications win when two items are otherwise close

### Implementation Location

- reusable logging package: `logging_middleware/`
- Stage 1 execution entry point: `notification_app_be/src/stage1.ts`

### Flow

1. Read the evaluation credentials from environment variables, or use an already issued bearer token through `EVALUATION_ACCESS_TOKEN`.
2. Authenticate against the evaluation auth API when a bearer token is not pre-supplied.
3. Create the reusable logger and use it for configuration, API, utility, and service events.
4. Fetch paginated notifications from the protected notifications API.
5. Optionally exclude viewed IDs from a JSON file so that only unread notifications are considered.
6. Rank notifications by type weight first and recency second.
7. Maintain only the best `n` items using a bounded min-heap.
8. Print the final top-priority list as formatted JSON so it can be screenshotted for submission.

### Priority Strategy

Each notification type is mapped to a base weight:

- `Placement = 3`
- `Result = 2`
- `Event = 1`

The final score is computed as:

```text
priorityScore = (typeWeight * 1000) + recencyBonus
```

The large type multiplier guarantees the required ordering across categories, while `recencyBonus` breaks ties in favor of newer notifications. This keeps the behavior aligned with the prompt: placements always outrank results, and results always outrank events, while recent items within a category surface first.

### Efficient Top 10 Maintenance

New notifications may continue to arrive, so sorting the entire dataset every time would be wasteful. The implementation uses a min-heap with a maximum size of `n`.

How it works:

- Push notifications into the heap until it contains `n` items.
- For every next notification, compare it against the smallest-ranked item currently in the heap.
- If the new notification has a higher priority, replace the heap root.
- Otherwise discard it immediately.

This makes each update `O(log n)` instead of re-sorting the entire collection. For a stream of `m` notifications, the total complexity is `O(m log n)`, which is efficient because `n` is small (`10`, `15`, `20`, etc.).

### Logging Integration

The evaluation requires all meaningful operations to use the custom logging middleware rather than console logging. The Stage 1 code logs:

- startup configuration
- viewed-ID loading behavior
- every notification API page fetch
- pagination stop conditions
- unread filtering counts
- successful priority computation
- API and processing failures

All logs use valid assessment values such as:

- `stack = backend`
- `package = api | service | config | utils`
- `level = debug | info | error`

### Assumptions

- The notifications API is the source of truth; no database is used.
- If a viewed-ID file is not provided, all fetched notifications are treated as unread.
- The API response contains `ID`, `Type`, `Message`, and `Timestamp` fields as shown in the evaluation screenshots.
- Pagination ends when a page returns fewer items than the requested limit.

### Run Instructions

Build Stage 1:

```bash
cd notification_app_be
npm run build
```

Run Stage 1 with direct bearer token:

```bash
EVALUATION_ACCESS_TOKEN="<token>" \
node dist/stage1.js --topN 10 --pageSize 100 --maxPages 5
```

Run Stage 1 with auth credentials:

```bash
EVALUATION_EMAIL="<email>" \
EVALUATION_NAME="<name>" \
EVALUATION_ROLL_NO="<roll-no>" \
EVALUATION_ACCESS_CODE="<access-code>" \
EVALUATION_CLIENT_ID="<client-id>" \
EVALUATION_CLIENT_SECRET="<client-secret>" \
node dist/stage1.js --topN 10 --pageSize 100 --maxPages 5
```

Optional unread filtering with a local file of viewed IDs:

```bash
node dist/stage1.js --topN 10 --pageSize 100 --maxPages 5 --viewedIds ./viewed-notification-ids.json
```
