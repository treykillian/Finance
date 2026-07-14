# Ledgerly v2 implementation log

- Preserved the original app as `outputs/ledgerly-v1-backup/finance-app.original.html`.
- Delivered v2 separately in `outputs/finance-app-v2/`.
- Split the single HTML app into `index.html`, CSS files, `src/app.js`, support modules, PWA files, icons, tests, and docs.
- Bumped schema from 10 to 11 for compatibility ledger/opening-balance data.
- Added `financeAppData_v10` to legacy storage keys so existing browser data remains readable and is not overwritten in place.
- Added cent-safe utilities, normalized ledger transaction helpers, opening balance compatibility fields, and v11 test coverage.
- Replaced visible encoding artifacts in generated v2 files.
- Added PWA manifest, service worker, install metadata, offline shell caching, and icon setup.
- Preserved current UI behavior while adding modular extension points for future phases.
- Added requested primary mobile navigation: Dashboard, Transactions, Budget, Goals, and More.
- Added a More hub for Accounts, Income, Expenses, Financial Plan, Recurring, Reports, Data/backups, and Settings.
- Added a floating quick-add menu that opens the guided flows for expense, income, transfer, account, goal, and planned expense.
- Added Budget page with monthly category limits, spent/remaining values, progress bars, warning text, and edit/delete support.
- Added transaction search, type filtering, CSV export, and visible transfer records.
- Added transfer deletion reversal so removing a transfer restores affected account balances.
- Added Recurring preview page derived from repeating income/expense entries and stored recurring rules.
- Added Reports page for income versus spending, spending by category, forecast summaries, planned expenses, and goals.
- Added Settings page for display name, currency, theme, privacy mode, and Financial Plan assumptions.
- Renamed the visible allocation experience to Financial Plan and kept it rule-based/explainable.
- Previously bumped the service-worker cache for app-shell refresh safety.
- Previously bumped active storage to `financeAppData_v12` while retaining v11, v10, and older legacy read support.
- Added addendum Phase A plan in `ADVANCED_IMPLEMENTATION_PLAN.md`.
- Added Today screen summaries: safe-to-spend, next due item, changes since last visit, low account warnings, month status, and best action.
- Added Safe to Spend page with today, week, next-paycheck, and month periods plus full calculation assumptions.
- Added Paycheck Planning page with expected income, allocations, unassigned/over-allocated status, edit, and delete.
- Added Financial Calendar agenda derived from recurring entries, paycheck plans, card due dates, goals, planned expenses, and reminders.
- Added Monthly Review page with checklist, saved reflection, and export-safe summary text.
- Added Trust & Data Quality center with storage explanation, schema, last save, calculation explanation, diagnostics, safe repair, and audit log.
- Added local audit events for imports, manual backups, deletes, safe-to-spend changes, paycheck plans, monthly reviews, and repairs.
- Added PWA manifest shortcuts for Today, Add Expense, Add Income, and View Budget.
- Previously bumped service-worker cache to `ledgerly-v2-shell-v3`.
- Bumped active storage to `financeAppData_v13` while retaining v12, v11, v10, and older legacy read support.
- Added local PIN app lock using salted SHA-256 hashing through browser Web Crypto.
- Added lock screen, Settings controls for saving/disabling the PIN, Lock Now, and auto-lock timing.
- Added Login & Sync page explaining local lock status, current cloud sync status, and the secure backend requirements before real sync can be enabled.
- Added security/sync tests and bumped service-worker cache to `ledgerly-v2-shell-v4`.

## Hosting note

The Ledgerly PWA code was packaged for hosting, but the deployment could not finish because the local environment could not connect to the Sites Git endpoint over HTTPS. The app bundle and tests were valid; the blocker was network/source-upload connectivity, not application code.

## Verification

- JSON manifest parse: pass.
- App JavaScript parse: pass.
- Service worker parse: pass.
- Node automated tests: pass.

## Remaining roadmap

Recurring transaction occurrence review, full CSV import mapping UI, reconciliation screens, privacy lock, rich reports/charts, and advanced budget workflows are scaffolded but not fully expanded in this pass.
