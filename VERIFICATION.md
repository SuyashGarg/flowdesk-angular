## Large-list checks — November 12, 2026

- `node scripts/check-scale.cjs` passed with 1,500 synthetic requests, checking complete page coverage, filtering, page sizes, empty results, debounced search and cancellation, bounded activity pages, and page clamping after results shrink.
- Angular template/type compilation (`ngc --noEmit -p tsconfig.app.json`) and `git diff --check` passed.
- Production bundling again exited with code 134 without diagnostics. No browser rendering benchmark was performed. The synthetic dataset was not written to user storage.

## Enhancement checks — November 12, 2026

- TypeScript type check passed (`tsc --noEmit -p tsconfig.app.json`).
- Angular template compilation passed (`ngc --noEmit -p tsconfig.app.json`).
- Store behavior checks passed for oldest-first ordering, ownership filtering, creation, role restrictions, rejection reasons, immutable final decisions, and reset. These checks executed the transpiled store with lightweight signal and storage substitutes; they do not replace browser integration tests.
- `git diff --check` passed.
- Production bundling was attempted twice (including with two build workers); both processes exited with code 134 without a diagnostic. A successful production bundle and browser interaction checks remain unverified for these enhancements.

## Earlier baseline verification

# Verification

Production build: passed (`npm run build`).

Chromium browser checks passed at desktop (1440px) and mobile (390px):

- Empty form displays validation feedback.
- Valid request submission opens its details and adds it to the list.
- Rejection requires an explanatory note.
- Approval appends the note to the history.
- Refresh preserves the decision.
- Search returns matching requests and the empty state; clearing filters restores the list.
- Requester mode cannot access decision buttons.
- CSV downloads successfully.
- Mobile document has no horizontal page overflow; the wide table scrolls within its panel.
- The mobile form creates a request successfully.
- No browser runtime errors during these scenarios.

These are local prototype checks, not security or backend integration tests.

## Angular Material update

Production build passed after adding Angular Material 18 and its theme.
Chromium checks at 1440×900, 390×844, and 1024×500 verified:

- The desktop navigation remains at viewport top while page content scrolls.
- On short desktop screens, the profile and lower navigation remain reachable.
- Material form errors appear on invalid submission.
- Category selection works with mouse and keyboard; Escape closes the dropdown before the dialog.
- Approval notes, persisted decisions, category filters, sorting, and requester mode still work.
- Mobile content has no horizontal page overflow and the new request form submits successfully.
- No browser runtime errors during these scenarios.

## UI repair and mock HTTP API — November 17, 2026

- Angular template compilation (`ngc --noEmit -p tsconfig.app.json`) and `git diff --check` passed.
- `node scripts/check-scale.cjs` passed after updating the harness for Material imports and async initial data.
- `node scripts/check-api.cjs` passed against an isolated API: list, create, input validation, role restrictions, rejection reasons, immutable decisions, file persistence, reset, and simulated 503 response.
- Development bundle built successfully. Browser checks confirmed loaded seed data, styled queue controls, pagination and spending bars. At 390px the document width equals the viewport width (no page overflow).
- Production bundling still exits 134 without diagnostics under installed Node 24.8.0, including with one build worker. This was recorded before these changes; production output remains unverified. Use the documented Node 20/22 environment to investigate further.
- UI create/approve interactions were not exercised end to end in the browser; HTTP workflows and template compilation were checked separately.

## Vercel API repair — November 17, 2026

- Confirmed live `/api/requests` returned HTTP 200 with `text/html` and the Angular index document instead of JSON.
- Added the Vercel function, explicit API routing, a shared API handler, and signed cookie persistence for isolated hosted demo workspaces.
- Local HTTP integration checks, hosted-handler checks, the 1,500-request regression script, Angular template/type compilation, and `git diff --check` passed.
- Hosted-handler checks cover parsed Vercel request bodies, creation, approval, state across fresh invocations, isolation between visitors, reset, tampered cookies, invalid inputs, and missing signing-secret configuration.
- Deployment and live end-to-end verification await Vercel team authorization. Production bundling locally still exits 134 without diagnostics, including with Node 22; no successful production build is claimed for this change.
