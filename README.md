# Ledgerly v2

Ledgerly v2 is a separate upgraded delivery of the existing Ledgerly finance app. The original app was preserved unchanged at `../ledgerly-v1-backup/finance-app.original.html`.

## Run

From the workspace root, serve `outputs` and open:

`http://127.0.0.1:4181/finance-app-v2/index.html`

PWA installation and service workers require a served URL. They do not work from `file://`.

## Data and migration

Ledgerly v2 writes to `financeAppData_v13` and keeps `financeAppData_v12`, `financeAppData_v11`, `financeAppData_v10`, and older keys as legacy read sources. The app creates pre-migration backups before migrating readable legacy data. If saved data cannot be read, automatic saving is disabled to avoid silent overwrites.

The v2 migration adds compatibility fields for integer cents, account opening balances, a normalized ledger, categories, budgets, recurring rules, reconciliation history, paycheck plans, monthly reviews, reminders, data-quality dismissals, audit events, and local security settings while preserving the legacy arrays used by the existing UI.

## Current features

- Mobile-first navigation with Home, Transactions, Budget, Goals, and More.
- More hub for Accounts, Income, Expenses, Financial Plan, Recurring, Reports, Data/backups, and Settings.
- Thumb-reachable quick add menu for expense, income, transfer, account, goal, and planned expense flows.
- Budget category limits for the current month with spent/remaining progress.
- Searchable transaction history and CSV export.
- Recurring preview for repeating income and expense entries.
- Rule-based Financial Plan with editable checking buffer, emergency-fund months, and debt strategy preference.
- Plain-language reports for cash flow, spending categories, planned expenses, and goals.
- Settings for display name, currency, theme, and privacy mode.
- Today screen with safe-to-spend, next due item, account warnings, month status, and best action.
- Safe-to-spend breakdowns for today, this week, next paycheck, and rest of month.
- Paycheck planning with allocations and over-allocation warnings.
- Financial calendar agenda derived from existing records.
- Monthly review checklist with saved reflection.
- Trust and data-quality center with safe repair backups and audit log.
- Local PIN app lock using browser Web Crypto. The PIN itself is not stored.
- Login & Sync page that shows cloud sync requirements without pretending sync is active.

## Backups

Use Data & backups in the app for JSON export/import and local restore snapshots. Keep exported JSON somewhere safe before major changes.

## Install on iPhone

1. Open the served URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch Ledgerly from the home screen.

## Tests

Run with the bundled Node runtime or any recent Node:

`node tests/ledgerly-v2.test.mjs`

The test suite covers cent conversion, v10-to-v11, v12, and v13 migration, ledger normalization, transfer balance calculations, recurring date increments, recurring duplicate-occurrence IDs, safe-to-spend math, Today best-action selection, PIN policy, and cloud-sync readiness gates.

## Limitations and next steps

This delivery completes the safety-preserving refactor foundation, PWA shell, v13 migration compatibility, mobile refinements, Budget, More, Recurring, Reports, Settings, Today, Safe to Spend, Paycheck Planning, Calendar, Monthly Review, Trust/Data Quality, local PIN lock, Login & Sync readiness, CSV export, and automated migration/calculation tests. Larger roadmap items such as real authenticated cloud sync, CSV column mapping import UI, recurring occurrence approval, full reconciliation workflows, WebAuthn lock, subscription/anomaly intelligence, receipt capture, rich historical charts, and advanced budget rollover/template workflows remain the next expansion layer.

## Secure login and sync

Ledgerly now supports a local PIN lock for the installed app. This is not a cloud account. It protects the app in the current browser profile by storing only a salted hash of the PIN.

True sync across phone and computer is intentionally not faked. Real sync requires authenticated accounts, a hosted encrypted database, per-user authorization rules, conflict resolution, audit/restore tooling, and ideally optional end-to-end encryption.
