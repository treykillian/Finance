# Ledgerly v2 advanced implementation plan

This plan combines the original Ledgerly v2 request with the advanced-enhancements addendum. The original app remains preserved at `../ledgerly-v1-backup/finance-app.original.html`. Existing v10 and v11 storage keys are read as legacy sources and are not overwritten in place.

## Data safety

- Active schema: `financeAppData_v13`.
- Legacy read support: `financeAppData_v12`, `financeAppData_v11`, `financeAppData_v10`, older versioned keys, and earlier Ledgerly keys.
- Migration behavior: v12 adds settings, paycheck plans, monthly reviews, reminders, data-quality dismissals, and audit log arrays without deleting existing records.
- Backups: pre-migration, pre-import, manual, and pre-data-quality-repair backups are kept in localStorage.

## Phase A: highest value

Implemented in this pass:

- Today screen inside Home/Dashboard.
- Safe-to-spend engine with today, week, next-paycheck, and month periods.
- Safe-to-spend explanation with cash, obligations, buffer, assumptions, and date range.
- Paycheck planning with expected income, allocations, unassigned/over-allocated status, edit, delete, and saved plans.
- Financial calendar agenda derived from recurring income/expenses, card due dates, goals, planned expenses, paycheck plans, and reminders.
- Guided monthly review checklist with saved reflection and export-safe summary.
- Trust and data-quality center with storage explanation, schema status, last save, core calculation explanations, diagnostics, safe repair, and audit log.

Still future work:

- Full reconciliation workflow.
- Subscription review workflow.
- Rich month-by-month calendar grid.
- Background notifications, which need permission-aware browser support.

## Phase B: intelligence

Next recommended sequence:

1. Subscription detection with confirm/reject/merge.
2. Spending anomaly detection with explanations and dismissals.
3. Debt center with avalanche/snowball projections.
4. Emergency-mode planning.
5. Isolated life-event scenarios.

## Phase C: faster entry and personalization

Next recommended sequence:

1. Receipt upload with confirmation before transaction creation.
2. Local natural-language parsing with confirmation.
3. Command palette.
4. Additional installed-app shortcuts.
5. Simple/advanced display modes.
6. Personalized dashboard cards.

## Phase D: specialized and future-facing

Next recommended sequence:

1. Tax organization.
2. Financial journal.
3. Notification preference center.
4. Household-ready architecture documentation and local-only permissions model.
5. Optional privacy-preserving local diagnostics.
