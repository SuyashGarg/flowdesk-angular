# Flowdesk — Angular approval workspace

A working portfolio demo for a common team problem: spending requests get lost in chat, decisions lack context, and nobody knows what is waiting for review.

Flowdesk lets a team submit a justified spending request, find it in a shared queue, approve or reject it, and follow its history. It uses Angular 18, TypeScript, standalone components, Reactive Forms, Signals, and Angular Material. No React.

## Run locally

Use Node 20 LTS (20.11.1 or newer) or Node 22 LTS.

```sh
npm ci
npm run api  # terminal 1: mock HTTP server on 3001
# In a second terminal:
npm start
```

Visit http://localhost:4201. `npm run build` creates a production build in `dist/approval-flow/browser`.

## Large request lists

The request table renders 25 rows by default, with 50 and 100-row options. Search waits 250 ms after typing, and changing filters, sort, or page size returns to page one. The activity log renders 25 events per page. CSV export includes all matching requests across pages and applies the current search text immediately.

Run `node scripts/check-scale.cjs` for synthetic 1,500-request regression checks. These use lightweight Angular substitutes and do not measure real browser rendering. Client-side filtering and sorting still process the full dataset; the mock API persists the whole collection on changes. This improves rendering bounds without replacing the need for server pagination and durable storage in a multi-user system.

## Review workspace improvements

- Use **Review oldest pending** to open the longest-waiting request, regardless of list filters. After a decision, **Review next pending** continues through the queue.
- Choose **Oldest first** to sort the list by submission date.
- Enable **My requests** to show requests submitted as “You” in this local workspace. This filter is independent of the demo role.
- The overview summarizes pending and approved spending by category; rejected amounts are excluded.
- Request fields show specific validation feedback and a live justification character count.

## Styling and Angular Material

Layout uses ordinary component CSS with Flexbox, Grid, and media queries. There is no Tailwind or Bootstrap. `src/styles.scss` uses Sass only to configure the Angular Material theme: the primary color, typography, density, and component theme mixins live in one place. The Angular build compiles that SCSS to CSS.

Angular Material supplies buttons, outlined form fields, text inputs, category and role dropdowns, filtering controls, and review notes. The standalone components import only the Material modules they use. `src/main.ts` enables asynchronous animations for dropdown overlays. Form values and validators remain in Angular Reactive Forms; Material supplies their visual presentation and field errors.

The desktop sidebar is fixed to the viewport. The content column reserves matching space using `margin-inline-start`. At 850px and below, navigation returns to normal document flow above the content. On short desktop screens, navigation can scroll internally so its lower controls remain reachable.

## A five-minute demo

1. Click **New request**. Submit an empty form to see validation.
2. Enter a title, category, amount, and a meaningful business justification (20+ characters).
3. Submit. Your request appears in the queue with a Pending status.
4. Close its details and use search, category, status, and sorting to find it.
5. Switch the demo role to Requester: decision controls disappear.
6. Switch back to Approver. Open the request, write a review note, and approve it.
7. Refresh. The decision and history remain in this local workspace.
8. Export your filtered list as CSV. Visit the activity log to see the decision.
9. Use **Reset demo data** on desktop to restore the four sample requests; this asks before replacing changes.

## Read the project in this order

| File                                | What to learn                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/app/request.model.ts`          | Interfaces describe data; union types restrict valid values.                                                                 |
| `src/app/request.store.ts`          | A dependency-injected service owns state. `signal` stores values, `computed` derives results, and async actions call the HTTP service. |
| `src/app/request-form.component.ts` | Reactive Forms validate input; typed output events send valid data to the parent.                                            |
| `src/app/app.component.ts`          | The page connects user events to the service and handles small UI state.                                                     |
| `src/app/app.component.html`        | `@if`, `@for`, bindings, pipes, and event handlers render state.                                                             |
| `src/app/app.component.css`         | Grid, flexbox, and media queries adapt the interface to narrow screens.                                                      |
| `src/app/dialog-focus.directive.ts` | A reusable directive manages keyboard focus in dialogs.                                                                      |

### Follow one feature: approval

The template calls `decide('Approved')`. The page reads the selected request and passes its ID and note to the store. The API checks the demo role and Pending status, updates the request immutably, and appends an event. Angular recomputes the selected request, totals, and filtered list. The store calls RequestApi, which sends a PATCH request. The mock server validates the transition and persists it to mock/data.json before returning the updated record.

### Why these choices?

- A single service makes business rules easy to locate without introducing a large state library.
- Computed totals avoid keeping duplicate counters in sync.
- Reactive Forms make validation explicit and keep form inputs out of the store until submission.
- The form is a separate component because it has its own input lifecycle. The app remains small enough to understand without many folders.
- The list uses a semantic table with horizontal scrolling on small screens; the surrounding page, cards, navigation, and forms reflow.

## Learning exercises

1. Add a department field: start with the model, then form, store, and template.
2. Add a computed total for rejected spending.
3. Split the request details into a component with an input and decision outputs.
4. Add Angular Router for bookmarkable request URLs and browser back navigation.
5. Replace the mock API with a real backend and authentication.
6. Add unit tests around allowed status transitions and authorization before connecting a real backend.

## Honest project boundaries

This is a local prototype, not a deployed multi-user approval system. Sample people and spending are fictional. The role selector demonstrates conditional UI; it does not authenticate or secure anything. The mock JSON file can be edited and is not a trusted audit log. Browsers connected to the same local API share its data. There is no email, attachment upload, or real payment integration. Dates use sample data and browser-local formatting. Navigation uses view state rather than Angular Router.

A production version needs server-side authorization, persisted users and requests, transactional status changes, trusted audit events, API validation, and automated tests. Angular 18 is retained from the supplied project for compatibility; upgrade to a supported Angular release before production use.

## Mock HTTP API

The browser uses Angular HttpClient through `src/app/request.api.ts`. The Angular dev proxy forwards `/api` to the Node server in `mock/server.cjs`; these are actual network requests visible in DevTools. No extra runtime dependencies are required. Restart an already running Angular dev server after changing proxy configuration.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/requests` | Load the workspace |
| POST | `/api/requests` | Validate and create a request |
| PATCH | `/api/requests/:id/decision` | Approve or reject; checks role, pending status and rejection reason |
| POST | `/api/reset` | Restore seed requests |

Responses take 450 ms so loading and saving states are visible. Writes finish before the UI reports success; failed submissions keep the form open. Refresh workspace retries loading. Data persists in gitignored `mock/data.json`, separately from the old browser localStorage demo data. This migration starts with seed data and does not delete the old browser data. The mock role field is intentionally not real authentication.

Stop `npm run api` and refresh the workspace to exercise the error/retry UI. Restart it and click Refresh to recover. For deterministic API failures, send `X-Mock-Error: true` (returns 503). Invalid inputs return 422; duplicate decisions return 409. All users of this local server share its data.

Run `node scripts/check-api.cjs` for isolated HTTP integration checks. The script starts its own API on an ephemeral port and stores test data in a temporary directory.

## Hosted demo on Vercel

`vercel.json` builds Angular into `dist/approval-flow/browser` and routes `/api/*` to `api/index.js`. This Vercel Function uses the same validation and decision rules as the local Node API (`mock/api-handler.cjs`). The Angular dev proxy only applies to local development; it is not a hosted backend.

Before deploying, set a strong random `DEMO_COOKIE_SECRET` environment variable in Vercel for Production and Preview, then redeploy. Keep the value private and stable across deployments. Node 22 is pinned in `.nvmrc` and package engines.

The hosted mock API stores each visitor's fictional workspace in a compressed, signed, HttpOnly, Secure, SameSite=Lax cookie lasting seven days. This keeps requests and decisions across reloads and serverless cold starts without a paid database. Visitors are isolated; resetting one demo does not reset another. Cookie capacity is limited: a full workspace returns a clear error and can be reset from the sidebar. Clearing cookies, changing the signing secret, or cookie expiry restores seed data. Concurrent tabs use last-write-wins behavior. Local development retains file persistence. This is a mock workflow, not authentication or durable business storage.

Run `node scripts/check-vercel-api.cjs` to check hosted-handler behavior locally, including create, approve, refresh, isolation, reset, and cookie validation. No personal or confidential data should be entered into this public demo.
