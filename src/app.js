
    const SCHEMA_VERSION = 13;
    const STORAGE_PREFIX = "financeAppData_v";
    const STORAGE_KEY = `${STORAGE_PREFIX}${SCHEMA_VERSION}`;
    const BACKUP_PREFIX = "financeAppBackup_";
    const DURABLE_DB_NAME = "ledgerly-durable-storage";
    const DURABLE_STORE_NAME = "finance-state";
    const DURABLE_STATE_KEY = "current";
    const LEGACY_STORAGE_KEYS = [
      "financeAppData_v12",
      "financeAppData_v11",
      "financeAppData_v10",
      "financeAppData_v9",
      "financeAppData_v8",
      "financeAppData_v7",
      "financeAppData_v6",
      "financeAppData_v5",
      "financeAppData_v4",
      "financeAppData_v3",
      "financeAppData_v2",
      "financeAppData_v1",
      "ledgerly.simple",
      "ledgerly.simple.v4",
      "ledgerly.simple.v3",
      "ledgerly.simple.v2",
      "ledgerly.simple.v1",
      "ledgerly.finance.v2",
      "ledgerly.finance.v1"
    ];
    let storageSaveEnabled = true;
    let storageLoadReport = { sourceKey: "Demo data", backupKey: "", migrated: false };
    let durableStorageReady = false;
    let durableStorageStatus = "Starting";

    function toCents(value) {
      if (Number.isInteger(value) && Math.abs(value) > 999999) return value;
      const normalized = String(value ?? 0).replace(/[^0-9.-]/g, "");
      if (!normalized || normalized === "-" || normalized === ".") return 0;
      return Math.round(Number(normalized) * 100);
    }

    function fromCents(cents) { return Number(cents || 0) / 100; }

    function normalizeTags(value) {
      if (Array.isArray(value)) return value.map(String).filter(Boolean);
      if (!value) return [];
      return String(value).split(",").map((item) => item.trim()).filter(Boolean);
    }

    function ledgerIdentity(entry) {
      return entry.id || [entry.date, entry.type, entry.accountId, entry.destinationAccountId, entry.amountCents, entry.merchant || entry.categoryId || entry.category].join(":");
    }

    function normalizeLedgerTransaction(entry) {
      const now = new Date().toISOString();
      const amountCents = Number.isFinite(Number(entry.amountCents)) ? Number(entry.amountCents) : toCents(entry.amount);
      return { id: entry.id || id(), date: entry.date || today(), type: entry.type || "expense", amountCents: Math.abs(amountCents), amount: fromCents(Math.abs(amountCents)), accountId: entry.accountId || "", destinationAccountId: entry.destinationAccountId || "", categoryId: entry.categoryId || entry.category || entry.name || "Uncategorized", merchant: entry.merchant || entry.name || entry.category || "", notes: entry.notes || "", tags: normalizeTags(entry.tags), status: entry.status || "cleared", recurringRuleId: entry.recurringRuleId || "", recurringOccurrenceId: entry.recurringOccurrenceId || "", attachmentMetadata: entry.attachmentMetadata || null, createdAt: entry.createdAt || now, updatedAt: entry.updatedAt || entry.createdAt || now };
    }

    function buildLedgerFromLegacy(stateData) {
      const ledger = new Map();
      ensureArray(stateData.transactions).forEach((entry) => { const normalized = normalizeLedgerTransaction(entry); ledger.set(ledgerIdentity(normalized), normalized); });
      ensureArray(stateData.incomeSources).forEach((entry) => { const normalized = normalizeLedgerTransaction({ ...entry, type: "income", merchant: entry.name || "Income", categoryId: entry.name || "Income" }); ledger.set(ledgerIdentity(normalized), normalized); });
      ensureArray(stateData.expenses).forEach((entry) => { const normalized = normalizeLedgerTransaction({ ...entry, type: "expense", merchant: entry.name || "Expense", categoryId: entry.name || "Expense" }); ledger.set(ledgerIdentity(normalized), normalized); });
      return [...ledger.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
    }

    const demoState = {
      settings: {
        userName: "Trey",
        currency: "USD",
        locale: "en-US",
        theme: "system",
        privacyMode: "off",
        checkingBuffer: 500,
        emergencyMonths: 3,
        debtStrategy: "avalanche",
        budgetWarnings: [75, 90, 100],
        safeToSpendPeriod: "week",
        safeToSpendAccountIds: [],
        advancedMode: "simple",
        lastVisitAt: "",
        lockEnabled: false,
        pinHash: "",
        pinSalt: "",
        autoLockMinutes: 5,
        syncProvider: "none",
        syncLastCheckedAt: ""
      },
      accounts: [
        { id: id(), name: "Checking", accountType: "Checking", status: "asset", balance: 4200 },
        { id: id(), name: "Emergency savings", accountType: "Emergency savings", status: "asset", balance: 12500 },
        { id: id(), name: "Brokerage", accountType: "Investment", status: "asset", balance: 6400 },
        { id: id(), name: "Credit card", accountType: "Credit card", status: "liability", balance: 680, creditLimit: 5000, dueDate: "2026-07-05", minPayment: 35, statementBalance: 680, apr: 24.99 }
      ],
      transactions: [
        { id: id(), date: today(-1), type: "income", category: "Paycheck", amount: 4200, notes: "Main job" },
        { id: id(), date: today(-2), type: "expense", category: "Rent", amount: 1850, notes: "Monthly rent" },
        { id: id(), date: today(-4), type: "expense", category: "Groceries", amount: 146.35, notes: "Weekly shop" },
        { id: id(), date: today(-6), type: "expense", category: "Transit", amount: 88, notes: "Train pass" }
      ],
      incomeSources: [
        { id: id(), name: "Salary", frequency: "monthly", amount: 4200 },
        { id: id(), name: "Freelance", frequency: "one-time", amount: 900 }
      ],
      expenses: [
        { id: id(), name: "Rent", frequency: "monthly", amount: 1850 },
        { id: id(), name: "Groceries", frequency: "weekly", amount: 150 },
        { id: id(), name: "Utilities", frequency: "monthly", amount: 220 }
      ],
      goals: [
        { id: id(), name: "Emergency fund", current: 12500, target: 18000, targetDate: "2026-12-31", accountId: "" },
        { id: id(), name: "Vacation", current: 950, target: 3000, targetDate: "2026-09-01" }
      ],
      plannedExpenses: [
        { id: id(), name: "Car insurance", category: "Insurance", total: 900, dueDate: "2026-09-15", saved: 250, accountId: "" }
      ],
      paycheckPlans: [],
      monthlyReviews: [],
      userReminders: [],
      dataQualityDismissals: [],
      auditLog: []
    };

    let state = loadState();
    const previousVisitAt = state.settings.lastVisitAt || "";
    const sessionStartedAt = new Date().toISOString();

    let money = new Intl.NumberFormat(state.settings.locale || "en-US", { style: "currency", currency: state.settings.currency || "USD" });
    const pct = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });

    const views = {
      dashboard: document.getElementById("dashboard"),
      safeSpend: document.getElementById("safeSpend"),
      transactions: document.getElementById("transactions"),
      budget: document.getElementById("budget"),
      networth: document.getElementById("networth"),
      accounts: document.getElementById("accounts"),
      income: document.getElementById("income"),
      expenses: document.getElementById("expenses"),
      savings: document.getElementById("savings"),
      aiPlan: document.getElementById("aiPlan"),
      planned: document.getElementById("planned"),
      data: document.getElementById("data"),
      recurring: document.getElementById("recurring"),
      reports: document.getElementById("reports"),
      settings: document.getElementById("settings"),
      paycheck: document.getElementById("paycheck"),
      calendar: document.getElementById("calendar"),
      review: document.getElementById("review"),
      trust: document.getElementById("trust"),
      sync: document.getElementById("sync"),
      more: document.getElementById("more")
    };

    function id() {
      return crypto.randomUUID();
    }

    function today(offset = 0) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return date.toISOString().slice(0, 10);
    }

    function currentMonth() {
      return new Date().toISOString().slice(0, 7);
    }

    function defaultCategories() {
      return ["Income", "Housing", "Food", "Transport", "Utilities", "Health", "Savings", "Debt", "Shopping", "Travel", "Other"].map((name) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        type: name === "Income" ? "income" : "expense",
        color: "#2f6f63"
      }));
    }

    function loadState() {
      const saved = readSavedState();
      if (!saved) return normalizeState(structuredClone(demoState), { isDemo: true });
      try {
        const parsed = JSON.parse(saved.value);
        const needsMigration = saved.key !== STORAGE_KEY || Number(parsed?.schemaVersion || 0) < SCHEMA_VERSION;
        let backupKey = "";
        if (needsMigration) {
          backupKey = createStorageBackup("pre-migration");
          if (!backupKey) throw new Error("A pre-migration backup could not be created.");
        }
        storageLoadReport = { sourceKey: saved.key, backupKey, migrated: needsMigration };
        return migrateState(parsed, saved.key);
      } catch (error) {
        storageSaveEnabled = false;
        console.warn("Ledgerly could not read saved data. Automatic saving is disabled to avoid overwriting it.", error);
        return normalizeState(structuredClone(demoState), { isDemo: true });
      }
    }

    function readSavedState() {
      const discoveredVersionKeys = storageEntries()
        .map(([key]) => key)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .sort((a, b) => schemaVersionFromKey(b) - schemaVersionFromKey(a));
      const keys = [...new Set([STORAGE_KEY, ...discoveredVersionKeys, ...LEGACY_STORAGE_KEYS])];
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value) return { key, value };
      }
      return null;
    }

    function migrateState(data, sourceKey = STORAGE_KEY) {
      const sourceVersion = Number(data?.schemaVersion || schemaVersionFromKey(sourceKey));
      let migrated = String(sourceKey).startsWith("ledgerly.finance.")
        ? migrateLegacyFinanceState(data)
        : { ...(data || {}) };
      if (!migrated.accounts && migrated.netWorthItems) {
        migrated.accounts = migrated.netWorthItems.map((item) => ({
          id: item.id || id(),
          name: item.name || "Account",
          accountType: item.type === "liability" ? "Liability" : "Asset",
          status: item.type === "liability" ? "liability" : "asset",
          balance: Number(item.amount || 0)
        }));
      }
      migrated = normalizeState(migrated, { sourceVersion });
      migrated.schemaVersion = SCHEMA_VERSION;
      migrated.lastMigratedAt = new Date().toISOString();
      return migrated;
    }

    function migrateLegacyFinanceState(data) {
      const legacy = { ...(data || {}) };
      const incomeSources = ensureArray(legacy.incomeSources);
      return {
        ...legacy,
        legacyIncomeSourceLabels: incomeSources.filter((item) => typeof item === "string"),
        accounts: ensureArray(legacy.accounts).map((account) => {
          const type = String(account.accountType || account.type || "Other");
          const isLiability = /credit|loan|liabil/i.test(type) || Number(account.balance) < 0;
          return {
            ...account,
            accountType: /credit/i.test(type) ? "Credit card" : type,
            status: isLiability ? "liability" : "asset",
            balance: Math.abs(Number(account.balance || 0))
          };
        }),
        transactions: ensureArray(legacy.transactions).map((transaction) => ({
          ...transaction,
          type: transaction.type || (Number(transaction.amount) < 0 ? "expense" : "income"),
          amount: Math.abs(Number(transaction.amount || 0)),
          category: transaction.category || "Uncategorized",
          notes: transaction.notes || transaction.description || ""
        })),
        incomeSources: incomeSources.filter((item) => item && typeof item === "object"),
        expenses: ensureArray(legacy.expenses).filter((item) => item && typeof item === "object"),
        goals: ensureArray(legacy.goals).map((goal) => ({ ...goal, targetDate: goal.targetDate || goal.due || "" }))
      };
    }

    function normalizeState(data, options = {}) {
      const stateData = { ...(data || {}) };
      stateData.schemaVersion = Number(stateData.schemaVersion || options.sourceVersion || SCHEMA_VERSION);
      stateData.settings = {
        userName: "Trey",
        currency: "USD",
        locale: "en-US",
        theme: "system",
        privacyMode: "off",
        checkingBuffer: 500,
        emergencyMonths: 3,
        debtStrategy: "avalanche",
        budgetWarnings: [75, 90, 100],
        safeToSpendPeriod: "week",
        safeToSpendAccountIds: [],
        advancedMode: "simple",
        lastVisitAt: "",
        lockEnabled: false,
        pinHash: "",
        pinSalt: "",
        autoLockMinutes: 5,
        syncProvider: "none",
        syncLastCheckedAt: "",
        ...(stateData.settings || {})
      };
      if (!String(stateData.settings.userName || "").trim()) stateData.settings.userName = "Trey";
      stateData.accounts = ensureArray(stateData.accounts).map(normalizeAccount);
      stateData.incomeSources = ensureArray(stateData.incomeSources).map(normalizeIncome);
      stateData.expenses = ensureArray(stateData.expenses).map(normalizeExpense);
      stateData.goals = ensureArray(stateData.goals).map(normalizeGoal);
      stateData.transactions = ensureArray(stateData.transactions).map(normalizeTransaction);
      stateData.plannedExpenses = ensureArray(stateData.plannedExpenses).map(normalizePlannedExpense);
      stateData.ledger = ensureArray(stateData.ledger).length ? ensureArray(stateData.ledger).map(normalizeLedgerTransaction) : buildLedgerFromLegacy(stateData);
      stateData.categories = ensureArray(stateData.categories).length ? ensureArray(stateData.categories).map(normalizeCategory) : defaultCategories();
      stateData.budgets = ensureArray(stateData.budgets).map(normalizeBudget);
      stateData.recurringRules = ensureArray(stateData.recurringRules).map(normalizeRecurringRule);
      stateData.reconciliationHistory = ensureArray(stateData.reconciliationHistory);
      stateData.paycheckPlans = ensureArray(stateData.paycheckPlans).map(normalizePaycheckPlan);
      stateData.monthlyReviews = ensureArray(stateData.monthlyReviews).map(normalizeMonthlyReview);
      stateData.userReminders = ensureArray(stateData.userReminders).map(normalizeReminder);
      stateData.dataQualityDismissals = ensureArray(stateData.dataQualityDismissals);
      stateData.auditLog = ensureArray(stateData.auditLog).map(normalizeAuditEvent).slice(-200);
      if (stateData.netWorthItems) stateData.legacyNetWorthItems = structuredClone(stateData.netWorthItems);
      return stateData;
    }

    function normalizeAccount(account) {
      const accountType = account.accountType || "Other";
      return {
        creditLimit: 0,
        dueDate: "",
        minPayment: 0,
        statementBalance: 0,
        apr: 0,
        ...account,
        id: account.id || id(),
        name: account.name || "Account",
        accountType,
        status: isCreditCardType(accountType) ? "liability" : account.status || "asset",
        openingBalance: Number(account.openingBalance ?? account.balance ?? 0),
        openingBalanceCents: Number.isFinite(Number(account.openingBalanceCents)) ? Number(account.openingBalanceCents) : toCents(account.openingBalance ?? account.balance ?? 0),
        balance: Number(account.balance || 0)
      };
    }

    function normalizeRecurringItem(item) {
      return {
        ...item,
        id: item.id || id(),
        name: item.name || "Entry",
        amount: Number(item.amount || 0),
        frequency: item.frequency === "recurring" ? "monthly" : item.frequency || "monthly"
      };
    }

    function normalizeCategory(item) {
      const name = String(item.name || item.category || "Other").trim() || "Other";
      return {
        id: item.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || id(),
        name,
        type: item.type || "expense",
        color: item.color || "#2f6f63",
        icon: item.icon || ""
      };
    }

    function normalizeBudget(item) {
      return {
        id: item.id || id(),
        month: item.month || currentMonth(),
        category: item.category || "Other",
        limit: Number(item.limit || 0),
        classification: item.classification || "flexible",
        rollover: Boolean(item.rollover),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
      };
    }

    function normalizeRecurringRule(item) {
      return {
        id: item.id || id(),
        name: item.name || "Recurring item",
        type: item.type || "expense",
        amountCents: Number.isFinite(Number(item.amountCents)) ? Number(item.amountCents) : toCents(item.amount),
        accountId: item.accountId || "",
        destinationAccountId: item.destinationAccountId || "",
        categoryId: item.categoryId || item.category || item.name || "Other",
        startDate: item.startDate || item.date || today(),
        nextDate: item.nextDate || item.startDate || item.date || today(),
        endDate: item.endDate || "",
        frequency: item.frequency || "monthly",
        automatic: Boolean(item.automatic),
        reminderDays: Number(item.reminderDays || 3),
        active: item.active !== false,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
      };
    }

    function normalizePaycheckPlan(item) {
      return {
        id: item.id || id(),
        name: item.name || "Paycheck plan",
        expectedDate: item.expectedDate || today(),
        incomeSourceId: item.incomeSourceId || "",
        expectedAmount: Number(item.expectedAmount || 0),
        allocations: ensureArray(item.allocations).map((allocation) => ({
          id: allocation.id || id(),
          targetType: allocation.targetType || "spending",
          targetId: allocation.targetId || "",
          label: allocation.label || "Allocation",
          amount: Number(allocation.amount || 0)
        })),
        appliedTransactionId: item.appliedTransactionId || "",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
      };
    }

    function normalizeMonthlyReview(item) {
      return {
        id: item.id || id(),
        month: item.month || currentMonth(),
        step: Number(item.step || 0),
        completedSteps: ensureArray(item.completedSteps),
        reflection: item.reflection || "",
        summary: item.summary || "",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
      };
    }

    function normalizeReminder(item) {
      return {
        id: item.id || id(),
        date: item.date || today(),
        title: item.title || "Reminder",
        sourceType: item.sourceType || "manual",
        sourceId: item.sourceId || "",
        notes: item.notes || "",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
      };
    }

    function normalizeAuditEvent(item) {
      return {
        id: item.id || id(),
        at: item.at || new Date().toISOString(),
        type: item.type || "event",
        summary: item.summary || "Ledgerly event",
        reversible: Boolean(item.reversible),
        relatedType: item.relatedType || "",
        relatedId: item.relatedId || ""
      };
    }

    function dateStamp(dateValue) {
      return `${dateValue || today()}T00:00:00.000Z`;
    }

    function normalizeIncome(item) {
      const fallbackStamp = item.createdAt || item.updatedAt || dateStamp(item.date);
      return {
        accountId: "",
        accountApplied: false,
        date: today(),
        notes: "",
        createdAt: fallbackStamp,
        updatedAt: fallbackStamp,
        ...item,
        id: item.id || id(),
        name: item.name || "Income",
        amount: Number(item.amount || 0),
        frequency: item.frequency === "recurring" ? "monthly" : item.frequency || "one-time",
        date: item.date || today(),
        accountApplied: Boolean(item.accountApplied),
        createdAt: item.createdAt || fallbackStamp,
        updatedAt: item.updatedAt || fallbackStamp
      };
    }

    function normalizeExpense(item) {
      const fallbackStamp = item.createdAt || item.updatedAt || dateStamp(item.date);
      return {
        accountId: "",
        accountApplied: false,
        date: today(),
        notes: "",
        createdAt: fallbackStamp,
        updatedAt: fallbackStamp,
        ...item,
        id: item.id || id(),
        name: item.name || "Expense",
        amount: Number(item.amount || 0),
        frequency: item.frequency === "recurring" ? "monthly" : item.frequency || "one-time",
        date: item.date || today(),
        accountApplied: Boolean(item.accountApplied),
        createdAt: item.createdAt || fallbackStamp,
        updatedAt: item.updatedAt || fallbackStamp
      };
    }

    function normalizeGoal(goal) {
      const fallbackStamp = goal.createdAt || goal.updatedAt || dateStamp(goal.targetDate);
      return {
        accountId: "",
        targetDate: "",
        current: 0,
        target: 0,
        createdAt: fallbackStamp,
        updatedAt: fallbackStamp,
        ...goal,
        id: goal.id || id(),
        name: goal.name || "Goal",
        current: Number(goal.current || 0),
        target: Number(goal.target || 0),
        createdAt: goal.createdAt || fallbackStamp,
        updatedAt: goal.updatedAt || fallbackStamp
      };
    }

    function normalizeTransaction(transaction) {
      return {
        notes: "",
        accountId: "",
        toAccountId: "",
        ...transaction,
        id: transaction.id || id(),
        date: transaction.date || today(),
        type: transaction.type || "expense",
        category: transaction.category || "Uncategorized",
        amount: Number(transaction.amount || 0)
      };
    }

    function normalizePlannedExpense(item) {
      const fallbackStamp = item.createdAt || item.updatedAt || dateStamp(item.dueDate || today());
      return {
        total: 0,
        dueDate: "",
        saved: 0,
        accountId: "",
        createdAt: fallbackStamp,
        updatedAt: fallbackStamp,
        ...item,
        id: item.id || id(),
        name: item.name || "Planned expense",
        category: item.category || "Planned",
        dueDate: item.dueDate || "",
        total: Number(item.total || 0),
        saved: Number(item.saved || 0),
        createdAt: item.createdAt || fallbackStamp,
        updatedAt: item.updatedAt || fallbackStamp
      };
    }

    function ensureArray(value) {
      return Array.isArray(value) ? value : [];
    }

    function schemaVersionFromKey(key) {
      const match = String(key).match(/(?:_v|\.v)(\d+)$/);
      return match ? Number(match[1]) : SCHEMA_VERSION;
    }

    function storageEntries() {
      const entries = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        entries.push([key, localStorage.getItem(key)]);
      }
      return entries.sort(([a], [b]) => a.localeCompare(b));
    }

    function storageSnapshot(reason = "manual", includeStoredBackups = false) {
      const entries = storageEntries().filter(([key]) => includeStoredBackups || !key.startsWith(BACKUP_PREFIX));
      return {
        format: "ledgerly-storage-backup",
        formatVersion: 1,
        appSchemaVersion: SCHEMA_VERSION,
        reason,
        createdAt: new Date().toISOString(),
        page: location.href,
        storage: Object.fromEntries(entries)
      };
    }

    function backupKeyForNow(reason) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      return `${BACKUP_PREFIX}${stamp}_${reason}`;
    }

    function createStorageBackup(reason = "manual") {
      try {
        const key = backupKeyForNow(reason);
        localStorage.setItem(key, JSON.stringify(storageSnapshot(reason)));
        return key;
      } catch (error) {
        console.error("Ledgerly could not create a local backup.", error);
        return "";
      }
    }

    function printStorageInventory() {
      const entries = storageEntries();
      console.group(`Ledgerly localStorage inventory (${entries.length} keys)`);
      entries.forEach(([key, value]) => console.log(key, value));
      console.groupEnd();
      return entries;
    }

    function saveState() {
      state.schemaVersion = SCHEMA_VERSION;
      state.lastSavedAt = new Date().toISOString();
      if (storageSaveEnabled) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
          storageSaveEnabled = false;
          durableStorageStatus = "IndexedDB only";
          console.error("Ledgerly could not save to localStorage. The durable mirror remains enabled.", error);
        }
      }
      if (durableStorageReady) {
        writeDurableState(state).catch((error) => {
          durableStorageStatus = storageSaveEnabled ? "localStorage only" : "Save failed";
          console.error("Ledgerly could not update its IndexedDB mirror.", error);
        });
      }
    }

    function openDurableDatabase() {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error("IndexedDB is not supported by this browser."));
          return;
        }
        const request = indexedDB.open(DURABLE_DB_NAME, 1);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(DURABLE_STORE_NAME)) database.createObjectStore(DURABLE_STORE_NAME, { keyPath: "key" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open IndexedDB."));
      });
    }

    async function readDurableState() {
      const database = await openDurableDatabase();
      try {
        return await new Promise((resolve, reject) => {
          const transaction = database.transaction(DURABLE_STORE_NAME, "readonly");
          const request = transaction.objectStore(DURABLE_STORE_NAME).get(DURABLE_STATE_KEY);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error || new Error("Could not read IndexedDB."));
        });
      } finally {
        database.close();
      }
    }

    async function writeDurableState(nextState) {
      const database = await openDurableDatabase();
      try {
        await new Promise((resolve, reject) => {
          const transaction = database.transaction(DURABLE_STORE_NAME, "readwrite");
          transaction.objectStore(DURABLE_STORE_NAME).put({
            key: DURABLE_STATE_KEY,
            schemaVersion: SCHEMA_VERSION,
            savedAt: new Date().toISOString(),
            state: structuredClone(nextState)
          });
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error || new Error("Could not write IndexedDB."));
          transaction.onabort = () => reject(transaction.error || new Error("IndexedDB write was aborted."));
        });
      } finally {
        database.close();
      }
    }

    async function initializeDurableStorage() {
      let persistentPermission = false;
      try {
        if (navigator.storage?.persist) persistentPermission = await navigator.storage.persist();
      } catch (error) {
        console.info("Persistent-storage permission was not available; standard browser persistence remains active.", error);
      }

      try {
        const durableRecord = await readDurableState();
        durableStorageReady = true;
        durableStorageStatus = persistentPermission ? "Durable localStorage + IndexedDB" : "localStorage + IndexedDB";
        if (storageLoadReport.sourceKey === "Demo data" && durableRecord?.state) {
          const backupKey = createStorageBackup("before-indexeddb-recovery");
          state = migrateState(durableRecord.state, "indexedDB");
          storageLoadReport = { sourceKey: "IndexedDB recovery", backupKey, migrated: true };
          saveState();
          render();
        } else {
          await writeDurableState(state);
        }
      } catch (error) {
        durableStorageReady = false;
        durableStorageStatus = storageSaveEnabled ? "localStorage" : "Unavailable";
        console.warn("IndexedDB mirror is unavailable; versioned localStorage remains active.", error);
      }
      renderStorageTools();
    }

    function mergeByIdentity(currentItems, importedItems) {
      const result = ensureArray(currentItems).map((item) => ({ ...item }));
      const identities = new Set(result.map(entryIdentity));
      ensureArray(importedItems).forEach((item) => {
        const identity = entryIdentity(item);
        if (!identities.has(identity)) {
          result.push({ ...item });
          identities.add(identity);
        }
      });
      return result;
    }

    function entryIdentity(item) {
      return item?.id || JSON.stringify([item?.name, item?.date, item?.type, item?.category, item?.amount, item?.balance]);
    }

    function mergeFinanceState(current, imported) {
      const merged = { ...(imported || {}), ...(current || {}) };
      ["accounts", "transactions", "incomeSources", "expenses", "budgets", "goals", "plannedExpenses", "history", "paycheckPlans", "monthlyReviews", "userReminders", "auditLog"].forEach((key) => {
        merged[key] = mergeByIdentity(current?.[key], imported?.[key]);
      });
      return normalizeState(merged, { sourceVersion: imported?.schemaVersion });
    }

    function financeStateFromBackup(payload) {
      if (!payload || typeof payload !== "object") throw new Error("The JSON file is empty or invalid.");
      if (!payload.storage) return payload;
      const preferredKeys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
      for (const key of preferredKeys) {
        if (payload.storage[key]) return JSON.parse(payload.storage[key]);
      }
      throw new Error("No finance app data was found in this backup.");
    }

    function restoreBackupStorage(payload) {
      if (!payload?.storage || typeof payload.storage !== "object") return;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      Object.entries(payload.storage).forEach(([key, value]) => {
        const existing = localStorage.getItem(key);
        if (existing === null) localStorage.setItem(key, String(value));
        else if (existing !== String(value)) localStorage.setItem(`financeAppRecovered_${stamp}_${key}`, String(value));
      });
    }

    function exportBackup() {
      const payload = storageSnapshot("export", true);
      payload.currentState = structuredClone(state);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ledgerly-backup-${today()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStorageStatus("Backup exported as JSON.");
    }

    async function importBackup(file) {
      const payload = JSON.parse(await file.text());
      const backupKey = createStorageBackup("pre-import");
      if (!backupKey) throw new Error("Import stopped because the current data could not be backed up.");
      const importedState = payload.currentState || financeStateFromBackup(payload);
      restoreBackupStorage(payload);
      state = mergeFinanceState(state, migrateState(importedState, "import"));
      logAudit("import", "Imported and merged JSON backup.", { reversible: true });
      saveState();
      render();
      renderStorageTools();
      setStorageStatus(`Import merged safely. Previous storage: ${backupKey}`);
    }

    function setStorageStatus(message) {
      const element = document.getElementById("storageStatus");
      if (element) element.textContent = message;
    }

    function renderStorageTools(printToConsole = false) {
      const entries = printToConsole ? printStorageInventory() : storageEntries();
      const inventory = document.getElementById("storageInventory");
      const summary = document.getElementById("storageSummary");
      if (!inventory || !summary) return;
      inventory.textContent = entries.length
        ? entries.map(([key, value]) => `${key}\n${value}`).join("\n\n")
        : "No localStorage entries found.";
      const backupCount = entries.filter(([key]) => key.startsWith(BACKUP_PREFIX)).length;
      summary.innerHTML = `
        <div class="summary-item"><span class="muted">Active version</span><strong>${SCHEMA_VERSION}</strong></div>
        <div class="summary-item"><span class="muted">Active key</span><strong>${escapeHtml(STORAGE_KEY)}</strong></div>
        <div class="summary-item"><span class="muted">Loaded from</span><strong>${escapeHtml(storageLoadReport.sourceKey)}</strong></div>
        <div class="summary-item"><span class="muted">Local snapshots</span><strong>${backupCount}</strong></div>
        <div class="summary-item"><span class="muted">Persistence</span><strong>${escapeHtml(durableStorageStatus)}</strong></div>
        <div class="summary-item"><span class="muted">Last saved</span><strong>${escapeHtml(state.lastSavedAt || "Not yet")}</strong></div>`;
    }

    function bindStorageTools() {
      document.getElementById("exportBackupButton").addEventListener("click", exportBackup);
      document.getElementById("importBackupButton").addEventListener("click", () => document.getElementById("importBackupInput").click());
      document.getElementById("importBackupInput").addEventListener("change", async (event) => {
        const [file] = event.target.files;
        if (!file) return;
        try {
          await importBackup(file);
        } catch (error) {
          setStorageStatus(`Import failed: ${error.message}`);
        } finally {
          event.target.value = "";
        }
      });
      document.getElementById("createBackupButton").addEventListener("click", () => {
        const key = createStorageBackup("manual");
        if (key) logAudit("backup", "Created manual local snapshot.");
        saveState();
        renderStorageTools();
        setStorageStatus(key ? `Snapshot created: ${key}` : "Snapshot failed. Nothing was changed.");
      });
      document.getElementById("printStorageButton").addEventListener("click", () => {
        renderStorageTools(true);
        setStorageStatus("All keys and values printed below and in the browser console.");
      });
    }

    function monthKey() {
      return new Date().toISOString().slice(0, 7);
    }

    function accountNetWorthTotals() {
      return state.accounts.reduce((totals, account) => {
        const balance = Number(account.balance || 0);
        if (account.status === "liability") totals.totalLiabilities += Math.abs(balance);
        else totals.totalAssets += balance;
        totals.netWorth = totals.totalAssets - totals.totalLiabilities;
        return totals;
      }, { totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
    }

    function calculations() {
      const { totalAssets, totalLiabilities, netWorth: accountBalanceTotal } = accountNetWorthTotals();
      const oneTimeIncome = sum(state.incomeSources.filter((item) => item.frequency === "one-time" && item.date.startsWith(monthKey())), "amount");
      const oneTimeExpenses = sum(state.expenses.filter((item) => item.frequency === "one-time" && item.date.startsWith(monthKey())), "amount");
      const recurringIncome = state.incomeSources.filter((item) => item.frequency !== "one-time").reduce((total, item) => total + monthlyEquivalent(item), 0);
      const recurringExpenses = state.expenses.filter((item) => item.frequency !== "one-time").reduce((total, item) => total + monthlyEquivalent(item), 0);
      const monthlyIncome = recurringIncome + oneTimeIncome;
      const monthlyExpenses = recurringExpenses + oneTimeExpenses;
      const netWorth = accountBalanceTotal;
      const leftover = monthlyIncome - monthlyExpenses;
      const savingsRatio = monthlyIncome > 0 ? leftover / monthlyIncome : 0;
      const goalCurrent = sum(state.goals, "current");
      const goalTarget = sum(state.goals, "target");
      const plannedRemaining = state.plannedExpenses.reduce((total, item) => total + Math.max(Number(item.total || 0) - Number(item.saved || 0), 0), 0);
      const creditCards = state.accounts.filter(isCreditCard);
      const totalCreditLimit = sum(creditCards, "creditLimit");
      const totalCreditOwed = sum(creditCards, "balance");
      const recurringNet = recurringIncome - recurringExpenses;
      const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

      const base = {
        totalAssets,
        totalLiabilities,
        accountBalanceTotal,
        netWorth,
        monthlyIncome,
        monthlyExpenses,
        recurringIncome,
        recurringExpenses,
        recurringNet,
        leftover,
        savingsRatio,
        debtRatio,
        goalCurrent,
        goalTarget,
        goalProgress: goalTarget > 0 ? goalCurrent / goalTarget : 0,
        plannedRemaining,
        creditUtilization: totalCreditLimit > 0 ? totalCreditOwed / totalCreditLimit : 0,
        upcomingCards: creditCards.filter((card) => daysUntil(card.dueDate) <= 14).sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
      };
      return {
        ...base,
        health: financialHealth(base),
        recommendations: ruleBasedRecommendations(base)
      };
    }

    function financialHealth(c) {
      let score = 45;
      if (c.monthlyIncome > 0) score += 10;
      if (c.savingsRatio >= 0.2) score += 25;
      else if (c.savingsRatio >= 0.1) score += 15;
      else if (c.savingsRatio > 0) score += 6;
      else score -= 15;
      if (c.netWorth > 0) score += 10;
      if (c.goalProgress >= 0.5) score += 8;
      else if (c.goalProgress > 0) score += 4;
      if (c.debtRatio > 0.35) score -= 12;
      if (c.recurringNet < 0) score -= 10;
      score = Math.max(0, Math.min(100, Math.round(score)));
      const label = score >= 80 ? "Strong" : score >= 65 ? "Good" : score >= 45 ? "Stable" : "Needs attention";
      return { score, label };
    }

    function ruleBasedRecommendations(c) {
      const items = [];
      if (c.monthlyIncome <= 0) {
        items.push(["Add income", "Log your recurring income first so the dashboard can calculate leftover money."]);
        return items;
      }
      if (c.leftover < 0) {
        items.push(["Stop the monthly leak", `Expenses are ${money.format(Math.abs(c.leftover))} above income. Cut or delay one-time spending first.`]);
        items.push(["Review recurring bills", "Cancel or renegotiate one recurring expense before adding new goals."]);
        return items;
      }
      if (c.leftover === 0) {
        items.push(["Create breathing room", "Aim for a small leftover amount before adding new savings goals."]);
        return items;
      }
      if (c.totalLiabilities > 0) {
        items.push(["Pay down debt", `Send about ${money.format(c.leftover * 0.4)} toward liabilities this month.`]);
      }
      if (c.goalProgress < 1) {
        items.push(["Fund goals", `Move about ${money.format(c.leftover * 0.4)} toward your savings goals.`]);
      }
      if (c.savingsRatio < 0.2) {
        items.push(["Raise savings ratio", "Try to keep at least 20% of income as leftover money."]);
      } else {
        items.push(["Invest later", `After debt and near-term goals, keep ${money.format(c.leftover * 0.2)} ready for future investing features.`]);
      }
      if (c.plannedRemaining > 0) {
        items.unshift(["Prepare for planned costs", `Set aside money for ${money.format(c.plannedRemaining)} in known upcoming expenses before adding optional goals.`]);
      }
      return items.slice(0, 3);
    }

    function allocationPlan(c = calculations()) {
      const available = Math.max(c.leftover, 0);
      const checkingBalance = accountTotal(isCheckingAccount);
      const savingsBalance = accountTotal(isSavingsAccount);
      const investmentBalance = accountTotal(isInvestmentAccount);
      const checkingTarget = Math.max(c.monthlyExpenses * 0.5, Number(state.settings.checkingBuffer || 500));
      const emergencyTarget = Math.max(c.monthlyExpenses * Number(state.settings.emergencyMonths || 3), 1000);
      const checkingAccount = preferredAccount(isCheckingAccount, "Checking");
      const savingsAccount = preferredAccount(isSavingsAccount, "Savings account");
      const investmentAccount = preferredAccount(isInvestmentAccount, "Investment account");
      const creditCardPayments = state.accounts
        .filter(isCreditCard)
        .filter((card) => Number(card.statementBalance || card.balance || card.minPayment || 0) > 0)
        .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));

      if (available <= 0) {
        return {
          available,
          totals: { payments: 0, checking: 0, savings: 0, investing: 0, goals: 0, flex: 0 },
          checkingBalance,
          savingsBalance,
          investmentBalance,
          emergencyTarget,
          items: [],
          notes: [
            ["Cash flow first", "There is no positive leftover money to allocate yet. Focus on raising income or lowering expenses before adding investing."],
            ["Protect essentials", "Keep credit card minimums, required bills, and planned expenses current before optional goals."]
          ]
        };
      }

      const items = [];
      let remaining = available;
      const add = (bucket, label, amount, reason, action, accountName = "") => {
        const value = Math.max(0, Math.min(remaining, roundMoney(amount)));
        if (value <= 0) return;
        items.push({ bucket, label, amount: value, reason, action, accountName });
        remaining -= value;
      };

      creditCardPayments.forEach((card) => {
        const dueAmount = Number(card.statementBalance || card.balance || card.minPayment || 0);
        const days = daysUntil(card.dueDate);
        const timing = days === Infinity ? "on its normal due date" : days < 0 ? "now because it is past due" : `by ${card.dueDate}`;
        add(
          "payments",
          `Pay ${card.name}`,
          dueAmount,
          "This is an on-time credit card transfer, not extra debt payoff.",
          `Set aside the statement amount ${timing}.`,
          card.name
        );
      });

      state.plannedExpenses
        .slice()
        .sort((a, b) => String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31")))
        .forEach((item) => {
          const linked = state.accounts.find((account) => account.id === item.accountId);
          add(
            "payments",
            item.name,
            plannedCadence(item, "month"),
            "Known future expenses should be funded before optional goals.",
            `Move this to ${linked ? linked.name : savingsAccount.name} for the ${item.dueDate} due date.`,
            linked?.name || savingsAccount.name
          );
        });

      const checkingGap = Math.max(checkingTarget - checkingBalance, 0);
      add(
        "checking",
        `Add to ${checkingAccount.name}`,
        Math.min(checkingGap, available * 0.15),
        "Keep about half a month of expenses in checking for bill timing.",
        `Stop once ${checkingAccount.name} reaches about ${money.format(checkingTarget)}.`,
        checkingAccount.name
      );

      const savingsGap = Math.max(emergencyTarget - savingsBalance, 0);
      add(
        "savings",
        `Add to ${savingsAccount.name}`,
        Math.min(savingsGap, available * 0.4),
        "Safe cash protects you from needing debt when surprises happen.",
        `Keep adding until savings reaches about ${money.format(emergencyTarget)}.`,
        savingsAccount.name
      );

      state.goals
        .slice()
        .sort((a, b) => (a.targetDate || "9999-12-31").localeCompare(b.targetDate || "9999-12-31"))
        .forEach((goal) => {
          const linked = state.accounts.find((account) => account.id === goal.accountId);
          add(
            "goals",
            goal.name,
            Math.min(monthlyNeeded(goal), available * 0.2),
            "Goal funding comes after due-date payments and core cash reserves.",
            `Move this to ${linked ? linked.name : savingsAccount.name}.`,
            linked?.name || savingsAccount.name
          );
        });

      const investShare = savingsBalance >= emergencyTarget ? remaining * 0.85 : remaining * 0.55;
      add(
        "investing",
        `Add to ${investmentAccount.name}`,
        investShare,
        "Use diversified, low-cost investing after due-date payments and cash reserves.",
        `Use ${investmentAccount.name} for long-term diversified investing when money is not needed soon.`,
        investmentAccount.name
      );

      add(
        "flex",
        `Keep in ${checkingAccount.name}`,
        remaining,
        "Leave a small cushion for surprise expenses or extra debt payoff.",
        "Hold this in checking until the month is stable.",
        checkingAccount.name
      );

      const totals = items.reduce((acc, item) => {
        acc[item.bucket] = (acc[item.bucket] || 0) + item.amount;
        return acc;
      }, { payments: 0, checking: 0, savings: 0, investing: 0, goals: 0, flex: 0 });
      const accountTotals = items.reduce((acc, item) => {
        if (!item.accountName) return acc;
        acc[item.accountName] = (acc[item.accountName] || 0) + item.amount;
        return acc;
      }, {});

      const notes = [
        ["1. Pay cards by due date", "Credit cards are scheduled transfers here, not debt payoff, unless a balance becomes past due."],
        ["2. Keep cash stable", `Use ${checkingAccount.name} for bill timing and ${savingsAccount.name} for emergency cash.`],
        ["3. Invest the long-term slice", `${investmentAccount.name} gets money after due dates, planned costs, and cash buffers are covered.`],
        ["4. Recheck monthly", "Round the amounts, automate what you can, and adjust when account balances or goals change."]
      ];
      if (c.creditUtilization > 0.3) notes.unshift(["Credit utilization", `Utilization is ${pct.format(c.creditUtilization)}. Paying statement balances by due dates should keep this controlled.`]);
      notes.unshift(["Monthly leftover", `${money.format(available)} is available to allocate this month.`]);

      return {
        available,
        totals,
        accountTotals,
        accountNames: {
          checking: checkingAccount.name,
          savings: savingsAccount.name,
          investing: investmentAccount.name
        },
        checkingBalance,
        savingsBalance,
        investmentBalance,
        emergencyTarget,
        items,
        notes
      };
    }

    function safeToSpend(period = state.settings.safeToSpendPeriod || "week") {
      const range = dateRangeForPeriod(period);
      const cashAccounts = state.accounts.filter(isSafeSpendCashAccount);
      const includedIds = ensureArray(state.settings.safeToSpendAccountIds);
      const includedAccounts = includedIds.length ? cashAccounts.filter((account) => includedIds.includes(account.id)) : cashAccounts;
      const availableCash = includedAccounts.reduce((total, account) => total + Number(account.balance || 0), 0);
      const buffer = Number(state.settings.checkingBuffer || 0);
      const obligations = calendarEntries(range.start, range.end).filter((entry) => ["bill", "card", "planned", "goal"].includes(entry.kind));
      const obligationsTotal = obligations.reduce((total, entry) => total + Number(entry.amount || 0), 0);
      const safeAmount = Math.max(availableCash - buffer - obligationsTotal, 0);
      const dailyAmount = Math.max(safeAmount / Math.max(daysBetween(range.start, range.end) + 1, 1), 0);
      return {
        period,
        range,
        includedAccounts,
        availableCash,
        buffer,
        obligations,
        obligationsTotal,
        safeAmount,
        dailyAmount,
        assumptions: [
          "Only liquid asset accounts are counted.",
          "Credit cards, loans, and investment accounts are excluded.",
          "Recurring expenses, card payments, planned expenses, and goal contributions inside the date range are reserved first.",
          "The required checking buffer is preserved before spending money is shown."
        ]
      };
    }

    function isSafeSpendCashAccount(account) {
      return account.status === "asset" && !isInvestmentAccount(account) && accountTypeIncludes(account, ["checking", "cash", "saving", "emergency", "money market"]);
    }

    function dateRangeForPeriod(period) {
      const start = today();
      const date = new Date(`${start}T00:00:00`);
      if (period === "today") return { start, end: start, label: "Today" };
      if (period === "paycheck") return { start, end: nextPaycheckDate(), label: "Until next paycheck" };
      if (period === "month") {
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
        return { start, end, label: "Rest of month" };
      }
      date.setDate(date.getDate() + 6);
      return { start, end: date.toISOString().slice(0, 10), label: "This week" };
    }

    function nextPaycheckDate() {
      const incomeDates = [
        ...state.paycheckPlans.map((plan) => plan.expectedDate),
        ...state.incomeSources.filter((item) => item.frequency !== "one-time").map((item) => nextRecurringOccurrence({
          name: item.name,
          type: "income",
          amountCents: toCents(item.amount),
          nextDate: item.date || today(),
          frequency: item.frequency,
          active: true
        }).date)
      ].filter((date) => date && date >= today()).sort();
      if (incomeDates[0]) return incomeDates[0];
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 14);
      return fallback.toISOString().slice(0, 10);
    }

    function daysBetween(startValue, endValue) {
      const start = new Date(`${startValue}T00:00:00`);
      const end = new Date(`${endValue}T00:00:00`);
      return Math.max(Math.round((end - start) / 86400000), 0);
    }

    function calendarEntries(start = today(), end = today(30)) {
      const entries = [];
      const push = (entry) => {
        if (!entry.date || entry.date < start || entry.date > end) return;
        entries.push({ amount: 0, ...entry });
      };
      recurringRulesFromItems().forEach((rule) => {
        let date = nextRecurringOccurrence(rule).date;
        let guard = 0;
        while (date <= end && guard < 20) {
          push({ id: `${rule.id}:${date}`, date, kind: rule.type === "income" ? "payday" : "bill", title: rule.name, amount: fromCents(rule.amountCents), sourceType: "recurring", sourceId: rule.id });
          date = addFrequency(date, rule.frequency);
          guard += 1;
        }
      });
      state.accounts.filter(isCreditCard).forEach((card) => {
        push({ id: `card-${card.id}`, date: card.dueDate, kind: "card", title: `${card.name} payment due`, amount: Number(card.statementBalance || card.minPayment || 0), sourceType: "account", sourceId: card.id });
      });
      state.plannedExpenses.forEach((item) => {
        push({ id: `planned-${item.id}`, date: item.dueDate, kind: "planned", title: item.name, amount: Math.max(Number(item.total || 0) - Number(item.saved || 0), 0), sourceType: "plannedExpenses", sourceId: item.id });
      });
      state.goals.forEach((goal) => {
        if (!goal.targetDate) return;
        push({ id: `goal-${goal.id}`, date: goal.targetDate, kind: "goal", title: goal.name, amount: monthlyNeeded(goal), sourceType: "goals", sourceId: goal.id });
      });
      state.paycheckPlans.forEach((plan) => {
        push({ id: `paycheck-${plan.id}`, date: plan.expectedDate, kind: "payday", title: plan.name, amount: Number(plan.expectedAmount || 0), sourceType: "paycheckPlans", sourceId: plan.id });
      });
      state.userReminders.forEach((reminder) => {
        push({ id: `reminder-${reminder.id}`, date: reminder.date, kind: "reminder", title: reminder.title, amount: 0, sourceType: "userReminders", sourceId: reminder.id });
      });
      return entries.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
    }

    function bestActionToday(c = calculations(), safe = safeToSpend()) {
      const dueSoon = calendarEntries(today(), today(7)).filter((entry) => ["bill", "card", "planned"].includes(entry.kind));
      if (dueSoon.length) return ["Handle next due item", `${dueSoon[0].title} is due ${dueSoon[0].date}. Confirm the money is ready before optional spending.`];
      const dataIssues = dataQualityIssues();
      if (dataIssues.length) return ["Clean up data", `${dataIssues.length} data issue${dataIssues.length === 1 ? "" : "s"} could make planning less accurate.`];
      if (safe.safeAmount <= 0) return ["Hold spending", "Safe-to-spend is at zero after obligations and your buffer."];
      if (c.savingsRatio < 0.2 && c.leftover > 0) return ["Move leftover money", `Send a rounded amount toward savings or goals. Current leftover is ${money.format(c.leftover)}.`];
      return ["Stay on track", "No urgent issue stands out. Keep spending inside today's safe amount."];
    }

    function preferredAccount(predicate, fallbackName) {
      const account = state.accounts.find(predicate);
      return account || { id: "", name: fallbackName, accountType: fallbackName, status: "asset", balance: 0 };
    }

    function roundMoney(value) {
      if (value <= 0) return 0;
      const increment = value < 100 ? 10 : 25;
      return Math.round(value / increment) * increment;
    }

    function accountTotal(predicate) {
      return state.accounts.filter(predicate).reduce((total, account) => total + Number(account.balance || 0), 0);
    }

    function accountTypeIncludes(account, terms) {
      const accountType = String(account.accountType || "").toLowerCase();
      const name = String(account.name || "").toLowerCase();
      return terms.some((term) => accountType.includes(term) || name.includes(term));
    }

    function isCheckingAccount(account) {
      return account.status === "asset" && accountTypeIncludes(account, ["checking", "cash", "spend"]);
    }

    function isSavingsAccount(account) {
      return account.status === "asset" && accountTypeIncludes(account, ["saving", "emergency", "money market"]);
    }

    function isInvestmentAccount(account) {
      return account.status === "asset" && accountTypeIncludes(account, ["investment", "brokerage", "ira", "401", "roth", "hsa"]);
    }

    function sum(items, key) {
      return items.reduce((total, item) => total + Number(item[key] || 0), 0);
    }

    function monthlyEquivalent(item) {
      const amount = Number(item.amount || 0);
      const multipliers = {
        weekly: 52 / 12,
        biweekly: 26 / 12,
        semimonthly: 2,
        monthly: 1,
        quarterly: 1 / 3,
        yearly: 1 / 12,
        "one-time": 1
      };
      return amount * (multipliers[item.frequency] || 1);
    }

    function isCreditCard(account) {
      return isCreditCardType(account.accountType);
    }

    function isCreditCardType(accountType) {
      return String(accountType || "").trim().toLowerCase() === "credit card";
    }

    function daysUntil(dateValue) {
      if (!dateValue) return Infinity;
      const todayDate = new Date();
      const dueDate = new Date(`${dateValue}T00:00:00`);
      todayDate.setHours(0, 0, 0, 0);
      return Math.ceil((dueDate - todayDate) / 86400000);
    }

    function newestEntries(items) {
      return [...items]
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const addedComparison = String(b.item.createdAt || b.item.updatedAt || dateStamp(b.item.date || b.item.targetDate || b.item.dueDate)).localeCompare(String(a.item.createdAt || a.item.updatedAt || dateStamp(a.item.date || a.item.targetDate || a.item.dueDate)));
          if (addedComparison) return addedComparison;
          const dateComparison = String(b.item.date || b.item.targetDate || b.item.dueDate || "").localeCompare(String(a.item.date || a.item.targetDate || a.item.dueDate || ""));
          if (dateComparison) return dateComparison;
          return b.index - a.index;
        })
        .map(({ item }) => item);
    }

    function plannedCadence(item, cadence) {
      const remaining = Math.max(Number(item.total || 0) - Number(item.saved || 0), 0);
      if (!item.dueDate) return 0;
      const days = Math.max(daysUntil(item.dueDate), 1);
      return cadence === "week" ? remaining / Math.max(days / 7, 1) : remaining / Math.max(days / 30.4375, 1);
    }

    function render() {
      applyPreferences();
      renderDashboard();
      renderSafeToSpend();
      renderTransactionsPage();
      renderBudget();
      renderNetWorth();
      renderAccounts();
      renderIncome();
      renderExpenses();
      renderSavingsRatio();
      renderAiPlan();
      renderGoalsPage();
      renderRecurring();
      renderReports();
      renderSettings();
      renderPaycheckPlanning();
      renderCalendar();
      renderMonthlyReview();
      renderTrustAndDataQuality();
      renderSyncSecurity();
      saveState();
    }

    function renderGoalsPage() {
      renderPlannedExpenses();
      renderGoals();
    }

    function renderDashboard() {
      const c = calculations();
      const safe = safeToSpend();
      updateClock();
      setText("dashNetWorth", money.format(c.netWorth));
      setText("dashAccountNote", `Across ${state.accounts.length} account${state.accounts.length === 1 ? "" : "s"}`);
      setText("dashMonthlyIncome", money.format(c.monthlyIncome));
      setText("dashMonthlyExpenses", money.format(c.monthlyExpenses));
      setText("dashIncomeSpendingRatio", pct.format(c.savingsRatio));
      setText("dashIncomeSpendingNote", `${money.format(c.leftover)} left over`);
      document.getElementById("dashboardTransactionHistory").innerHTML = transactionRows(combinedTransactions().slice(0, 5));
      document.getElementById("dashboardPlannedExpenses").innerHTML = plannedExpenseSummaryRows();
      document.getElementById("dashboardGoalSummary").innerHTML = goalSummaryRows(newestEntries(state.goals).slice(0, 4));
      document.getElementById("todaySummary").innerHTML = todaySummaryCards(c, safe);
      document.getElementById("safeSpendDashboard").innerHTML = safeSpendMini(safe);
    }

    function todaySummaryCards(c, safe) {
      const nextItems = calendarEntries(today(), today(14));
      const changedCount = changedSinceLastVisit();
      const lowAccounts = state.accounts.filter((account) => account.status === "asset" && Number(account.balance || 0) < Number(state.settings.checkingBuffer || 500));
      const [actionTitle, actionBody] = bestActionToday(c, safe);
      return recommendationCards([
        ["Safe today", `${money.format(safe.dailyAmount)} per day through ${safe.range.end}. ${money.format(safe.safeAmount)} total is safe for ${safe.range.label.toLowerCase()}.`],
        ["Next due", nextItems[0] ? `${nextItems[0].title} on ${nextItems[0].date} for ${money.format(nextItems[0].amount || 0)}.` : "Nothing due in the next 14 days."],
        ["Changed since last visit", changedCount ? `${changedCount} new or edited item${changedCount === 1 ? "" : "s"} since your last session.` : "No new changes detected since your last session."],
        ["Account watch", lowAccounts.length ? `${lowAccounts.map((account) => account.name).join(", ")} below your buffer.` : "No liquid accounts are below your buffer."],
        ["Month status", c.leftover >= 0 ? `${money.format(c.leftover)} projected leftover this month.` : `${money.format(Math.abs(c.leftover))} projected shortfall this month.`],
        [actionTitle, actionBody]
      ]);
    }

    function changedSinceLastVisit() {
      if (!previousVisitAt) return 0;
      const items = [...state.accounts, ...state.incomeSources, ...state.expenses, ...state.goals, ...state.plannedExpenses, ...state.budgets, ...state.paycheckPlans];
      return items.filter((item) => String(item.updatedAt || item.createdAt || "") > previousVisitAt).length;
    }

    function safeSpendMini(safe) {
      return `
        <div class="metric-label">${escapeHtml(safe.range.label)} · ${escapeHtml(safe.range.start)} to ${escapeHtml(safe.range.end)}</div>
        <div class="metric-value">${money.format(safe.safeAmount)}</div>
        <div class="metric-note">${money.format(safe.dailyAmount)} per day after ${money.format(safe.obligationsTotal)} reserved and ${money.format(safe.buffer)} buffer.</div>
        <details style="margin-top:12px">
          <summary class="row-title">Why this number?</summary>
          <div class="row-meta">Cash ${money.format(safe.availableCash)} - obligations ${money.format(safe.obligationsTotal)} - buffer ${money.format(safe.buffer)}.</div>
        </details>
      `;
    }

    function renderSafeToSpend() {
      const form = document.getElementById("safeSpendForm");
      if (form) {
        form.elements.period.value = state.settings.safeToSpendPeriod || "week";
        form.elements.checkingBuffer.value = state.settings.checkingBuffer || 0;
      }
      const target = document.getElementById("safeSpendBreakdown");
      if (!target) return;
      const safe = safeToSpend();
      target.innerHTML = `
        <div class="recommendation"><strong>${money.format(safe.safeAmount)} safe for ${escapeHtml(safe.range.label.toLowerCase())}</strong><span class="muted">${money.format(safe.dailyAmount)} per day from ${safe.range.start} to ${safe.range.end}.</span></div>
        <div class="recommendation"><strong>Included cash</strong><span class="muted">${safe.includedAccounts.map((account) => `${account.name}: ${money.format(account.balance)}`).join(" · ") || "No liquid cash accounts found."}</span></div>
        <div class="recommendation"><strong>Reserved obligations</strong><span class="muted">${safe.obligations.length ? safe.obligations.map((entry) => `${entry.title} ${money.format(entry.amount)}`).join(" · ") : "No obligations in this range."}</span></div>
        <div class="recommendation"><strong>Assumptions</strong><span class="muted">${safe.assumptions.join(" ")}</span></div>
      `;
    }

    function updateClock() {
      const now = new Date();
      const hour = now.getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      const dateTime = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(now);
      setText("dashGreeting", `${greeting}, ${state.settings.userName || "Trey"}`);
      setText("dashDateTime", dateTime);
    }

    function combinedTransactions() {
      const legacyItems = state.transactions.map((item) => ({
        ...item,
        collection: "transactions",
        label: item.category || item.name || titleCase(item.type || "transaction"),
        category: item.category || item.name || "Transaction",
        date: item.date || item.createdAt?.slice(0, 10) || today()
      }));
      const incomeItems = state.incomeSources.map((item) => ({
        ...item,
        collection: "incomeSources",
        type: "income",
        label: item.name || "Income",
        category: item.name || "Income",
        date: item.date || item.createdAt?.slice(0, 10) || today()
      }));
      const expenseItems = state.expenses.map((item) => ({
        ...item,
        collection: "expenses",
        type: "expense",
        label: item.name || "Expense",
        category: item.name || "Expense",
        date: item.date || item.createdAt?.slice(0, 10) || today()
      }));
      return [...legacyItems, ...incomeItems, ...expenseItems]
        .sort((a, b) => {
          const dateComparison = String(b.date || "").localeCompare(String(a.date || ""));
          if (dateComparison) return dateComparison;
          return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        });
    }

    function transactionRows(items) {
      return items.map(transactionHistoryRow).join("") || empty("No transactions yet.");
    }

    function transactionHistoryRow(item) {
      const account = state.accounts.find((entry) => entry.id === item.accountId);
      const sign = item.type === "income" ? "+" : item.type === "transfer" ? "" : "-";
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.label || item.category)}</div>
            <div class="row-meta">${item.date || "No date"} &middot; ${titleCase(item.type)}${account ? ` &middot; ${escapeHtml(account.name)}` : ""}${item.notes ? ` &middot; ${escapeHtml(item.notes)}` : ""}</div>
          </div>
          <div class="row-actions">
            <div class="amount ${item.type === "income" ? "positive" : "negative"}">${sign}${money.format(item.amount || 0)}</div>
            ${item.collection && item.collection !== "transactions" ? `<button class="secondary" data-edit="${item.collection}" data-id="${item.id}">Edit</button>` : ""}
            ${item.collection ? `<button class="danger" data-remove="${item.collection}" data-id="${item.id}">Delete</button>` : ""}
          </div>
        </div>
      `;
    }

    function renderTransactionsPage() {
      document.getElementById("transactionHistoryList").innerHTML = transactionRows(filteredTransactions());
      renderTransactionAccountOptions();
    }

    function filteredTransactions() {
      const query = String(document.getElementById("transactionSearch")?.value || "").trim().toLowerCase();
      const type = String(document.getElementById("transactionTypeFilter")?.value || "");
      return combinedTransactions().filter((item) => {
        if (type && item.type !== type) return false;
        if (!query) return true;
        return [item.label, item.category, item.notes, item.date, item.type]
          .some((value) => String(value || "").toLowerCase().includes(query));
      });
    }

    function renderBudget() {
      const list = document.getElementById("budgetList");
      const categoryOptions = document.getElementById("categoryOptions");
      if (categoryOptions) categoryOptions.innerHTML = state.categories.map((category) => `<option value="${escapeHtml(category.name)}"></option>`).join("");
      if (!list) return;
      const month = currentMonth();
      const budgets = state.budgets.filter((budget) => budget.month === month);
      list.innerHTML = budgets.map(budgetRow).join("") || empty("No limits for this month yet.");
    }

    function budgetRow(budget) {
      const spent = state.expenses
        .filter((expense) => expense.date?.startsWith(budget.month) && String(expense.name || "").toLowerCase() === String(budget.category || "").toLowerCase())
        .reduce((total, expense) => total + Number(expense.amount || 0), 0);
      const used = Number(budget.limit) > 0 ? Math.min(spent / Number(budget.limit), 1.5) : 0;
      const remaining = Math.max(Number(budget.limit || 0) - spent, 0);
      const status = used >= 1 ? "Over limit" : used >= 0.9 ? "Near limit" : used >= 0.75 ? "Watch" : "On track";
      return `
        <div class="row">
          <div class="bar-row">
            <div class="row-title">${escapeHtml(budget.category)}</div>
            <div class="row-meta">${titleCase(budget.classification)} · ${money.format(spent)} spent · ${money.format(remaining)} left · ${status}</div>
            <div class="bar-track" aria-label="${escapeHtml(budget.category)} budget ${Math.round(used * 100)} percent used"><span style="width:${Math.min(used, 1) * 100}%"></span></div>
          </div>
          <div class="row-actions">
            <div class="amount">${money.format(budget.limit)}</div>
            <button class="secondary" type="button" data-edit="budgets" data-id="${budget.id}">Edit</button>
            <button class="danger" type="button" data-remove="budgets" data-id="${budget.id}">Delete</button>
          </div>
        </div>
      `;
    }

    function renderSavingsRatio() {
      const c = calculations();
      setText("savingsLeftover", money.format(c.leftover));
      setText("savingsRatioPage", pct.format(c.savingsRatio));
      setText("recurringIncomeTotal", money.format(c.recurringIncome));
      setText("recurringExpenseTotal", money.format(c.recurringExpenses));
      setText("expectedRecurringNet", money.format(c.recurringNet));
      setText("actualNetCash", money.format(c.leftover));
      document.getElementById("savingsRecommendationList").innerHTML = recommendationCards(c.recommendations);
    }

    function renderAiPlan() {
      const plan = allocationPlan();
      setText("aiAvailable", money.format(plan.available));
      setText("aiPayments", money.format(plan.totals.payments || 0));
      setText("aiSavings", money.format(plan.accountTotals[plan.accountNames.savings] || 0));
      setText("aiChecking", money.format(plan.accountTotals[plan.accountNames.checking] || 0));
      setText("aiInvesting", money.format(plan.accountTotals[plan.accountNames.investing] || 0));
      document.getElementById("aiAllocationList").innerHTML = allocationRows(plan.items);
      document.getElementById("aiPlannerNotes").innerHTML = recommendationCards(plan.notes);
    }

    function renderRecurring() {
      const preview = document.getElementById("recurringPreviewList");
      const rules = document.getElementById("recurringRuleList");
      if (!preview || !rules) return;
      const generatedRules = recurringRulesFromItems();
      const allRules = [...state.recurringRules, ...generatedRules];
      rules.innerHTML = allRules.map((rule) => `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(rule.name)}</div>
            <div class="row-meta">${titleCase(rule.type)} · ${scheduleLabel(rule.frequency)} · ${money.format(fromCents(rule.amountCents))}</div>
          </div>
          <div class="amount">${rule.active === false ? "Paused" : "Active"}</div>
        </div>
      `).join("") || empty("No recurring rules yet.");
      preview.innerHTML = allRules
        .filter((rule) => rule.active !== false)
        .map(nextRecurringOccurrence)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 12)
        .map((item) => `
          <div class="row">
            <div>
              <div class="row-title">${escapeHtml(item.name)}</div>
              <div class="row-meta">${item.date} · ${titleCase(item.type)} · ${scheduleLabel(item.frequency)}</div>
            </div>
            <div class="amount ${item.type === "income" ? "positive" : "negative"}">${item.type === "income" ? "+" : "-"}${money.format(fromCents(item.amountCents))}</div>
          </div>
        `).join("") || empty("No upcoming recurring items.");
    }

    function recurringRulesFromItems() {
      const recurringIncome = state.incomeSources.filter((item) => item.frequency !== "one-time").map((item) => ({
        id: `income-${item.id}`,
        name: item.name,
        type: "income",
        amountCents: toCents(item.amount),
        accountId: item.accountId,
        categoryId: item.name,
        nextDate: item.date || today(),
        frequency: item.frequency,
        active: true
      }));
      const recurringExpenses = state.expenses.filter((item) => item.frequency !== "one-time").map((item) => ({
        id: `expense-${item.id}`,
        name: item.name,
        type: "expense",
        amountCents: toCents(item.amount),
        accountId: item.accountId,
        categoryId: item.name,
        nextDate: item.date || today(),
        frequency: item.frequency,
        active: true
      }));
      return [...recurringIncome, ...recurringExpenses];
    }

    function nextRecurringOccurrence(rule) {
      let date = rule.nextDate || today();
      const now = today();
      while (date < now) date = addFrequency(date, rule.frequency);
      return { ...rule, date };
    }

    function addFrequency(dateValue, frequency) {
      const date = new Date(`${dateValue}T00:00:00`);
      if (frequency === "weekly") date.setDate(date.getDate() + 7);
      else if (frequency === "biweekly") date.setDate(date.getDate() + 14);
      else if (frequency === "semimonthly") date.setDate(date.getDate() + 15);
      else if (frequency === "quarterly") date.setMonth(date.getMonth() + 3);
      else if (frequency === "yearly") date.setFullYear(date.getFullYear() + 1);
      else date.setMonth(date.getMonth() + 1);
      return date.toISOString().slice(0, 10);
    }

    function renderReports() {
      const cashFlow = document.getElementById("cashFlowReport");
      const categoryReport = document.getElementById("categoryReport");
      const forecast = document.getElementById("forecastReport");
      if (!cashFlow || !categoryReport || !forecast) return;
      const c = calculations();
      const incomeWidth = c.monthlyIncome > 0 ? 100 : 0;
      const expenseWidth = c.monthlyIncome > 0 ? Math.min(c.monthlyExpenses / c.monthlyIncome, 1) * 100 : 0;
      cashFlow.innerHTML = `
        <div class="recommendation"><strong>${money.format(c.monthlyIncome)} income</strong><span class="muted">${money.format(c.monthlyExpenses)} spending leaves ${money.format(c.leftover)}.</span></div>
        <div class="bar-row"><div class="row-meta">Income</div><div class="bar-track"><span style="width:${incomeWidth}%"></span></div></div>
        <div class="bar-row" style="margin-top:12px"><div class="row-meta">Spending</div><div class="bar-track"><span style="width:${expenseWidth}%"></span></div></div>
      `;
      const byCategory = categoryTotals();
      categoryReport.innerHTML = byCategory.map(([category, amount]) => `
        <div class="row">
          <div class="row-title">${escapeHtml(category)}</div>
          <div class="amount negative">-${money.format(amount)}</div>
        </div>
      `).join("") || empty("No category spending yet.");
      forecast.innerHTML = recommendationCards([
        ["30-day cash flow", `${money.format(c.recurringNet)} expected recurring net before one-time items.`],
        ["Planned expenses", `${money.format(c.plannedRemaining)} remains across upcoming planned expenses.`],
        ["Goals", `${money.format(Math.max(c.goalTarget - c.goalCurrent, 0))} remains across financial goals.`]
      ]);
    }

    function categoryTotals() {
      const totals = new Map();
      state.expenses.forEach((expense) => {
        const key = expense.name || "Expense";
        totals.set(key, (totals.get(key) || 0) + Number(expense.amount || 0));
      });
      return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    }

    function renderSettings() {
      const form = document.getElementById("settingsForm");
      const plan = document.getElementById("planSettingsForm");
      const security = document.getElementById("securityForm");
      if (form) {
        form.elements.userName.value = state.settings.userName || "Trey";
        form.elements.currency.value = state.settings.currency || "USD";
        form.elements.theme.value = state.settings.theme || "system";
        form.elements.privacyMode.value = state.settings.privacyMode || "off";
      }
      if (plan) {
        plan.elements.checkingBuffer.value = state.settings.checkingBuffer ?? 500;
        plan.elements.emergencyMonths.value = state.settings.emergencyMonths ?? 3;
        plan.elements.debtStrategy.value = state.settings.debtStrategy || "avalanche";
      }
      if (security) {
        security.elements.autoLockMinutes.value = String(state.settings.autoLockMinutes || 5);
        setText("securityStatus", state.settings.lockEnabled ? "PIN lock is enabled for this browser." : "PIN lock is off.");
      }
    }

    function renderSyncSecurity() {
      const security = document.getElementById("syncSecurityStatus");
      const backend = document.getElementById("syncBackendStatus");
      const requirements = document.getElementById("syncRequirementsList");
      if (!security || !backend || !requirements) return;
      security.innerHTML = recommendationCards([
        ["Local app lock", state.settings.lockEnabled ? "Enabled. Ledgerly asks for your PIN in this browser before showing the app." : "Off. Turn on PIN lock in Settings."],
        ["PIN storage", "Ledgerly stores only a salted SHA-256 hash locally. The PIN itself is not stored."],
        ["Device scope", "This lock protects this browser profile. It is not an account login and does not sync across devices."]
      ]);
      backend.innerHTML = recommendationCards([
        ["Cloud sync status", "Not connected. Ledgerly is still local-first and does not upload balances, merchants, notes, or transactions."],
        ["Why not active yet?", "Real sync needs a secure backend, authenticated users, encrypted transport, database access rules, conflict handling, and recovery tools."],
        ["Safe fallback", "Use JSON export/import backups until a real backend is connected."]
      ]);
      requirements.innerHTML = syncRequirements().map((item) => `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.title)}</div>
            <div class="row-meta">${escapeHtml(item.detail)}</div>
          </div>
          <div class="amount">${item.required ? "Required" : "Optional"}</div>
        </div>
      `).join("");
    }

    function syncRequirements() {
      return [
        { title: "Authenticated accounts", detail: "A sign-in provider with session management and account recovery.", required: true },
        { title: "Encrypted database", detail: "A hosted database with per-user access controls and encrypted transport.", required: true },
        { title: "Conflict resolution", detail: "Rules for changes made on phone and computer before either device sees the other.", required: true },
        { title: "Audit and restore", detail: "A server-side record of imports, deletes, restores, and migrations without storing secrets.", required: true },
        { title: "End-to-end encryption option", detail: "Optional stronger mode where the server cannot read financial records.", required: false }
      ];
    }

    function randomHex(byteCount = 16) {
      const bytes = new Uint8Array(byteCount);
      crypto.getRandomValues(bytes);
      return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    async function hashPin(pin, salt) {
      if (!crypto.subtle) throw new Error("Secure hashing is not available in this browser.");
      const data = new TextEncoder().encode(`${salt}:${pin}`);
      const digest = await crypto.subtle.digest("SHA-256", data);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    async function setPinLock(pin, minutes) {
      const cleanPin = String(pin || "").trim();
      if (cleanPin.length < 4) throw new Error("Use a PIN with at least 4 digits.");
      const salt = randomHex();
      state.settings.pinSalt = salt;
      state.settings.pinHash = await hashPin(cleanPin, salt);
      state.settings.lockEnabled = true;
      state.settings.autoLockMinutes = Number(minutes || 5);
      logAudit("security", "Enabled local PIN lock.");
      saveState();
      render();
    }

    async function verifyPin(pin) {
      if (!state.settings.lockEnabled || !state.settings.pinHash || !state.settings.pinSalt) return true;
      return await hashPin(String(pin || ""), state.settings.pinSalt) === state.settings.pinHash;
    }

    function setLocked(locked) {
      const screen = document.getElementById("lockScreen");
      if (!screen) return;
      screen.classList.toggle("hidden", !locked);
      screen.setAttribute("aria-hidden", String(!locked));
      if (locked) window.setTimeout(() => document.querySelector('#unlockForm [name="pin"]')?.focus(), 20);
    }

    function initializeSecurityLock() {
      if (state.settings.lockEnabled && state.settings.pinHash) setLocked(true);
      let lastActive = Date.now();
      const touch = () => { lastActive = Date.now(); };
      ["click", "keydown", "touchstart"].forEach((eventName) => document.addEventListener(eventName, touch, { passive: true }));
      window.setInterval(() => {
        if (!state.settings.lockEnabled) return;
        const minutes = Number(state.settings.autoLockMinutes || 5);
        if (Date.now() - lastActive > minutes * 60000) setLocked(true);
      }, 30000);
    }

    function renderPaycheckPlanning() {
      const select = document.getElementById("paycheckIncomeSelect");
      if (select) {
        const current = select.value;
        select.innerHTML = `<option value="">No source selected</option>${state.incomeSources.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${money.format(item.amount || 0)}</option>`).join("")}`;
        select.value = current;
      }
      const list = document.getElementById("paycheckPlanList");
      if (!list) return;
      list.innerHTML = newestEntries(state.paycheckPlans).map(paycheckPlanRow).join("") || empty("No paycheck plans yet.");
    }

    function paycheckPlanRow(plan) {
      const totalAllocated = plan.allocations.reduce((total, item) => total + Number(item.amount || 0), 0);
      const remaining = Number(plan.expectedAmount || 0) - totalAllocated;
      const warning = remaining < 0 ? `Over by ${money.format(Math.abs(remaining))}` : `${money.format(remaining)} unassigned`;
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(plan.name)}</div>
            <div class="row-meta">${plan.expectedDate} · ${money.format(plan.expectedAmount)} expected · ${warning}</div>
            <div class="row-meta">${plan.allocations.map((item) => `${escapeHtml(item.label)} ${money.format(item.amount)}`).join(" · ") || "No allocations yet."}</div>
          </div>
          <div class="row-actions">
            <div class="amount">${money.format(totalAllocated)}</div>
            <button class="secondary" type="button" data-edit="paycheckPlans" data-id="${plan.id}">Edit</button>
            <button class="danger" type="button" data-remove="paycheckPlans" data-id="${plan.id}">Delete</button>
          </div>
        </div>
      `;
    }

    function renderCalendar() {
      const agenda = document.getElementById("calendarAgenda");
      const summary = document.getElementById("calendarMonthSummary");
      if (!agenda || !summary) return;
      const entries = calendarEntries(today(), today(30));
      agenda.innerHTML = entries.map(calendarRow).join("") || empty("Nothing scheduled in the next 30 days.");
      const byKind = entries.reduce((map, entry) => {
        map[entry.kind] = (map[entry.kind] || 0) + 1;
        return map;
      }, {});
      summary.innerHTML = recommendationCards([
        ["Paydays", `${byKind.payday || 0} expected in the next 30 days.`],
        ["Bills and cards", `${(byKind.bill || 0) + (byKind.card || 0)} payment item${(byKind.bill || 0) + (byKind.card || 0) === 1 ? "" : "s"} coming up.`],
        ["Goals and planned expenses", `${(byKind.goal || 0) + (byKind.planned || 0)} target item${(byKind.goal || 0) + (byKind.planned || 0) === 1 ? "" : "s"} on the calendar.`]
      ]);
    }

    function calendarRow(entry) {
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(entry.title)}</div>
            <div class="row-meta">${entry.date} · ${titleCase(entry.kind)} · Source: ${titleCase(entry.sourceType || "derived")}</div>
          </div>
          <div class="amount">${entry.amount ? money.format(entry.amount) : ""}</div>
        </div>
      `;
    }

    const reviewSteps = [
      "Reconcile accounts",
      "Review anomalies and duplicates",
      "Categorize incomplete transactions",
      "Review budget results",
      "Review subscriptions",
      "Update goals and planned expenses",
      "Review net-worth movement",
      "Plan the next month",
      "Record a short reflection"
    ];

    function activeMonthlyReview() {
      let review = state.monthlyReviews.find((item) => item.month === currentMonth());
      if (!review) {
        review = normalizeMonthlyReview({ month: currentMonth() });
        state.monthlyReviews.push(review);
      }
      return review;
    }

    function renderMonthlyReview() {
      const form = document.getElementById("monthlyReviewForm");
      const summary = document.getElementById("monthlyReviewSummary");
      if (!form || !summary) return;
      const review = activeMonthlyReview();
      form.innerHTML = reviewSteps.map((step, index) => `
        <label class="review-step">
          <input type="checkbox" name="step" value="${index}" ${review.completedSteps.includes(index) ? "checked" : ""} />
          <span>${escapeHtml(step)}</span>
        </label>
      `).join("") + `
        <label class="review-reflection">Reflection
          <textarea name="reflection" placeholder="What changed this month?">${escapeHtml(review.reflection)}</textarea>
        </label>
        <div class="actions"><button class="primary" type="submit">Save monthly review</button></div>
      `;
      const percent = reviewSteps.length ? review.completedSteps.length / reviewSteps.length : 0;
      summary.innerHTML = recommendationCards([
        ["Progress", `${review.completedSteps.length} of ${reviewSteps.length} review steps complete (${pct.format(percent)}).`],
        ["Export-safe summary", monthlyReviewSummaryText(review)]
      ]);
    }

    function monthlyReviewSummaryText(review) {
      const c = calculations();
      return `${review.month}: income ${money.format(c.monthlyIncome)}, expenses ${money.format(c.monthlyExpenses)}, net worth ${money.format(c.netWorth)}. Reflection: ${review.reflection || "No reflection yet."}`;
    }

    function renderTrustAndDataQuality() {
      const trust = document.getElementById("trustCenter");
      const quality = document.getElementById("dataQualityList");
      const audit = document.getElementById("auditLogList");
      if (!trust || !quality || !audit) return;
      const issues = dataQualityIssues();
      trust.innerHTML = recommendationCards([
        ["Data location", "Your financial data is stored locally in versioned localStorage and mirrored to IndexedDB when available."],
        ["Leaves device", "No cloud sync or analytics are enabled. JSON export only happens when you request it."],
        ["Login and sync", state.settings.lockEnabled ? "Local PIN lock is enabled. Cloud sync is still not connected." : "Local PIN lock is off. Cloud sync is not connected."],
        ["Schema", `Current schema is v${SCHEMA_VERSION}. Loaded from ${storageLoadReport.sourceKey}.`],
        ["Last save", state.lastSavedAt || "Not saved yet."],
        ["Core calculation", "Net worth is assets minus liabilities. Safe-to-spend is liquid cash minus obligations minus your buffer."]
      ]);
      quality.innerHTML = issues.map((issue) => `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(issue.title)}</div>
            <div class="row-meta">${escapeHtml(issue.detail)} Why: ${escapeHtml(issue.why)}</div>
          </div>
          <div class="amount">${issue.fixable ? "Fixable" : "Review"}</div>
        </div>
      `).join("") || empty("No data quality issues found.");
      audit.innerHTML = newestEntries(state.auditLog).slice(0, 20).map((event) => `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(event.summary)}</div>
            <div class="row-meta">${event.at} · ${titleCase(event.type)}${event.reversible ? " · reversible" : ""}</div>
          </div>
        </div>
      `).join("") || empty("No audit events yet.");
    }

    function dataQualityIssues() {
      const issues = [];
      state.expenses.forEach((item) => {
        if (!item.accountId) issues.push({ id: `expense-account-${item.id}`, title: "Expense without account", detail: item.name, why: "Account-linked expenses make balances and safe-to-spend more reliable.", fixable: false });
        if (!Number(item.amount)) issues.push({ id: `expense-amount-${item.id}`, title: "Expense missing amount", detail: item.name, why: "Zero or blank amounts cannot support budget totals.", fixable: false });
      });
      state.incomeSources.forEach((item) => {
        if (!item.accountId) issues.push({ id: `income-account-${item.id}`, title: "Income without account", detail: item.name, why: "Deposits should point to an account when possible.", fixable: false });
      });
      state.goals.forEach((goal) => {
        if (goal.accountId && !state.accounts.some((account) => account.id === goal.accountId)) issues.push({ id: `goal-link-${goal.id}`, title: "Goal linked to missing account", detail: goal.name, why: "Broken links stop derived progress from being trustworthy.", fixable: true, collection: "goals", entryId: goal.id, field: "accountId" });
      });
      state.plannedExpenses.forEach((item) => {
        if (item.accountId && !state.accounts.some((account) => account.id === item.accountId)) issues.push({ id: `planned-link-${item.id}`, title: "Planned expense linked to missing account", detail: item.name, why: "Broken links can misdirect contribution recommendations.", fixable: true, collection: "plannedExpenses", entryId: item.id, field: "accountId" });
      });
      const seen = new Map();
      combinedTransactions().forEach((item) => {
        const key = [item.date, item.type, item.label, item.amount].join("|");
        if (seen.has(key)) issues.push({ id: `duplicate-${item.id}`, title: "Possible duplicate", detail: `${item.label} on ${item.date}`, why: "Same date, type, name, and amount appeared more than once.", fixable: false });
        seen.set(key, item.id);
      });
      return issues.filter((issue) => !state.dataQualityDismissals.includes(issue.id));
    }

    function applyPreferences() {
      const theme = state.settings.theme || "system";
      document.body.classList.toggle("theme-light", theme === "light");
      document.body.classList.toggle("theme-dark", theme === "dark");
      document.body.classList.toggle("privacy-mode", state.settings.privacyMode === "on");
      money = new Intl.NumberFormat(state.settings.locale || "en-US", { style: "currency", currency: state.settings.currency || "USD" });
    }

    function healthDetail(c) {
      if (c.leftover < 0) return "Expenses are higher than income this month. Focus on reducing outflow.";
      if (c.savingsRatio >= 0.2) return "You are keeping a healthy share of income available for goals, debt, or investing.";
      if (c.savingsRatio > 0) return "You have positive cash flow. The next step is improving the savings ratio.";
      return "Add income and expense data to make the score useful.";
    }

    function recommendationCards(items) {
      return items.map(([title, body]) => `
        <div class="recommendation">
          <strong>${escapeHtml(title)}</strong>
          <span class="muted">${escapeHtml(body)}</span>
        </div>
      `).join("") || empty("Add more data to get recommendations.");
    }

    function allocationCards(items) {
      return items.map((item) => `
        <div class="recommendation">
          <strong>${money.format(item.amount)} this month: ${escapeHtml(item.accountName || item.label)}</strong>
          <span class="muted">${escapeHtml(item.action || item.reason)}</span>
        </div>
      `).join("") || empty("Add income, expenses, accounts, and goals to build an allocation plan.");
    }

    function allocationRows(items) {
      return items.map((item) => `
        <div class="row">
          <div>
            <div class="row-title">${money.format(item.amount)} / month - ${escapeHtml(item.accountName || item.label)}</div>
            <div class="row-meta">${escapeHtml(item.label)}. ${escapeHtml(item.action || "")} ${escapeHtml(item.reason)}</div>
          </div>
          <div class="amount">${titleCase(item.bucket)}</div>
        </div>
      `).join("") || empty("Add positive leftover money to generate an allocation plan.");
    }

    function upcomingPaymentRows() {
      const creditCardItems = state.accounts.filter(isCreditCard).map((card) => ({
        type: "Credit card",
        name: card.name,
        dueDate: card.dueDate,
        amount: Number(card.minPayment || 0),
        detail: `${money.format(card.balance || 0)} owed · ${pct.format(card.creditLimit ? card.balance / card.creditLimit : 0)} utilization`
      }));
      const rows = creditCardItems
        .filter((item) => item.dueDate)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5)
        .map(upcomingPaymentRow)
        .join("");
      return rows || empty("No card payments yet.");
    }

    function upcomingPaymentRow(item) {
      const days = daysUntil(item.dueDate);
      const dueText = days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `Due in ${days} days`;
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.name)}</div>
            <div class="row-meta">${item.type} · ${item.dueDate} · ${dueText} · ${escapeHtml(item.detail)}</div>
          </div>
          <div class="amount">${money.format(item.amount)}</div>
        </div>
      `;
    }

    function orderedPlannedExpenses() {
      return [...state.plannedExpenses]
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const aHasDate = Boolean(a.item.dueDate);
          const bHasDate = Boolean(b.item.dueDate);
          if (aHasDate && bHasDate) return String(a.item.dueDate).localeCompare(String(b.item.dueDate));
          if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
          const createdComparison = String(b.item.createdAt || dateStamp(b.item.dueDate)).localeCompare(String(a.item.createdAt || dateStamp(a.item.dueDate)));
          if (createdComparison) return createdComparison;
          return b.index - a.index;
        })
        .map(({ item }) => item);
    }

    function plannedExpenseSummaryRows() {
      const rows = orderedPlannedExpenses()
        .slice(0, 4)
        .map((item) => {
          const remaining = Math.max(Number(item.total || 0) - Number(item.saved || 0), 0);
          const dueText = item.dueDate ? `Due ${item.dueDate}` : "No due date";
          const fundingText = item.dueDate ? `${money.format(plannedCadence(item, "month"))}/month` : "Add a due date for funding math";
          return `
            <div class="row">
              <div>
                <div class="row-title">${escapeHtml(item.name)}</div>
                <div class="row-meta">${escapeHtml(item.category)} &middot; ${dueText} &middot; ${fundingText}</div>
              </div>
              <div class="row-actions">
                <div class="amount">${money.format(remaining)} left</div>
                <button class="secondary" type="button" data-edit="plannedExpenses" data-id="${item.id}">Edit</button>
                <button class="danger" type="button" data-remove="plannedExpenses" data-id="${item.id}">Delete</button>
              </div>
            </div>
          `;
        })
        .join("");
      return rows || empty("No planned expenses yet.");
    }

    function goalSummaryRows(items) {
      return items.map((goal) => {
        const progress = goal.target > 0 ? Math.min(goal.current / goal.target, 1) : 0;
        return `
          <div class="row">
            <div>
              <div class="row-title">${escapeHtml(goal.name)}</div>
              <div class="row-meta">${money.format(goal.current)} of ${money.format(goal.target)}${goal.targetDate ? ` &middot; ${goal.targetDate}` : ""}</div>
              <div class="progress"><span style="width:${progress * 100}%"></span></div>
            </div>
            <div class="row-actions">
              <div class="amount">${pct.format(progress)}</div>
              <button class="secondary" type="button" data-goal-edit="${goal.id}">Edit</button>
              <button class="danger" type="button" data-goal-delete="${goal.id}">Delete</button>
            </div>
          </div>
        `;
      }).join("") || empty("No goals yet.");
    }

    function renderNetWorth() {
      const c = calculations();
      setText("totalAssets", money.format(c.totalAssets));
      setText("totalLiabilities", money.format(c.totalLiabilities));
      setText("netWorthTotal", money.format(c.netWorth));
      setText("netWorthCount", String(state.accounts.length));
      document.getElementById("netWorthSummary").innerHTML = `
        <div class="summary-item">
          <div class="metric-label">Asset accounts</div>
          <div class="row-title">${state.accounts.filter((item) => item.status === "asset").length}</div>
        </div>
        <div class="summary-item">
          <div class="metric-label">Liability accounts</div>
          <div class="row-title">${state.accounts.filter((item) => item.status === "liability").length}</div>
        </div>
        <div class="summary-item">
          <div class="metric-label">Account total</div>
          <div class="row-title">${money.format(c.accountBalanceTotal)}</div>
        </div>
      `;
      document.getElementById("netWorthList").innerHTML = state.accounts.map(accountRow).join("") || empty("No accounts yet.");
    }

    function renderAccounts() {
      document.getElementById("accountList").innerHTML = state.accounts.map(accountRow).join("") || empty("No accounts yet.");
      renderGoalAccountOptions();
      renderIncomeAccountOptions();
      renderExpenseAccountOptions();
      renderPlannedAccountOptions();
    }

    function accountRow(item) {
      const utilization = isCreditCard(item) && Number(item.creditLimit) > 0 ? Number(item.balance) / Number(item.creditLimit) : 0;
      const cardMeta = isCreditCard(item)
        ? ` · Utilization ${pct.format(utilization)} · Due ${item.dueDate || "not set"} · Min ${money.format(item.minPayment || 0)}`
        : "";
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.name)}</div>
            <div class="row-meta">${escapeHtml(item.accountType)} · ${titleCase(item.status)}${cardMeta}</div>
          </div>
          <div>
            <div class="amount ${item.status === "asset" ? "positive" : "negative"}">${item.status === "asset" ? "" : "-"}${money.format(item.balance)}</div>
            <button class="secondary" type="button" data-edit="accounts" data-id="${item.id}">Edit</button>
            <button class="danger" type="button" data-remove="accounts" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `;
    }

    function renderIncome() {
      document.getElementById("incomeList").innerHTML = newestEntries(state.incomeSources)
        .map(incomeLedgerRow)
        .join("") || empty("No income sources yet.");
      renderIncomeAccountOptions();
    }

    function renderExpenses() {
      document.getElementById("expenseList").innerHTML = newestEntries(state.expenses)
        .map(expenseLedgerRow)
        .join("") || empty("No expenses yet.");
      renderExpenseAccountOptions();
    }

    function renderPlannedExpenses() {
      const plannedItems = newestEntries(state.plannedExpenses);
      const plannedTotal = sum(state.plannedExpenses, "total");
      const plannedSaved = sum(state.plannedExpenses, "saved");
      const plannedRemaining = Math.max(plannedTotal - plannedSaved, 0);
      const plannedSummary = document.getElementById("plannedCategorySummary");
      if (plannedSummary) {
        plannedSummary.innerHTML = `
          <div class="summary-item">
            <div class="metric-label">Planned items</div>
            <div class="row-title">${state.plannedExpenses.length}</div>
          </div>
          <div class="summary-item">
            <div class="metric-label">Still needed</div>
            <div class="row-title">${money.format(plannedRemaining)}</div>
          </div>
        `;
      }
      document.getElementById("plannedExpenseList").innerHTML = plannedItems
        .map(plannedExpenseRow)
        .join("") || empty("No planned expenses yet.");
      renderPlannedAccountOptions();
      bindGoalsPageActions();
    }

    function renderGoals() {
      const goalItems = newestEntries(state.goals);
      const goalTarget = sum(state.goals, "target");
      const goalCurrent = sum(state.goals, "current");
      const goalRemaining = Math.max(goalTarget - goalCurrent, 0);
      const goalSummary = document.getElementById("goalCategorySummary");
      if (goalSummary) {
        goalSummary.innerHTML = `
          <div class="summary-item">
            <div class="metric-label">Active goals</div>
            <div class="row-title">${state.goals.length}</div>
          </div>
          <div class="summary-item">
            <div class="metric-label">Still needed</div>
            <div class="row-title">${money.format(goalRemaining)}</div>
          </div>
        `;
      }
      document.getElementById("goalList").innerHTML = goalItems.map((goal) => {
        const progress = goal.target > 0 ? Math.min(goal.current / goal.target, 1) : 0;
        const needed = monthlyNeeded(goal);
        const linkedAccount = state.accounts.find((account) => account.id === goal.accountId);
        return `
          <div class="row">
            <div>
              <div class="row-title">${escapeHtml(goal.name)}</div>
              <div class="row-meta">${money.format(goal.current)} of ${money.format(goal.target)}. ${money.format(needed)} per month needed.${linkedAccount ? ` Linked to ${escapeHtml(linkedAccount.name)}.` : ""}</div>
              <div class="progress"><span style="width:${progress * 100}%"></span></div>
            </div>
            <div>
              <div class="amount">${pct.format(progress)}</div>
              <button class="secondary" type="button" data-goal-edit="${goal.id}">Edit</button>
              <button class="danger" type="button" data-goal-delete="${goal.id}">Delete</button>
            </div>
          </div>
        `;
      }).join("") || empty("No goals yet.");
      renderGoalAccountOptions();
      bindGoalsPageActions();
    }

    function bindGoalsPageActions() {
      document.querySelectorAll("[data-goal-edit]").forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          editEntry("goals", button.dataset.goalEdit);
        };
      });
      document.querySelectorAll("[data-goal-delete]").forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          removeEntry("goals", button.dataset.goalDelete);
          renderGoalsPage();
          renderDashboard();
        };
      });
      document.querySelectorAll("[data-planned-edit]").forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          editEntry("plannedExpenses", button.dataset.plannedEdit);
        };
      });
      document.querySelectorAll("[data-planned-delete]").forEach((button) => {
        button.onclick = (event) => {
          event.preventDefault();
          removeEntry("plannedExpenses", button.dataset.plannedDelete);
          renderGoalsPage();
          renderDashboard();
        };
      });
    }

    function renderGoalAccountOptions() {
      const select = document.getElementById("goalAccountSelect");
      if (!select) return;
      const current = select.value;
      select.innerHTML = `<option value="">No linked account</option>${state.accounts.map((account) => `
        <option value="${account.id}" ${account.id === current ? "selected" : ""}>${escapeHtml(account.name)} (${escapeHtml(account.accountType)})</option>
      `).join("")}`;
    }

    function renderExpenseAccountOptions() {
      const select = document.getElementById("expenseAccountSelect");
      if (!select) return;
      const current = select.value;
      const availableAccounts = state.accounts.filter((account) => account.status === "asset" || isCreditCard(account));
      select.innerHTML = `<option value="">Choose account</option>${availableAccounts.map(accountOption).join("")}`;
      select.value = current;
    }

    function renderIncomeAccountOptions() {
      const select = document.getElementById("incomeAccountSelect");
      if (!select) return;
      const current = select.value;
      const assetAccounts = state.accounts.filter((account) => account.status === "asset");
      select.innerHTML = `<option value="">Choose account</option>${assetAccounts.map(accountOption).join("")}`;
      select.value = current;
    }

    function renderTransactionAccountOptions() {
      const select = document.getElementById("transactionAccountSelect");
      if (!select) return;
      const current = select.value;
      const type = document.getElementById("transactionTypeSelect")?.value || "expense";
      const availableAccounts = type === "income"
        ? state.accounts.filter((account) => account.status === "asset")
        : state.accounts.filter((account) => account.status === "asset" || isCreditCard(account));
      select.innerHTML = `<option value="">No account selected</option>${availableAccounts.map(accountOption).join("")}`;
      if ([...select.options].some((option) => option.value === current)) select.value = current;
    }

    function renderPlannedAccountOptions() {
      const select = document.getElementById("plannedAccountSelect");
      if (!select) return;
      const current = select.value;
      select.innerHTML = `<option value="">No linked account</option>${state.accounts.map(accountOption).join("")}`;
      select.value = current;
    }

    function accountOption(account) {
      return `<option value="${account.id}">${escapeHtml(account.name)} (${escapeHtml(account.accountType)})</option>`;
    }

    function expenseRow(item) {
      const account = state.accounts.find((entry) => entry.id === item.accountId);
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.name)}</div>
            <div class="row-meta">${item.date} &middot; ${account ? escapeHtml(account.name) : "No account linked"}</div>
          </div>
          <div class="amount negative">-${money.format(item.amount)}</div>
        </div>
      `;
    }

    function expenseLedgerRow(item) {
      const account = state.accounts.find((entry) => entry.id === item.accountId);
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.name)}</div>
            <div class="row-meta">${item.date} &middot; <span class="chip">${scheduleLabel(item.frequency)}</span> &middot; ${account ? escapeHtml(account.name) : "No account linked"}${item.notes ? ` &middot; ${escapeHtml(item.notes)}` : ""}</div>
          </div>
          <div>
            <div class="amount negative">-${money.format(item.amount)}</div>
            <button class="secondary" type="button" data-edit="expenses" data-id="${item.id}">Edit</button>
            <button class="danger" type="button" data-remove="expenses" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `;
    }

    function incomeLedgerRow(item) {
      const account = state.accounts.find((entry) => entry.id === item.accountId);
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.name)}</div>
            <div class="row-meta">${item.date} &middot; <span class="chip">${scheduleLabel(item.frequency)}</span> &middot; ${account ? escapeHtml(account.name) : "No account linked"}${item.notes ? ` &middot; ${escapeHtml(item.notes)}` : ""}</div>
          </div>
          <div>
            <div class="amount positive">+${money.format(item.amount)}</div>
            <button class="secondary" type="button" data-edit="incomeSources" data-id="${item.id}">Edit</button>
            <button class="danger" type="button" data-remove="incomeSources" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `;
    }

    function simpleMoneyRow(item, collection) {
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.name)}</div>
            <div class="row-meta"><span class="chip">${scheduleLabel(item.frequency)}</span> ${item.frequency === "one-time" ? "" : `${money.format(monthlyEquivalent(item))} monthly`}</div>
          </div>
          <div>
            <div class="amount">${money.format(item.amount)}</div>
            <button class="secondary" type="button" data-edit="${collection}" data-id="${item.id}">Edit</button>
            <button class="danger" type="button" data-remove="${collection}" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `;
    }

    function monthlyNeeded(goal) {
      const remaining = Math.max(Number(goal.target) - Number(goal.current), 0);
      if (!goal.targetDate) return remaining;
      const now = new Date();
      const end = new Date(`${goal.targetDate}T00:00:00`);
      const months = Math.max((end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth(), 1);
      return remaining / months;
    }

    function plannedExpenseRow(item) {
      const account = state.accounts.find((entry) => entry.id === item.accountId);
      const progress = Number(item.total) > 0 ? Math.min(Number(item.saved || 0) / Number(item.total), 1) : 0;
      const dueDate = item.dueDate || "No due date";
      const cadenceText = item.dueDate ? `${money.format(plannedCadence(item, "week"))}/week or ${money.format(plannedCadence(item, "month"))}/month` : "Add a due date to calculate weekly/monthly savings";
      return `
        <div class="row">
          <div>
            <div class="row-title">${escapeHtml(item.name)}</div>
            <div class="row-meta">${escapeHtml(item.category)} &middot; ${dueDate} &middot; ${cadenceText}${account ? ` &middot; ${escapeHtml(account.name)}` : ""}</div>
            <div class="progress"><span style="width:${progress * 100}%"></span></div>
          </div>
          <div>
            <div class="amount">${money.format(item.saved)} / ${money.format(item.total)}</div>
            <button class="secondary" type="button" data-planned-edit="${item.id}">Edit</button>
            <button class="danger" type="button" data-planned-delete="${item.id}">Delete</button>
          </div>
        </div>
      `;
    }

    const guidedFlows = {
      "transaction-expense": {
        title: "Add expense",
        done: "Expense saved",
        steps: [
          { key: "amount", title: "How much did you spend?", hint: "Enter the amount that left your money.", type: "money", placeholder: "0.00" },
          { key: "name", title: "What was it for?", hint: "Keep it short, like groceries or rent.", type: "text", placeholder: "Groceries" },
          { key: "accountId", title: "Paid from where?", hint: "Choose the account this came out of.", type: "account", mode: "expense" },
          { key: "date", title: "When did it happen?", hint: "Today is already selected.", type: "date" },
          { key: "notes", title: "Anything to remember?", hint: "Optional.", type: "text", placeholder: "Optional note", optional: true }
        ],
        save: saveGuidedExpense
      },
      "transaction-income": {
        title: "Add income",
        done: "Income saved",
        steps: [
          { key: "amount", title: "How much came in?", hint: "Enter the amount you received.", type: "money", placeholder: "0.00" },
          { key: "name", title: "Where did it come from?", hint: "Paycheck, refund, freelance, or anything else.", type: "text", placeholder: "Paycheck" },
          { key: "accountId", title: "Deposit to which account?", hint: "Choose where the money landed.", type: "account", mode: "income" },
          { key: "date", title: "When did it arrive?", hint: "Today is already selected.", type: "date" },
          { key: "notes", title: "Anything to remember?", hint: "Optional.", type: "text", placeholder: "Optional note", optional: true }
        ],
        save: saveGuidedIncome
      },
      "transaction-transfer": {
        title: "Move money",
        done: "Transfer saved",
        steps: [
          { key: "amount", title: "How much are you moving?", hint: "Transfers are not counted as expenses.", type: "money", placeholder: "0.00" },
          { key: "fromAccountId", title: "From which account?", hint: "Choose the account money leaves.", type: "account", mode: "asset" },
          { key: "toAccountId", title: "To which account?", hint: "Choose the account receiving it.", type: "account", mode: "any" },
          { key: "name", title: "What should we call it?", hint: "Optional.", type: "text", placeholder: "Transfer", optional: true }
        ],
        save: saveGuidedTransfer
      },
      account: {
        title: "New account",
        done: "Account saved",
        steps: [
          { key: "name", title: "What is this account called?", hint: "Use the name you recognize.", type: "text", placeholder: "Checking" },
          { key: "accountType", title: "What type is it?", hint: "Pick one or type your own.", type: "accountType" },
          { key: "status", title: "Is it money you have or owe?", hint: "Credit cards and loans are liabilities.", type: "choice", choices: [["asset", "Asset"], ["liability", "Liability"]] },
          { key: "balance", title: "What is the current balance?", hint: "Use the balance as of today.", type: "money", placeholder: "0.00" },
          { key: "creditLimit", title: "What is the credit limit?", hint: "Credit cards only.", type: "money", placeholder: "0.00", cardOnly: true },
          { key: "dueDate", title: "When is the payment due?", hint: "Credit cards only.", type: "date", cardOnly: true },
          { key: "minPayment", title: "Minimum payment?", hint: "Credit cards only.", type: "money", placeholder: "0.00", cardOnly: true },
          { key: "statementBalance", title: "Statement balance?", hint: "Credit cards only.", type: "money", placeholder: "0.00", cardOnly: true },
          { key: "apr", title: "APR?", hint: "Credit cards only.", type: "number", placeholder: "24.99", cardOnly: true }
        ],
        save: saveGuidedAccount
      },
      goal: {
        title: "New goal",
        done: "Goal saved",
        steps: [
          { key: "name", title: "What are you saving for?", hint: "Name the goal.", type: "text", placeholder: "Emergency fund" },
          { key: "target", title: "What is the target amount?", hint: "How much do you want to reach?", type: "money", placeholder: "0.00" },
          { key: "current", title: "How much is already saved?", hint: "Optional. Use 0 if you are starting fresh.", type: "money", placeholder: "0.00", optional: true },
          { key: "targetDate", title: "Target date?", hint: "Optional.", type: "date", optional: true },
          { key: "accountId", title: "Link an account?", hint: "Optional.", type: "account", mode: "asset", optional: true }
        ],
        save: saveGuidedGoal
      },
      "planned-expense": {
        title: "Planned expense",
        done: "Planned expense saved",
        steps: [
          { key: "name", title: "What expense is coming up?", hint: "Name the known future cost.", type: "text", placeholder: "Car repair" },
          { key: "category", title: "What category fits?", hint: "Travel, car, medical, home, or anything else.", type: "text", placeholder: "Car" },
          { key: "total", title: "How much will you need?", hint: "Use the expected total.", type: "money", placeholder: "0.00" },
          { key: "saved", title: "How much is saved already?", hint: "Optional.", type: "money", placeholder: "0.00", optional: true },
          { key: "dueDate", title: "When is it needed?", hint: "Optional.", type: "date", optional: true },
          { key: "accountId", title: "Link an account?", hint: "Optional.", type: "account", mode: "asset", optional: true }
        ],
        save: saveGuidedPlannedExpense
      }
    };

    let guidedState = null;

    function openGuidedFlow(flowName) {
      const flow = guidedFlows[flowName];
      if (!flow) return;
      guidedState = { flowName, index: 0, values: { date: today(), status: "asset" } };
      if (flowName === "account") guidedState.values.accountType = "Checking";
      renderGuidedStep();
      document.getElementById("guidedSheetBackdrop").classList.add("active");
      document.getElementById("guidedSheetBackdrop").setAttribute("aria-hidden", "false");
    }

    function closeGuidedFlow() {
      document.getElementById("guidedSheetBackdrop").classList.remove("active");
      document.getElementById("guidedSheetBackdrop").setAttribute("aria-hidden", "true");
      guidedState = null;
    }

    function activeGuidedSteps(flow, values) {
      return flow.steps.filter((step) => !step.cardOnly || isCreditCardType(values.accountType));
    }

    function renderGuidedStep(doneMessage = "") {
      if (!guidedState) return;
      const flow = guidedFlows[guidedState.flowName];
      const steps = activeGuidedSteps(flow, guidedState.values);
      const step = steps[guidedState.index];
      const body = document.getElementById("guidedSheetBody");
      document.getElementById("guidedStepCount").textContent = doneMessage || `Step ${guidedState.index + 1} of ${steps.length}`;
      if (doneMessage) {
        body.innerHTML = `
          <div class="confirmation-card">
            <div class="confirmation-mark">&check;</div>
            <div>
              <h2 id="guidedSheetTitle">${doneMessage}</h2>
              <p class="muted">Your money dashboard is updated.</p>
            </div>
          </div>
        `;
        setTimeout(closeGuidedFlow, 1400);
        return;
      }
      body.innerHTML = `
        <div class="sheet-question">
          <h2 id="guidedSheetTitle">${step.title}</h2>
          <p>${step.hint || ""}</p>
          <div class="sheet-field">${guidedFieldMarkup(step)}</div>
        </div>
        <div class="sheet-actions">
          <button class="secondary" id="guidedBackButton" type="button">${guidedState.index === 0 ? "Cancel" : "Back"}</button>
          <button class="primary" id="guidedNextButton" type="button">${guidedState.index === steps.length - 1 ? "Done" : "Next"}</button>
        </div>
      `;
      document.getElementById("guidedBackButton").addEventListener("click", guidedBack);
      document.getElementById("guidedNextButton").addEventListener("click", guidedNext);
      document.querySelectorAll("[data-guided-choice]").forEach((button) => {
        button.addEventListener("click", () => {
          guidedState.values[step.key] = button.dataset.guidedChoice;
          renderGuidedStep();
        });
      });
      const field = document.getElementById("guidedInput");
      if (field) {
        field.focus();
        field.addEventListener("keydown", (event) => {
          if (event.key === "Enter") guidedNext();
        });
      }
    }

    function guidedFieldMarkup(step) {
      const value = guidedState.values[step.key] ?? (step.type === "date" && !step.optional ? today() : "");
      if (step.type === "choice") {
        return `<div class="choice-grid">${step.choices.map(([choiceValue, label]) => `
          <button class="choice-button ${value === choiceValue ? "active" : ""}" type="button" data-guided-choice="${choiceValue}">${label}</button>
        `).join("")}</div>`;
      }
      if (step.type === "account") {
        const accounts = guidedAccounts(step.mode);
        return `<select id="guidedInput"><option value="">No account selected</option>${accounts.map(accountOption).join("")}</select>`;
      }
      if (step.type === "accountType") {
        return `<input id="guidedInput" list="guidedAccountTypes" value="${escapeHtml(value)}" placeholder="Checking, credit card, loan" />
          <datalist id="guidedAccountTypes">
            <option value="Checking"></option><option value="Emergency savings"></option><option value="Investment"></option><option value="Cash"></option><option value="Credit card"></option><option value="Loan"></option><option value="HSA"></option><option value="Other"></option>
          </datalist>`;
      }
      const inputType = step.type === "money" || step.type === "number" ? "number" : step.type;
      const attrs = step.type === "money" || step.type === "number" ? `min="0" step="0.01"` : "";
      return `<input id="guidedInput" type="${inputType}" ${attrs} value="${escapeHtml(value)}" placeholder="${escapeHtml(step.placeholder || "")}" />`;
    }

    function guidedAccounts(mode) {
      if (mode === "income" || mode === "asset") return state.accounts.filter((account) => account.status === "asset");
      if (mode === "expense") return state.accounts.filter((account) => account.status === "asset" || isCreditCard(account));
      return state.accounts;
    }

    function guidedBack() {
      if (!guidedState) return;
      if (guidedState.index === 0) {
        closeGuidedFlow();
        return;
      }
      guidedState.index -= 1;
      renderGuidedStep();
    }

    function guidedNext() {
      if (!guidedState) return;
      const flow = guidedFlows[guidedState.flowName];
      const steps = activeGuidedSteps(flow, guidedState.values);
      const step = steps[guidedState.index];
      const field = document.getElementById("guidedInput");
      if (field) guidedState.values[step.key] = field.value;
      if (step.key === "accountType" && isCreditCardType(guidedState.values.accountType)) guidedState.values.status = "liability";
      if (guidedState.index < steps.length - 1) {
        guidedState.index += 1;
        renderGuidedStep();
        return;
      }
      const completedFlowName = guidedState.flowName;
      flow.save(guidedState.values);
      closeGuidedFlow();
      render();
      if (completedFlowName === "goal") {
        showView("planned");
        renderGoalsPage();
        renderDashboard();
      }
      if (completedFlowName === "planned-expense") {
        showView("planned");
        renderGoalsPage();
        renderDashboard();
      }
    }

    function saveGuidedExpense(values) {
      const now = new Date().toISOString();
      const expense = {
        id: id(),
        date: values.date || today(),
        name: String(values.name || "").trim() || "Expense",
        frequency: "one-time",
        amount: Number(values.amount || 0),
        accountId: values.accountId || "",
        notes: values.notes || "",
        accountApplied: Boolean(values.accountId),
        createdAt: now,
        updatedAt: now
      };
      applyExpenseImpact(expense, 1);
      upsert("expenses", expense);
      showView("transactions");
    }

    function saveGuidedIncome(values) {
      const now = new Date().toISOString();
      const income = {
        id: id(),
        date: values.date || today(),
        name: String(values.name || "").trim() || "Income",
        frequency: "one-time",
        amount: Number(values.amount || 0),
        accountId: values.accountId || "",
        notes: values.notes || "",
        accountApplied: Boolean(values.accountId),
        createdAt: now,
        updatedAt: now
      };
      applyIncomeImpact(income, 1);
      upsert("incomeSources", income);
      showView("transactions");
    }

    function saveGuidedTransfer(values) {
      const amount = Number(values.amount || 0);
      const from = state.accounts.find((account) => account.id === values.fromAccountId);
      const to = state.accounts.find((account) => account.id === values.toAccountId);
      if (from?.status === "asset") from.balance -= amount;
      if (to) {
        if (isCreditCard(to) || to.status === "liability") to.balance = Math.max(Number(to.balance || 0) - amount, 0);
        else to.balance += amount;
      }
      const now = new Date().toISOString();
      upsert("transactions", {
        id: id(),
        date: today(),
        type: "transfer",
        category: String(values.name || "").trim() || "Transfer",
        amount,
        accountId: values.fromAccountId || "",
        toAccountId: values.toAccountId || "",
        notes: to ? `To ${to.name}` : "",
        createdAt: now,
        updatedAt: now
      });
      saveState();
      showView("transactions");
    }

    function saveGuidedAccount(values) {
      const accountType = String(values.accountType || "").trim() || "Other";
      const isCard = isCreditCardType(accountType);
      upsert("accounts", {
        id: id(),
        name: String(values.name || "").trim() || accountType,
        accountType,
        status: isCard ? "liability" : values.status || "asset",
        balance: Number(values.balance || 0),
        creditLimit: isCard ? Number(values.creditLimit || 0) : 0,
        dueDate: isCard ? values.dueDate || "" : "",
        minPayment: isCard ? Number(values.minPayment || 0) : 0,
        statementBalance: isCard ? Number(values.statementBalance || 0) : 0,
        apr: isCard ? Number(values.apr || 0) : 0
      });
      showView("accounts");
    }

    function saveGuidedGoal(values) {
      const now = new Date().toISOString();
      upsert("goals", {
        id: id(),
        name: String(values.name || "").trim() || "Goal",
        current: Number(values.current || 0),
        target: Number(values.target || 0),
        targetDate: values.targetDate || "",
        accountId: values.accountId || "",
        createdAt: now,
        updatedAt: now
      });
      showView("planned");
      renderGoalsPage();
      renderDashboard();
      saveState();
    }

    function saveGuidedPlannedExpense(values) {
      const now = new Date().toISOString();
      upsert("plannedExpenses", {
        id: id(),
        name: String(values.name || "").trim() || "Planned expense",
        category: String(values.category || "").trim() || "Planned",
        total: Number(values.total || 0),
        dueDate: values.dueDate || "",
        saved: Number(values.saved || 0),
        accountId: values.accountId || "",
        createdAt: now,
        updatedAt: now
      });
      showView("planned");
      renderGoalsPage();
      renderDashboard();
      saveState();
    }

    function bindForms() {
      const accountForm = document.getElementById("accountForm");
      const transactionFlowForm = document.getElementById("transactionFlowForm");
      const incomeForm = document.getElementById("incomeForm");
      const expenseForm = document.getElementById("expenseForm");
      const plannedExpenseForm = document.getElementById("plannedExpenseForm");
      const goalForm = document.getElementById("goalForm");
      const budgetForm = document.getElementById("budgetForm");
      const settingsForm = document.getElementById("settingsForm");
      const planSettingsForm = document.getElementById("planSettingsForm");
      const safeSpendForm = document.getElementById("safeSpendForm");
      const paycheckForm = document.getElementById("paycheckForm");
      const monthlyReviewForm = document.getElementById("monthlyReviewForm");
      const securityForm = document.getElementById("securityForm");
      const unlockForm = document.getElementById("unlockForm");
      document.getElementById("transactionTypeSelect")?.addEventListener("change", renderTransactionAccountOptions);
      accountForm.elements.accountType.addEventListener("input", toggleCreditCardFields);
      accountForm.addEventListener("reset", () => setTimeout(() => {
        accountForm.elements.editId.value = "";
        hideEditForm(accountForm);
        toggleCreditCardFields();
      }, 0));
      expenseForm.addEventListener("reset", () => setTimeout(() => {
        expenseForm.elements.editId.value = "";
        expenseForm.elements.date.value = today();
        hideEditForm(expenseForm);
      }, 0));
      incomeForm.addEventListener("reset", () => setTimeout(() => {
        incomeForm.elements.editId.value = "";
        incomeForm.elements.date.value = today();
        hideEditForm(incomeForm);
      }, 0));
      transactionFlowForm.addEventListener("reset", () => setTimeout(() => {
        transactionFlowForm.elements.date.value = today();
        hideEditForm(transactionFlowForm);
        renderTransactionAccountOptions();
      }, 0));
      plannedExpenseForm.addEventListener("reset", () => setTimeout(() => {
        plannedExpenseForm.elements.editId.value = "";
        hideEditForm(plannedExpenseForm);
      }, 0));
      goalForm.addEventListener("reset", () => setTimeout(() => {
        goalForm.elements.editId.value = "";
        hideEditForm(goalForm);
      }, 0));
      budgetForm.elements.month.value = currentMonth();
      budgetForm.addEventListener("reset", () => setTimeout(() => {
        budgetForm.elements.editId.value = "";
        budgetForm.elements.month.value = currentMonth();
      }, 0));
      paycheckForm.elements.expectedDate.value = today(14);
      paycheckForm.addEventListener("reset", () => setTimeout(() => {
        paycheckForm.elements.editId.value = "";
        paycheckForm.elements.expectedDate.value = today(14);
      }, 0));

      document.getElementById("accountForm").addEventListener("submit", (event) => {
        const data = formData(event);
        const accountType = data.accountType.trim() || "Other";
        const isCard = isCreditCardType(accountType);
        const account = {
          id: data.editId || id(),
          name: data.name.trim() || accountType,
          accountType,
          status: isCard ? "liability" : data.status || "asset",
          balance: Number(data.balance || 0),
          creditLimit: isCard ? Number(data.creditLimit || 0) : 0,
          dueDate: isCard ? data.dueDate : "",
          minPayment: isCard ? Number(data.minPayment || 0) : 0,
          statementBalance: isCard ? Number(data.statementBalance || 0) : 0,
          apr: isCard ? Number(data.apr || 0) : 0
        };
        upsert("accounts", account);
        event.target.reset();
        hideEditForm(event.target);
        event.target.elements.editId.value = "";
        toggleCreditCardFields();
        render();
      });

      transactionFlowForm.addEventListener("submit", (event) => {
        const data = formData(event);
        const now = new Date().toISOString();
        const type = data.type || "expense";
        const baseEntry = {
          id: id(),
          date: data.date || today(),
          name: String(data.name || "").trim() || (type === "income" ? "Income" : "Expense"),
          frequency: "one-time",
          amount: Number(data.amount || 0),
          accountId: data.accountId || "",
          notes: data.notes || "",
          accountApplied: Boolean(data.accountId),
          createdAt: now,
          updatedAt: now
        };
        if (type === "income") {
          applyIncomeImpact(baseEntry, 1);
          upsert("incomeSources", baseEntry);
        } else {
          applyExpenseImpact(baseEntry, 1);
          upsert("expenses", baseEntry);
        }
        event.target.reset();
        hideEditForm(event.target);
        event.target.elements.date.value = today();
        renderTransactionAccountOptions();
        render();
        showView("transactions");
      });

      incomeForm.addEventListener("submit", (event) => {
        const data = formData(event);
        const editingId = String(event.target.elements.editId.value || "").trim();
        const oldIncome = state.incomeSources.find((item) => item.id === editingId);
        const now = new Date().toISOString();
        const income = {
          id: editingId || id(),
          date: data.date || today(),
          name: data.name.trim() || "Income",
          frequency: data.frequency || "one-time",
          amount: Number(data.amount || 0),
          accountId: data.accountId || "",
          notes: data.notes || "",
          accountApplied: Boolean(data.accountId),
          createdAt: oldIncome?.createdAt || now,
          updatedAt: now
        };
        if (oldIncome) applyIncomeImpact(oldIncome, -1);
        applyIncomeImpact(income, 1);
        upsert("incomeSources", income);
        event.target.reset();
        hideEditForm(event.target);
        event.target.elements.editId.value = "";
        event.target.elements.date.value = today();
        render();
      });

      expenseForm.addEventListener("submit", (event) => {
        const data = formData(event);
        const editingId = String(event.target.elements.editId.value || "").trim();
        const oldExpense = state.expenses.find((item) => item.id === editingId);
        const now = new Date().toISOString();
        const expense = {
          id: editingId || id(),
          date: data.date || today(),
          name: data.name.trim() || "Expense",
          frequency: data.frequency || "one-time",
          amount: Number(data.amount || 0),
          accountId: data.accountId || "",
          notes: data.notes || "",
          accountApplied: Boolean(data.accountId),
          createdAt: oldExpense?.createdAt || now,
          updatedAt: now
        };
        if (oldExpense) applyExpenseImpact(oldExpense, -1);
        applyExpenseImpact(expense, 1);
        upsert("expenses", expense);
        event.target.reset();
        hideEditForm(event.target);
        event.target.elements.editId.value = "";
        event.target.elements.date.value = today();
        render();
      });

      plannedExpenseForm.addEventListener("submit", (event) => {
        const data = formData(event);
        const editingId = String(event.target.elements.editId.value || "").trim();
        const oldPlannedExpense = state.plannedExpenses.find((item) => item.id === editingId);
        const now = new Date().toISOString();
        upsert("plannedExpenses", {
          id: editingId || id(),
          name: String(data.name || "").trim() || "Planned expense",
          category: String(data.category || "").trim() || "Planned",
          total: Number(data.total || 0),
          dueDate: data.dueDate || "",
          saved: Number(data.saved || 0),
          accountId: data.accountId || "",
          createdAt: oldPlannedExpense?.createdAt || now,
          updatedAt: now
        });
        event.target.reset();
        hideEditForm(event.target);
        event.target.elements.editId.value = "";
        renderGoalsPage();
        renderDashboard();
        saveState();
        showView("planned");
      });

      goalForm.addEventListener("submit", (event) => {
        const data = formData(event);
        const editingId = String(event.target.elements.editId.value || "").trim();
        const oldGoal = state.goals.find((item) => item.id === editingId);
        const now = new Date().toISOString();
        upsert("goals", {
          id: editingId || id(),
          name: String(data.name || "").trim() || "Goal",
          current: Number(data.current || 0),
          target: Number(data.target || 0),
          targetDate: data.targetDate || "",
          accountId: data.accountId || "",
          createdAt: oldGoal?.createdAt || now,
          updatedAt: now
        });
        event.target.reset();
        hideEditForm(event.target);
        event.target.elements.editId.value = "";
        renderGoalsPage();
        renderDashboard();
        saveState();
        showView("planned");
      });

      budgetForm.addEventListener("submit", (event) => {
        const data = formData(event);
        const editingId = String(event.target.elements.editId.value || "").trim();
        const oldBudget = state.budgets.find((item) => item.id === editingId);
        const now = new Date().toISOString();
        upsert("budgets", {
          id: editingId || id(),
          month: data.month || currentMonth(),
          category: String(data.category || "").trim() || "Other",
          limit: Number(data.limit || 0),
          classification: data.classification || "flexible",
          rollover: false,
          createdAt: oldBudget?.createdAt || now,
          updatedAt: now
        });
        event.target.reset();
        event.target.elements.month.value = currentMonth();
        event.target.elements.editId.value = "";
        render();
        showView("budget");
      });

      settingsForm.addEventListener("submit", (event) => {
        const data = formData(event);
        state.settings = {
          ...state.settings,
          userName: String(data.userName || "").trim() || "Trey",
          currency: String(data.currency || "USD").trim().toUpperCase().slice(0, 3) || "USD",
          theme: data.theme || "system",
          privacyMode: data.privacyMode || "off"
        };
        saveState();
        render();
        showView("settings");
      });

      planSettingsForm.addEventListener("submit", (event) => {
        const data = formData(event);
        state.settings = {
          ...state.settings,
          checkingBuffer: Number(data.checkingBuffer || 500),
          emergencyMonths: Number(data.emergencyMonths || 3),
          debtStrategy: data.debtStrategy || "avalanche"
        };
        saveState();
        render();
        showView("aiPlan");
      });

      safeSpendForm.addEventListener("submit", (event) => {
        const data = formData(event);
        state.settings = {
          ...state.settings,
          safeToSpendPeriod: data.period || "week",
          checkingBuffer: Number(data.checkingBuffer || 0)
        };
        logAudit("settings", "Updated safe-to-spend settings.");
        saveState();
        render();
        showView("safeSpend");
      });

      paycheckForm.addEventListener("submit", (event) => {
        const data = formData(event);
        const editingId = String(event.target.elements.editId.value || "").trim();
        const oldPlan = state.paycheckPlans.find((item) => item.id === editingId);
        const now = new Date().toISOString();
        const allocations = [
          ["bills", "Bills", data.bills],
          ["goals", "Goals", data.goals],
          ["debt", "Debt/payments", data.debt],
          ["spending", "Spending", data.spending]
        ].map(([targetType, label, amount]) => ({ id: id(), targetType, label, amount: Number(amount || 0) })).filter((item) => item.amount > 0);
        upsert("paycheckPlans", {
          id: editingId || id(),
          name: String(data.name || "").trim() || "Paycheck plan",
          expectedDate: data.expectedDate || today(14),
          incomeSourceId: data.incomeSourceId || "",
          expectedAmount: Number(data.expectedAmount || 0),
          allocations,
          appliedTransactionId: oldPlan?.appliedTransactionId || "",
          createdAt: oldPlan?.createdAt || now,
          updatedAt: now
        });
        logAudit("paycheck", `${editingId ? "Updated" : "Created"} paycheck plan.`);
        event.target.reset();
        render();
        showView("paycheck");
      });

      monthlyReviewForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const review = activeMonthlyReview();
        review.completedSteps = [...monthlyReviewForm.querySelectorAll('input[name="step"]:checked')].map((input) => Number(input.value));
        review.reflection = monthlyReviewForm.elements.reflection?.value || "";
        review.summary = monthlyReviewSummaryText(review);
        review.updatedAt = new Date().toISOString();
        logAudit("review", `Updated monthly review for ${review.month}.`);
        saveState();
        render();
        showView("review");
      });

      securityForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await setPinLock(securityForm.elements.pin.value, securityForm.elements.autoLockMinutes.value);
          securityForm.elements.pin.value = "";
          setText("securityStatus", "PIN lock saved.");
        } catch (error) {
          setText("securityStatus", error.message);
        }
      });

      document.getElementById("lockNowButton")?.addEventListener("click", () => {
        if (!state.settings.lockEnabled) {
          setText("securityStatus", "Save a PIN before locking the app.");
          return;
        }
        setLocked(true);
      });

      document.getElementById("disablePinButton")?.addEventListener("click", () => {
        state.settings.lockEnabled = false;
        state.settings.pinHash = "";
        state.settings.pinSalt = "";
        logAudit("security", "Disabled local PIN lock.");
        saveState();
        render();
        setLocked(false);
      });

      unlockForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const ok = await verifyPin(unlockForm.elements.pin.value);
        if (ok) {
          unlockForm.elements.pin.value = "";
          setText("unlockStatus", "");
          setLocked(false);
        } else {
          setText("unlockStatus", "That PIN did not match.");
        }
      });
    }

    function bindNavigation() {
      document.querySelectorAll("[data-view]").forEach((button) => {
        button.addEventListener("click", () => showView(button.dataset.view));
      });

      document.querySelectorAll("[data-view-link]").forEach((button) => {
        button.addEventListener("click", () => showView(button.dataset.viewLink));
      });

      document.querySelectorAll("[data-guided-flow]").forEach((button) => {
        button.addEventListener("click", () => openGuidedFlow(button.dataset.guidedFlow));
      });

      document.getElementById("quickAddButton")?.addEventListener("click", () => toggleQuickAdd());
      document.getElementById("quickAddMenu")?.addEventListener("click", (event) => {
        const flowButton = event.target.closest("[data-guided-flow]");
        if (!flowButton) return;
        toggleQuickAdd(false);
        openGuidedFlow(flowButton.dataset.guidedFlow);
      });
      document.getElementById("transactionSearch")?.addEventListener("input", renderTransactionsPage);
      document.getElementById("transactionTypeFilter")?.addEventListener("change", renderTransactionsPage);
      document.getElementById("exportCsvButton")?.addEventListener("click", exportTransactionsCsv);
      document.getElementById("repairDataQualityButton")?.addEventListener("click", repairSafeDataQualityIssues);

      document.getElementById("guidedCloseButton").addEventListener("click", closeGuidedFlow);
      document.getElementById("guidedSheetBackdrop").addEventListener("click", (event) => {
        if (event.target.id === "guidedSheetBackdrop") closeGuidedFlow();
      });

      document.addEventListener("click", (event) => {
        const editButton = event.target.closest("[data-edit]");
        if (editButton) {
          event.preventDefault();
          event.stopPropagation();
          editEntry(editButton.dataset.edit, editButton.dataset.id);
          return;
        }
        const button = event.target.closest("[data-remove]");
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        removeEntry(button.dataset.remove, button.dataset.id);
        render();
      });
    }

    function removeEntry(collection, entryId) {
      const item = state[collection]?.find((entry) => entry.id === entryId);
      if (!item) return;
      if (collection === "incomeSources") applyIncomeImpact(item, -1);
      if (collection === "expenses") applyExpenseImpact(item, -1);
      if (collection === "transactions" && item.type === "transfer") applyTransferImpact(item, -1);
      state[collection] = state[collection].filter((entry) => entry.id !== entryId);
      logAudit("delete", `Deleted ${collection} entry.`, { reversible: true, relatedType: collection, relatedId: entryId });
      saveState();
    }

    function upsert(collection, item) {
      const index = state[collection].findIndex((entry) => entry.id === item.id);
      if (index >= 0) state[collection][index] = item;
      else state[collection].push(item);
      saveState();
    }

    function logAudit(type, summary, options = {}) {
      if (!state?.auditLog) return;
      state.auditLog.push(normalizeAuditEvent({
        type,
        summary,
        reversible: Boolean(options.reversible),
        relatedType: options.relatedType || "",
        relatedId: options.relatedId || ""
      }));
      state.auditLog = state.auditLog.slice(-200);
    }

    function applyExpenseImpact(expense, direction) {
      if (!expense.accountApplied || !expense.accountId) return;
      const account = state.accounts.find((item) => item.id === expense.accountId);
      if (!account) return;
      const amount = Number(expense.amount || 0) * direction;
      if (isCreditCard(account)) account.balance += amount;
      else if (account.status === "asset") account.balance -= amount;
    }

    function applyIncomeImpact(income, direction) {
      if (!income.accountApplied || !income.accountId) return;
      const account = state.accounts.find((item) => item.id === income.accountId);
      if (!account || account.status !== "asset") return;
      account.balance += Number(income.amount || 0) * direction;
    }

    function applyTransferImpact(transfer, direction) {
      const amount = Number(transfer.amount || 0) * direction;
      const from = state.accounts.find((account) => account.id === transfer.accountId);
      const to = state.accounts.find((account) => account.id === transfer.toAccountId || account.id === transfer.destinationAccountId);
      if (from?.status === "asset") from.balance -= amount;
      if (to) {
        if (isCreditCard(to) || to.status === "liability") to.balance = Math.max(Number(to.balance || 0) - amount, 0);
        else to.balance += amount;
      }
    }

    function editEntry(collection, entryId) {
      const item = state[collection].find((entry) => entry.id === entryId);
      if (!item) return;
      const formMap = {
        accounts: "accountForm",
        incomeSources: "incomeForm",
        expenses: "expenseForm",
        plannedExpenses: "plannedExpenseForm",
        goals: "goalForm",
        budgets: "budgetForm",
        paycheckPlans: "paycheckForm"
      };
      const viewMap = {
        accounts: "accounts",
        incomeSources: "income",
        expenses: "expenses",
        plannedExpenses: "planned",
        goals: "planned",
        budgets: "budget",
        paycheckPlans: "paycheck"
      };
      showView(viewMap[collection]);
      fillForm(document.getElementById(formMap[collection]), item);
    }

    function fillForm(form, item) {
      form.classList.remove("legacy-form");
      form.closest(".panel-body")?.querySelector(".guided-card")?.classList.add("hidden");
      Object.entries(item).forEach(([key, value]) => {
        const field = form.elements[key];
        if (field) field.value = value ?? "";
      });
      form.elements.editId.value = item.id;
      if (form.id === "accountForm") {
        toggleCreditCardFields();
      }
      if (form.id === "paycheckForm") {
        const allocationMap = Object.fromEntries(ensureArray(item.allocations).map((allocation) => [allocation.targetType, allocation.amount]));
        ["bills", "goals", "debt", "spending"].forEach((key) => {
          if (form.elements[key]) form.elements[key].value = allocationMap[key] || "";
        });
      }
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function toggleQuickAdd(force) {
      const menu = document.getElementById("quickAddMenu");
      const button = document.getElementById("quickAddButton");
      if (!menu || !button) return;
      const active = typeof force === "boolean" ? force : !menu.classList.contains("active");
      menu.classList.toggle("active", active);
      button.classList.toggle("active", active);
      menu.setAttribute("aria-hidden", String(!active));
    }

    function hideEditForm(form) {
      form.classList.add("legacy-form");
      form.closest(".panel-body")?.querySelector(".guided-card")?.classList.remove("hidden");
    }

    function toggleCreditCardFields() {
      const form = document.getElementById("accountForm");
      const isCard = isCreditCardType(form.elements.accountType.value);
      form.querySelectorAll(".credit-card-field").forEach((field) => field.classList.toggle("hidden", !isCard));
      if (isCard) form.elements.status.value = "liability";
      form.elements.status.disabled = isCard;
    }

    function showView(viewName) {
      if (!views[viewName]) viewName = "dashboard";
      Object.entries(views).forEach(([name, element]) => {
        if (element) element.classList.toggle("active", name === viewName);
      });
      const moreViews = new Set(["accounts", "income", "expenses", "savings", "aiPlan", "data", "recurring", "reports", "settings", "networth", "safeSpend", "paycheck", "calendar", "review", "trust", "sync"]);
      document.querySelectorAll("[data-view]").forEach((button) => {
        const isActive = button.dataset.view === viewName || (button.dataset.view === "more" && moreViews.has(viewName));
        button.classList.toggle("active", isActive);
      });
      if (viewName === "planned") renderGoalsPage();
      if (viewName === "data") renderStorageTools(true);
      if (location.hash.slice(1) !== viewName) history.replaceState(null, "", `#${viewName}`);
    }

    function exportTransactionsCsv() {
      const rows = [["Date", "Type", "Name", "Amount", "Account", "Notes"]];
      filteredTransactions().forEach((item) => {
        const account = state.accounts.find((entry) => entry.id === item.accountId);
        rows.push([item.date || "", item.type || "", item.label || item.category || "", String(item.amount || 0), account?.name || "", item.notes || ""]);
      });
      const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ledgerly-transactions-${today()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function csvCell(value) {
      return `"${String(value ?? "").replace(/"/g, '""')}"`;
    }

    function repairSafeDataQualityIssues() {
      const issues = dataQualityIssues().filter((issue) => issue.fixable && issue.collection && issue.field);
      if (!issues.length) {
        setStorageStatus("No safe automatic repairs are available.");
        return;
      }
      const backupKey = createStorageBackup("pre-data-quality-repair");
      if (!backupKey) {
        setStorageStatus("Repair stopped because a backup could not be created.");
        return;
      }
      let repaired = 0;
      issues.forEach((issue) => {
        const item = state[issue.collection]?.find((entry) => entry.id === issue.entryId);
        if (item) {
          item[issue.field] = "";
          item.updatedAt = new Date().toISOString();
          repaired += 1;
        }
      });
      logAudit("repair", `Repaired ${repaired} safe data quality issue${repaired === 1 ? "" : "s"}.`, { reversible: true });
      saveState();
      render();
      showView("trust");
      setStorageStatus(`Repaired ${repaired} issue${repaired === 1 ? "" : "s"}. Backup: ${backupKey}`);
    }

    function formData(event) {
      event.preventDefault();
      return Object.fromEntries(new FormData(event.target).entries());
    }

    function setText(idValue, text) {
      document.getElementById(idValue).textContent = text;
    }

    function empty(message) {
      return `<div class="empty">${message}</div>`;
    }

    function titleCase(value) {
      return String(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    function scheduleLabel(value) {
      return {
        weekly: "Weekly",
        biweekly: "Every 2 weeks",
        semimonthly: "Twice monthly",
        monthly: "Monthly",
        quarterly: "Quarterly",
        yearly: "Yearly",
        "one-time": "One-time"
      }[value] || titleCase(value);
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]);
    }

    function registerServiceWorker() {
      if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch((error) => {
          console.warn("Ledgerly service worker was not registered.", error);
        });
      });
    }

    let deferredInstallPrompt = null;
    window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstallPrompt = event; document.body.classList.add("can-install"); });
    function promptInstall() { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; document.body.classList.remove("can-install"); }); }
    const extensionPoints = {
      getFinancialSnapshot: calculations,
      getRuleBasedRecommendations: () => calculations().recommendations,
      getAllocationPlan: allocationPlan
    };

    document.querySelector('#incomeForm [name="date"]').value = today();
    document.querySelector('#expenseForm [name="date"]').value = today();
    document.querySelector('#transactionFlowForm [name="date"]').value = today();
    bindNavigation();
    bindForms();
    bindStorageTools();
    registerServiceWorker();
    render();
    if (location.hash) showView(location.hash.slice(1));
    renderStorageTools();
    setInterval(updateClock, 30000);
    initializeDurableStorage();
    initializeSecurityLock();
    window.addEventListener("pagehide", () => {
      state.settings.lastVisitAt = sessionStartedAt;
      saveState();
    });
    window.addEventListener("beforeunload", () => {
      state.settings.lastVisitAt = sessionStartedAt;
      saveState();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        state.settings.lastVisitAt = sessionStartedAt;
        saveState();
      }
    });
  
window.addEventListener("ledgerly-install-request", promptInstall);
