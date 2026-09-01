    /*
      SMART LEDGER V2

      DSA:
      1. Map       -> Monthly ledger / category totals
      2. Stack     -> Undo actions
      3. Array     -> Transactions
      4. Search    -> Array.filter()
      5. Sort      -> Array.sort()

      Storage:
      localStorage -> Data persistence
    */

    const STORAGE_KEY = "smartLedgerV2";

    // -----------------------------
    // MonthData
    // -----------------------------
    class MonthData {
      constructor() {
        this.transactions = [];
        this.totalIncome = 0;
        this.totalExpense = 0;
        this.categoryTotals = {};
        this.budget = 0;
      }
    }

    // -----------------------------
    // Finance Engine
    // -----------------------------
    class FinanceEngine {
      constructor() {
        this.monthlyLedgers = new Map();
        this.undoStack = [];
        this.currentDate = new Date();
        this.loadData();
        this.initializeMonth(this.getMonthKey(this.currentDate));
      }

      getMonthKey(dateObj) {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      }

      getMonthLabel(dateObj) {
        return dateObj.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric"
        });
      }

      initializeMonth(key) {
        if (!this.monthlyLedgers.has(key)) {
          this.monthlyLedgers.set(key, new MonthData());
        }
      }

      getCurrentData() {
        const key = this.getMonthKey(this.currentDate);
        this.initializeMonth(key);
        return this.monthlyLedgers.get(key);
      }

      addTransaction(desc, amount, type, category, date) {
        const key = this.getMonthKey(this.currentDate);
        const ledger = this.getCurrentData();

        const tx = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          desc: desc.trim(),
          amount: Number(amount),
          type,
          category,
          date,
          monthKey: key
        };

        ledger.transactions.unshift(tx);
        this.recalculateLedger(ledger);

        this.undoStack.push({
          action: "ADD",
          monthKey: key,
          data: tx
        });

        this.saveData();
        return tx;
      }

      updateTransaction(id, updates) {
        const ledger = this.getCurrentData();
        const index = ledger.transactions.findIndex(tx => tx.id === id);

        if (index === -1) return false;

        const oldTransaction = { ...ledger.transactions[index] };

        ledger.transactions[index] = {
          ...ledger.transactions[index],
          ...updates,
          amount: Number(updates.amount)
        };

        this.recalculateLedger(ledger);

        this.undoStack.push({
          action: "UPDATE",
          monthKey: ledger.transactions[index].monthKey,
          oldData: oldTransaction,
          newData: { ...ledger.transactions[index] }
        });

        this.saveData();
        return true;
      }

      deleteTransaction(id) {
        const ledger = this.getCurrentData();
        const index = ledger.transactions.findIndex(tx => tx.id === id);

        if (index === -1) return false;

        const deleted = { ...ledger.transactions[index] };

        ledger.transactions.splice(index, 1);
        this.recalculateLedger(ledger);

        this.undoStack.push({
          action: "DELETE",
          monthKey: ledger.transactions[0]?.monthKey || this.getMonthKey(this.currentDate),
          data: deleted
        });

        this.saveData();
        return true;
      }

      undoLast() {
        if (this.undoStack.length === 0) return null;

        const last = this.undoStack.pop();

        if (last.action === "ADD") {
          const ledger = this.monthlyLedgers.get(last.monthKey);

          if (ledger) {
            ledger.transactions = ledger.transactions.filter(
              tx => tx.id !== last.data.id
            );
            this.recalculateLedger(ledger);
          }
        }

        if (last.action === "DELETE") {
          const ledger = this.monthlyLedgers.get(last.data.monthKey);

          if (ledger) {
            ledger.transactions.push(last.data);
            this.recalculateLedger(ledger);
          }
        }

        if (last.action === "UPDATE") {
          const ledger = this.monthlyLedgers.get(last.oldData.monthKey);

          if (ledger) {
            const index = ledger.transactions.findIndex(
              tx => tx.id === last.oldData.id
            );

            if (index !== -1) {
              ledger.transactions[index] = last.oldData;
              this.recalculateLedger(ledger);
            }
          }
        }

        this.saveData();
        return last;
      }

      setBudget(amount) {
        const ledger = this.getCurrentData();
        ledger.budget = Number(amount);
        this.saveData();
      }

      recalculateLedger(ledger) {
        ledger.totalIncome = 0;
        ledger.totalExpense = 0;
        ledger.categoryTotals = {};

        for (const tx of ledger.transactions) {
          if (tx.type === "income") {
            ledger.totalIncome += Number(tx.amount);
          } else {
            ledger.totalExpense += Number(tx.amount);

            ledger.categoryTotals[tx.category] =
              (ledger.categoryTotals[tx.category] || 0) +
              Number(tx.amount);
          }
        }
      }

      changeMonth(offset) {
        this.currentDate.setDate(1);
        this.currentDate.setMonth(
          this.currentDate.getMonth() + offset
        );

        this.initializeMonth(this.getMonthKey(this.currentDate));
      }

      getFilteredTransactions(searchText, typeFilter, categoryFilter) {
        const transactions = this.getCurrentData().transactions;
        const search = searchText.trim().toLowerCase();

        return transactions.filter(tx => {
          const matchesSearch =
            !search ||
            tx.desc.toLowerCase().includes(search) ||
            tx.category.toLowerCase().includes(search);

          const matchesType =
            typeFilter === "all" || tx.type === typeFilter;

          const matchesCategory =
            categoryFilter === "all" ||
            tx.category === categoryFilter;

          return matchesSearch && matchesType && matchesCategory;
        });
      }

      saveData() {
        const serialized = {};

        for (const [key, value] of this.monthlyLedgers.entries()) {
          serialized[key] = value;
        }

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(serialized)
        );
      }

      loadData() {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);

          if (!saved) return;

          const parsed = JSON.parse(saved);

          Object.entries(parsed).forEach(([key, raw]) => {
            const month = new MonthData();

            month.transactions = Array.isArray(raw.transactions)
              ? raw.transactions
              : [];

            month.totalIncome = Number(raw.totalIncome) || 0;
            month.totalExpense = Number(raw.totalExpense) || 0;
            month.categoryTotals = raw.categoryTotals || {};
            month.budget = Number(raw.budget) || 0;

            this.monthlyLedgers.set(key, month);
          });
        } catch (error) {
          console.error("Could not load saved data:", error);
        }
      }
    }

    // -----------------------------
    // UI Controller
    // -----------------------------
    const engine = new FinanceEngine();

    const form = document.getElementById("tx-form");
    const typeSelect = document.getElementById("type");
    const categorySelect = document.getElementById("category");
    const dateInput = document.getElementById("date");

    const incomeCats = document.getElementById("income-cats");
    const expenseCats = document.getElementById("expense-cats");

    const undoBtn = document.getElementById("undo-btn");
    const monthDisplay = document.getElementById("current-month-display");
    const formMonthLabel = document.getElementById("form-month-label");

    const btnPrev = document.getElementById("btn-prev-month");
    const btnNext = document.getElementById("btn-next-month");

    const searchInput = document.getElementById("search-input");
    const typeFilter = document.getElementById("type-filter");
    const categoryFilter = document.getElementById("category-filter");

    const budgetInput = document.getElementById("budget-input");
    const saveBudgetBtn = document.getElementById("save-budget-btn");

    const submitBtn = document.getElementById("submit-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const formTitle = document.getElementById("form-title");

    let editingTransactionId = null;

    function todayISO() {
      return new Date().toISOString().split("T")[0];
    }

    function formatCurrency(value) {
      return `₹${Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 2
      })}`;
    }

    function formatDate(dateString) {
      const date = new Date(`${dateString}T00:00:00`);

      if (Number.isNaN(date.getTime())) {
        return dateString;
      }

      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }

    function showToast(message, type = "success") {
      const container = document.getElementById("toast-container");
      const toast = document.createElement("div");

      toast.className = `toast ${type}`;
      toast.textContent = message;

      container.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 2500);
    }

    // -----------------------------
    // Category Toggle
    // -----------------------------
    typeSelect.addEventListener("change", () => {
      if (typeSelect.value === "income") {
        incomeCats.style.display = "block";
        expenseCats.style.display = "none";
        categorySelect.value = "Salary";
      } else {
        incomeCats.style.display = "none";
        expenseCats.style.display = "block";
        categorySelect.value = "Housing";
      }
    });

    // -----------------------------
    // Form
    // -----------------------------
    form.addEventListener("submit", event => {
      event.preventDefault();

      const desc = document.getElementById("desc").value.trim();
      const amount = Number(document.getElementById("amount").value);
      const type = typeSelect.value;
      const category = categorySelect.value;
      const date = dateInput.value;

      if (!desc) {
        showToast("Description is required.", "error");
        return;
      }

      if (!amount || amount <= 0) {
        showToast("Amount must be greater than ₹0.", "error");
        return;
      }

      if (!date) {
        showToast("Please select a date.", "error");
        return;
      }

      const selectedMonth = date.slice(0, 7);
      const currentMonth = engine.getMonthKey(engine.currentDate);

      if (selectedMonth !== currentMonth) {
        showToast(
          `Date must belong to ${engine.getMonthLabel(engine.currentDate)}.`,
          "error"
        );
        return;
      }

      if (editingTransactionId) {
        engine.updateTransaction(editingTransactionId, {
          desc,
          amount,
          type,
          category,
          date
        });

        showToast("Transaction updated successfully.");
      } else {
        engine.addTransaction(
          desc,
          amount,
          type,
          category,
          date
        );

        showToast("Transaction added successfully.");
      }

      resetForm();
      updateUI();
    });

    function resetForm() {
      editingTransactionId = null;
      form.reset();

      typeSelect.value = "income";
      incomeCats.style.display = "block";
      expenseCats.style.display = "none";
      categorySelect.value = "Salary";
      dateInput.value = todayISO();

      submitBtn.textContent = "Add Transaction";
      cancelEditBtn.style.display = "none";

      formTitle.innerHTML =
        `Add Transaction for <span id="form-month-label" style="color:var(--primary);"></span>`;

      // Reconnect reference after innerHTML replacement.
      document.getElementById("form-month-label").textContent =
        engine.getMonthLabel(engine.currentDate);
    }

    cancelEditBtn.addEventListener("click", () => {
      resetForm();
      showToast("Edit cancelled.");
    });

    // -----------------------------
    // Edit Transaction
    // -----------------------------
    function startEdit(id) {
      const ledger = engine.getCurrentData();
      const tx = ledger.transactions.find(item => item.id === id);

      if (!tx) return;

      editingTransactionId = id;

      typeSelect.value = tx.type;
      typeSelect.dispatchEvent(new Event("change"));

      categorySelect.value = tx.category;
      document.getElementById("desc").value = tx.desc;
      document.getElementById("amount").value = tx.amount;
      dateInput.value = tx.date;

      submitBtn.textContent = "Update Transaction";
      cancelEditBtn.style.display = "block";

      document.getElementById("form-title").firstChild.textContent =
        "Edit Transaction for ";

      document.getElementById("form-month-label").textContent =
        engine.getMonthLabel(engine.currentDate);

      document.querySelector(".card").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    // -----------------------------
    // Delete Transaction
    // -----------------------------
    function deleteTransaction(id) {
      const ledger = engine.getCurrentData();
      const tx = ledger.transactions.find(item => item.id === id);

      if (!tx) return;

      const confirmed = confirm(
        `Delete "${tx.desc}" (${formatCurrency(tx.amount)})?`
      );

      if (!confirmed) return;

      engine.deleteTransaction(id);

      if (editingTransactionId === id) {
        resetForm();
      }

      updateUI();
      showToast("Transaction deleted. You can undo this action.");
    }

    // -----------------------------
    // Undo
    // -----------------------------
    undoBtn.addEventListener("click", () => {
      const action = engine.undoLast();

      if (!action) return;

      if (editingTransactionId) {
        resetForm();
      }

      updateUI();

      const names = {
        ADD: "Added transaction undone.",
        DELETE: "Deleted transaction restored.",
        UPDATE: "Transaction update undone."
      };

      showToast(names[action.action] || "Last action undone.");
    });

    // -----------------------------
    // Month Navigation
    // -----------------------------
    btnPrev.addEventListener("click", () => {
      engine.changeMonth(-1);
      resetForm();
      clearFilters();
      updateUI();
    });

    btnNext.addEventListener("click", () => {
      engine.changeMonth(1);
      resetForm();
      clearFilters();
      updateUI();
    });

    // -----------------------------
    // Budget
    // -----------------------------
    saveBudgetBtn.addEventListener("click", () => {
      const amount = Number(budgetInput.value);

      if (!amount || amount <= 0) {
        showToast("Enter a valid budget greater than ₹0.", "error");
        return;
      }

      engine.setBudget(amount);
      budgetInput.value = "";

      updateUI();
      showToast("Monthly budget saved.");
    });

    function updateBudgetUI(data) {
      const budget = Number(data.budget) || 0;
      const spent = Number(data.totalExpense) || 0;

      const status = document.getElementById("budget-status");
      const spentEl = document.getElementById("budget-spent");
      const remainingEl = document.getElementById("budget-remaining");
      const fill = document.getElementById("budget-progress-fill");
      const warning = document.getElementById("budget-warning");

      if (!budget) {
        status.textContent = "No budget set";
        spentEl.textContent = `Spent: ${formatCurrency(spent)}`;
        remainingEl.textContent = "Remaining: —";
        fill.style.width = "0%";
        fill.className = "budget-progress-fill";
        warning.textContent = "";
        return;
      }

      const percentage = (spent / budget) * 100;
      const width = Math.min(percentage, 100);

      fill.style.width = `${width}%`;

      if (percentage >= 100) {
        fill.className = "budget-progress-fill danger";
      } else if (percentage >= 80) {
        fill.className = "budget-progress-fill warning";
      } else {
        fill.className = "budget-progress-fill";
      }

      status.textContent =
        `${percentage.toFixed(1)}% used`;

      spentEl.textContent =
        `Spent: ${formatCurrency(spent)}`;

      const remaining = budget - spent;

      remainingEl.textContent =
        remaining >= 0
          ? `Remaining: ${formatCurrency(remaining)}`
          : `Over budget: ${formatCurrency(Math.abs(remaining))}`;

      if (spent > budget) {
        warning.textContent =
          `⚠ Budget exceeded by ${formatCurrency(spent - budget)}`;
      } else if (percentage >= 80) {
        warning.textContent =
          `⚠ You have used ${percentage.toFixed(1)}% of your budget.`;
      } else {
        warning.textContent = "";
      }
    }

    // -----------------------------
    // Search / Filters
    // -----------------------------
    [searchInput, typeFilter, categoryFilter].forEach(element => {
      element.addEventListener("input", updateTransactionList);
      element.addEventListener("change", updateTransactionList);
    });

    function clearFilters() {
      searchInput.value = "";
      typeFilter.value = "all";
      categoryFilter.value = "all";
    }

    function updateCategoryFilter(data) {
      const current = categoryFilter.value;

      const categories = [
        ...new Set(
          data.transactions.map(tx => tx.category)
        )
      ].sort();

      categoryFilter.innerHTML =
        '<option value="all">All Categories</option>';

      categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      });

      if (categories.includes(current)) {
        categoryFilter.value = current;
      }
    }

    // -----------------------------
    // Transaction Rendering
    // -----------------------------
    function updateTransactionList() {
      const data = engine.getCurrentData();
      const list = document.getElementById("transaction-list");
      const count = document.getElementById("transaction-count");

      const filtered = engine.getFilteredTransactions(
        searchInput.value,
        typeFilter.value,
        categoryFilter.value
      );

      count.textContent =
        `${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}`;

      list.innerHTML = "";

      if (filtered.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent =
          data.transactions.length === 0
            ? "No records for this month."
            : "No transactions match your search/filter.";
        list.appendChild(empty);
        return;
      }

      filtered.forEach(tx => {
        const item = document.createElement("div");
        item.className = "transaction-item";

        const info = document.createElement("div");
        info.className = "tx-info";

        const title = document.createElement("h4");
        title.textContent = tx.desc;

        const meta = document.createElement("p");
        meta.textContent =
          `${formatDate(tx.date)} • ${tx.category}`;

        info.appendChild(title);
        info.appendChild(meta);

        const right = document.createElement("div");
        right.className = "tx-right";

        const amount = document.createElement("div");
        amount.className =
          `tx-amount ${
            tx.type === "income"
              ? "text-success"
              : "text-danger"
          }`;

        amount.textContent =
          `${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)}`;

        const actions = document.createElement("div");
        actions.className = "tx-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => startEdit(tx.id));

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener(
          "click",
          () => deleteTransaction(tx.id)
        );

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        right.appendChild(amount);
        right.appendChild(actions);

        item.appendChild(info);
        item.appendChild(right);

        list.appendChild(item);
      });
    }

    // -----------------------------
    // Category Rendering
    // -----------------------------
    function updateCategoryUI(data) {
      const catList = document.getElementById("category-list");
      catList.innerHTML = "";

      const entries = Object.entries(data.categoryTotals)
        .sort((a, b) => b[1] - a[1]);

      if (entries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No expenses to analyze this month.";
        catList.appendChild(empty);
        return;
      }

      entries.forEach(([category, value]) => {
        const percentage =
          data.totalExpense > 0
            ? (value / data.totalExpense) * 100
            : 0;

        const item = document.createElement("div");
        item.className = "cat-item";

        const header = document.createElement("div");
        header.className = "cat-header";

        const name = document.createElement("span");
        name.textContent = category;

        const amount = document.createElement("span");
        amount.textContent =
          `${formatCurrency(value)} (${percentage.toFixed(1)}%)`;

        header.appendChild(name);
        header.appendChild(amount);

        const barBg = document.createElement("div");
        barBg.className = "cat-bar-bg";

        const barFill = document.createElement("div");
        barFill.className = "cat-bar-fill";
        barFill.style.width = `${percentage}%`;

        barBg.appendChild(barFill);
        item.appendChild(header);
        item.appendChild(barBg);

        catList.appendChild(item);
      });
    }

    // -----------------------------
    // Main UI Update
    // -----------------------------
    function updateUI() {
      const data = engine.getCurrentData();
      const monthLabel =
        engine.getMonthLabel(engine.currentDate);

      monthDisplay.textContent = monthLabel;

      const label = document.getElementById("form-month-label");
      if (label) {
        label.textContent = monthLabel;
      }

      document.getElementById("total-income").textContent =
        formatCurrency(data.totalIncome);

      document.getElementById("total-expense").textContent =
        formatCurrency(data.totalExpense);

      const balance =
        data.totalIncome - data.totalExpense;

      const balanceEl =
        document.getElementById("net-balance");

      balanceEl.textContent = formatCurrency(balance);
      balanceEl.className =
        balance >= 0
          ? "text-primary"
          : "text-danger";

      undoBtn.disabled =
        engine.undoStack.length === 0;

      updateBudgetUI(data);
      updateCategoryFilter(data);
      updateCategoryUI(data);
      updateTransactionList();
    }

    // -----------------------------
    // Initial Setup
    // -----------------------------
    dateInput.value = todayISO();

    // If today's date belongs to the current month, use it.
    // Otherwise use the first day of the selected month.
    const currentMonthKey =
      engine.getMonthKey(engine.currentDate);

    if (dateInput.value.slice(0, 7) !== currentMonthKey) {
      dateInput.value =
        `${currentMonthKey}-01`;
    }

    updateUI();