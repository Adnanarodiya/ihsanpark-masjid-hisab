/**
 * Core Application Logic for Ihsanpark Masjid Hisab Dashboard
 */

// Application State
const state = {
  activeTab: 'dashboard', // 'dashboard' | 'jumma' | 'lillah' | 'madresah' | 'taravih'
  data: {
    jumma: [],
    lillah: [],
    madresah: [],
    taravih: []
  },
  filters: {
    searchQuery: '',
    month: '', // '01', '02', etc.
    taravihYear: new Date().getFullYear()
  },
  connectionStatus: 'loading', // 'loading' | 'online' | 'offline' | 'mock'
  editRecordId: null,
  deleteRecordId: null,
  isLoading: false
};

// Seed mock data if localStorage is completely blank
const MOCK_SEED_DATA = {
  jumma: [
    { id: "MOCK_J_1", entry_date: "2026-06-12", amount: 8500, note: "Weekly Jumma Collection - Box A" },
    { id: "MOCK_J_2", entry_date: "2026-06-05", amount: 7200, note: "Weekly Jumma Collection - Box B" },
    { id: "MOCK_J_3", entry_date: "2026-05-29", amount: 9100, note: "Weekly Jumma Collection - Main Hall" },
    { id: "MOCK_J_4", entry_date: "2026-05-22", amount: 6800, note: "Weekly Jumma Collection - Box A" }
  ],
  lillah: [
    { id: "MOCK_L_1", entry_date: "2026-06-10", amount: 3500, note: "General Peti Chanda" },
    { id: "MOCK_L_2", entry_date: "2026-06-02", amount: 4200, note: "Anonymous Donation for Masjid Fan repair" },
    { id: "MOCK_L_3", entry_date: "2026-05-15", amount: 15000, note: "Sadaqah/Lillah online transfer" }
  ],
  madresah: [
    { id: "MOCK_M_1", entry_date: "2026-06-01", amount: 12000, note: "Monthly Tuition Fees (June 2026)" },
    { id: "MOCK_M_2", entry_date: "2026-05-01", amount: 11500, note: "Monthly Tuition Fees (May 2026)" },
    { id: "MOCK_M_3", entry_date: "2026-04-01", amount: 12500, note: "Monthly Tuition Fees (April 2026)" }
  ],
  taravih: [
    { id: "MOCK_T_1", year: 2026, donation_date: "2026-03-20", entry_type: "income", house_no: "B-12", donor_name: "Adnan Memon", amount: 2000, note: "Taravih donation" },
    { id: "MOCK_T_2", year: 2026, donation_date: "2026-03-21", entry_type: "income", house_no: "A-5", donor_name: "Siddique Sheikh", amount: 3000, note: "Ramadan Taravih contribution" },
    { id: "MOCK_T_3", year: 2026, donation_date: "2026-04-05", entry_type: "expense", house_no: "", donor_name: "Hafiz Saheb", amount: 15000, note: "Hadiyo / Honorarium for Ramadan Taravih Completion" },
    { id: "MOCK_T_4", year: 2025, donation_date: "2025-04-02", entry_type: "income", house_no: "C-1", donor_name: "Farhan Shah", amount: 2500, note: "Taravih donation 2025" }
  ]
};

// DOM Reference Selectors
const elements = {
  // Search & Filters
  searchInput: document.getElementById('search'),
  searchClear: document.getElementById('search-clear'),
  yearFilter: document.getElementById('yearFilter'),
  
  // Lists & Banners
  resultsList: document.getElementById('results'),
  countBadge: document.getElementById('count'),
  syncStatusDashboard: document.getElementById('sync-status-dashboard'),
  syncStatusLedger: document.getElementById('sync-status-ledger'),
  syncTimeLabel: document.getElementById('sync-time-label'),
  toast: document.getElementById('toast'),
  
  // KPI Elements
  kpiGrandTotal: document.getElementById('kpi-grand-total'),
  kpiJumma: document.getElementById('kpi-jumma'),
  kpiLillah: document.getElementById('kpi-lillah'),
  kpiMadrasah: document.getElementById('kpi-madrasah'),
  kpiTaravih: document.getElementById('kpi-taravih'),
  kpiTaravihInc: document.getElementById('kpi-taravih-inc'),
  kpiTaravihExp: document.getElementById('kpi-taravih-exp'),
  
  // Analytics
  chartWrapper: document.getElementById('chart-wrapper'),
  chartLegend: document.getElementById('chart-legend'),
  
  // Modal Elements
  modalOverlay: document.getElementById('modal-overlay'),
  openModalBtn: document.getElementById('open-modal-btn'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  cancelModalBtn: document.getElementById('cancel-modal-btn'),
  memberForm: document.getElementById('member-form'),
  submitBtn: document.getElementById('submit-btn'),
  submitSpinner: document.getElementById('submit-spinner'),
  
  // Modal Fields
  formCategory: document.getElementById('form-category'),
  formDate: document.getElementById('form-date'),
  formAmount: document.getElementById('form-amount'),
  formNote: document.getElementById('form-note'),
  formTaravihFields: document.getElementById('form-taravih-fields'),
  formTaravihYear: document.getElementById('form-taravih-year'),
  formHouseNo: document.getElementById('form-house-no'),
  formDonorName: document.getElementById('form-donor-name'),
  
  // Navigation & View Panels
  panelDashboard: document.getElementById('panel-dashboard'),
  panelLedger: document.getElementById('panel-ledger'),
  ledgerTitle: document.getElementById('ledger-title'),
  ledgerCategoryBadge: document.getElementById('ledger-category-badge'),
  ledgerFilteredSum: document.getElementById('ledger-filtered-sum'),
  ledgerFilteredNet: document.getElementById('ledger-filtered-net'),
  
  // Delete Modal Elements
  deleteConfirmOverlay: document.getElementById('delete-confirm-overlay'),
  closeDeleteBtn: document.getElementById('close-delete-btn'),
  cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
  deleteAmountDisplay: document.getElementById('delete-amount-display'),
  deleteDateDisplay: document.getElementById('delete-date-display'),
  deleteNoteDisplay: document.getElementById('delete-note-display')
};

// Initial Setup
document.addEventListener("DOMContentLoaded", () => {
  initSecurityGate();
});

// Security PIN overlay validator
function initSecurityGate() {
  const isUnlocked = sessionStorage.getItem("unlocked") === "true";
  const lockScreen = document.getElementById("lock-screen");
  const appShell = document.getElementById("app-shell");

  if (isUnlocked) {
    if (lockScreen) lockScreen.style.display = "none";
    if (appShell) appShell.style.display = "flex";
    loadData();
    setupEventListeners();
  } else {
    if (lockScreen) lockScreen.style.display = "flex";
    if (appShell) appShell.style.display = "none";
    setupSecurityEventListeners();
  }
}

function setupSecurityEventListeners() {
  const digits = [
    document.getElementById("pin-1"),
    document.getElementById("pin-2"),
    document.getElementById("pin-3"),
    document.getElementById("pin-4")
  ];
  const lockForm = document.getElementById("lock-form");
  const lockContainer = document.getElementById("lock-container");
  const lockError = document.getElementById("lock-error");
  const lockScreen = document.getElementById("lock-screen");
  const appShell = document.getElementById("app-shell");

  // Focus the first field
  if (digits[0]) digits[0].focus();

  const submitPin = () => {
    const pinValue = digits.map(input => input.value).join("");
    
    if (pinValue === "7866") {
      sessionStorage.setItem("unlocked", "true");
      
      lockScreen.style.transition = "opacity 0.35s ease, transform 0.35s ease";
      lockScreen.style.opacity = "0";
      lockScreen.style.transform = "scale(1.05)";
      
      setTimeout(() => {
        lockScreen.style.display = "none";
        appShell.style.display = "flex";
        
        loadData();
        setupEventListeners();
      }, 350);
      
    } else {
      lockError.textContent = "Incorrect PIN. Access Denied.";
      lockContainer.classList.add("shake");
      
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      
      setTimeout(() => {
        lockContainer.classList.remove("shake");
      }, 400);

      digits.forEach(input => {
        if (input) input.value = "";
      });
      if (digits[0]) digits[0].focus();
    }
  };

  digits.forEach((input, index) => {
    if (!input) return;

    input.addEventListener("input", (e) => {
      const value = e.target.value;
      if (value.length > 0) {
        if (index < 3) {
          digits[index + 1].focus();
        } else {
          // Typed the 4th digit, auto-submit
          const pinValue = digits.map(inp => inp.value).join("");
          if (pinValue.length === 4) {
            submitPin();
          }
        }
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (input.value === "" && index > 0) {
          digits[index - 1].focus();
          digits[index - 1].value = "";
        } else {
          input.value = "";
        }
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData("text");
      const cleanedData = pastedData.replace(/[^0-9]/g, "").slice(0, 4);
      
      for (let i = 0; i < cleanedData.length; i++) {
        if (digits[i]) {
          digits[i].value = cleanedData[i];
        }
      }
      
      const focusIndex = Math.min(cleanedData.length, 3);
      if (digits[focusIndex]) digits[focusIndex].focus();

      const pinValue = digits.map(inp => inp.value).join("");
      if (pinValue.length === 4) {
        submitPin();
      }
    });
  });

  if (lockForm) {
    lockForm.addEventListener("submit", (e) => {
      e.preventDefault();
      submitPin();
    });
  }
}

// Setup Event Handlers
function setupEventListeners() {
  // Navigation Bar Tabs switching
  const navItems = document.querySelectorAll(".bottom-nav .nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      navItems.forEach(nav => nav.classList.remove("active"));
      btn.classList.add("active");

      const panel = btn.dataset.panel;
      const category = btn.dataset.category;

      if (panel === "dashboard") {
        state.activeTab = "dashboard";
        elements.panelDashboard.classList.add("active");
        elements.panelLedger.classList.remove("active");
        document.getElementById('header-subtitle').textContent = "Masjid Hisab";
        renderUI();
      } else {
        state.activeTab = category;
        elements.panelDashboard.classList.remove("active");
        elements.panelLedger.classList.add("active");
        document.getElementById('header-subtitle').textContent = category.charAt(0).toUpperCase() + category.slice(1) + " Ledger";
        adjustFiltersForTab();
        renderTable();
      }
    });
  });

  // Search input and clear action
  elements.searchInput.addEventListener("input", (e) => {
    state.filters.searchQuery = e.target.value;
    if (e.target.value) {
      elements.searchClear.classList.add("visible");
    } else {
      elements.searchClear.classList.remove("visible");
    }
    renderTable();
  });

  elements.searchClear.addEventListener("click", () => {
    elements.searchInput.value = "";
    state.filters.searchQuery = "";
    elements.searchClear.classList.remove("visible");
    renderTable();
  });

  elements.yearFilter.addEventListener("change", (e) => {
    state.filters.taravihYear = Number(e.target.value) || new Date().getFullYear();
    renderTable();
  });

  // Modal actions
  elements.openModalBtn.addEventListener("click", () => openModal("add"));
  elements.closeModalBtn.addEventListener("click", closeModal);
  elements.cancelModalBtn.addEventListener("click", closeModal);
  
  // Modal Backdrop Click
  elements.modalOverlay.addEventListener("click", (e) => {
    if (e.target.id === "modal-overlay") closeModal();
  });

  // Delete modal actions
  elements.closeDeleteBtn.addEventListener("click", closeDeleteModal);
  elements.cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  
  // Delete modal Backdrop Click
  elements.deleteConfirmOverlay.addEventListener("click", (e) => {
    if (e.target.id === "delete-confirm-overlay") closeDeleteModal();
  });

  // Confirm delete action
  elements.confirmDeleteBtn.addEventListener("click", () => {
    if (state.deleteRecordId) {
      performMutation('delete', state.activeTab, { id: state.deleteRecordId });
    }
  });

  // Form submission validation
  elements.memberForm.addEventListener("submit", handleFormSubmit);

  // Category select inside Modal Form
  elements.formCategory.addEventListener("change", (e) => {
    toggleTaravihFields(e.target.value);
  });

  // Taravih entry type radio buttons toggle
  const taravihTypeRadios = document.getElementsByName('entry_type');
  taravihTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      toggleHouseNoField(e.target.value);
    });
  });

  // Sync Action
  document.getElementById("refresh-btn").addEventListener("click", () => {
    loadData();
  });
  
  // Dashboard shortcuts to switch tab
  const categoryCards = document.querySelectorAll(".kpi-card.category-card");
  categoryCards.forEach(card => {
    card.addEventListener("click", () => {
      const category = card.dataset.category;
      const targetNavBtn = document.getElementById(`nav-btn-${category}`);
      if (targetNavBtn) {
        targetNavBtn.click();
      }
    });
  });

  // Setup toast dismissal events
  setupToastDismissal();
}

// Adjust filters on tab change
function adjustFiltersForTab() {
  const yearWrap = document.getElementById("year-filter-wrap");

  if (state.activeTab === "taravih") {
    if (yearWrap) yearWrap.style.display = "block";
  } else {
    if (yearWrap) yearWrap.style.display = "none";
  }

  // Reset inputs
  elements.searchInput.value = "";
  elements.searchClear.classList.remove("visible");
  state.filters.searchQuery = "";
  state.filters.month = "";

  populateYearDropdowns();
}

// Toggle Taravih custom modal inputs
function toggleTaravihFields(category) {
  const taravihFields = document.getElementById("form-taravih-fields");
  if (category === "taravih") {
    taravihFields.style.display = "flex";
    
    // Default values
    document.getElementById("type-income").checked = true;
    toggleHouseNoField("income");
  } else {
    taravihFields.style.display = "none";
  }
}

// Toggle house number field depending on type
function toggleHouseNoField(type) {
  const houseNoGroup = document.getElementById("form-house-no-group");
  const donorLabel = document.getElementById("label-donor-name");
  const nameInput = document.getElementById("form-donor-name");

  if (type === "expense") {
    houseNoGroup.style.display = "none";
    donorLabel.textContent = "Payee Name";
    nameInput.placeholder = "Enter Imam or Scholar Name";
  } else {
    houseNoGroup.style.display = "block";
    donorLabel.textContent = "Donor Name";
    nameInput.placeholder = "Enter Donor's Full Name";
  }
}

// Year dropdown populator
function populateYearDropdowns() {
  const taravihRecords = state.data.taravih || [];
  const years = new Set([new Date().getFullYear()]);
  
  taravihRecords.forEach(rec => {
    if (rec.year) years.add(Number(rec.year));
  });
  
  const sortedYears = Array.from(years).sort((a,b) => b - a);
  const filterDropdown = document.getElementById('yearFilter');
  const formDropdown = document.getElementById('form-taravih-year');
  
  if (!filterDropdown || !formDropdown) return;
  
  const selectedFilter = filterDropdown.value;
  
  filterDropdown.innerHTML = '';
  formDropdown.innerHTML = '';
  
  sortedYears.forEach(year => {
    filterDropdown.innerHTML += `<option value="${year}">${year}</option>`;
    formDropdown.innerHTML += `<option value="${year}">${year}</option>`;
  });
  
  if (sortedYears.includes(Number(selectedFilter))) {
    filterDropdown.value = selectedFilter;
    state.filters.taravihYear = Number(selectedFilter);
  } else {
    filterDropdown.value = sortedYears[0];
    state.filters.taravihYear = sortedYears[0];
  }
}

// Database Fetch operations
async function loadData(silent = false) {
  if (!silent) setLoadingState(true);
  
  if (!CONFIG.sheetUrl || CONFIG.sheetUrl.includes('YOUR_DEPLOYED_SCRIPT_ID')) {
    state.connectionStatus = 'mock';
    updateConnectionBadges();
    
    const saved = localStorage.getItem('masjid_hisab_backup');
    if (saved) {
      state.data = JSON.parse(saved);
    } else {
      state.data = JSON.parse(JSON.stringify(MOCK_SEED_DATA));
      localStorage.setItem('masjid_hisab_backup', JSON.stringify(state.data));
    }
    
    setTimeout(() => {
      if (!silent) setLoadingState(false);
      renderUI();
      if (!silent) showToast("Loaded from local mock database");
    }, 450);
    return;
  }
  
  try {
    const response = await fetch(CONFIG.sheetUrl);
    if (!response.ok) throw new Error("HTTP error " + response.status);
    
    const payload = await response.json();
    if (payload.status === "error") throw new Error(payload.message);
    
    state.data = payload;
    localStorage.setItem('masjid_hisab_backup', JSON.stringify(state.data));
    state.connectionStatus = 'online';
    if (!silent) showToast("Synced database in real-time");
  } catch (error) {
    console.error("Fetch failed, loading offline backup", error);
    state.connectionStatus = 'offline';
    
    const saved = localStorage.getItem('masjid_hisab_backup');
    if (saved) {
      state.data = JSON.parse(saved);
      if (!silent) showToast("Offline mode: loaded cached data", "error");
    } else {
      state.data = JSON.parse(JSON.stringify(MOCK_SEED_DATA));
      if (!silent) showToast("Offline mode: using default mock data", "error");
    }
  } finally {
    if (!silent) setLoadingState(false);
    updateConnectionBadges();
    populateYearDropdowns();
    renderUI();
  }
}

// Sync Connection Labels
function updateConnectionBadges() {
  const syncDashboard = document.getElementById('sync-status-dashboard');
  const syncLedger = document.getElementById('sync-status-ledger');
  const syncTime = document.getElementById('sync-time-label');
  
  let labelText = '';
  let statusClass = state.connectionStatus;
  
  if (state.connectionStatus === 'online') {
    labelText = '<i class="ti ti-cloud-check"></i> Connected';
  } else if (state.connectionStatus === 'offline') {
    labelText = '<i class="ti ti-cloud-off"></i> Offline Mode';
  } else {
    labelText = '<i class="ti ti-database"></i> Mock Mode';
  }
  
  if (syncDashboard) {
    syncDashboard.innerHTML = labelText;
    syncDashboard.className = `sync-status ${statusClass}`;
  }
  
  if (syncLedger) {
    syncLedger.innerHTML = labelText;
    syncLedger.className = `sync-status ${statusClass}`;
  }
  
  if (syncTime) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    syncTime.textContent = `Sync: ${timeStr}`;
  }
}

// Fetch Loading Indicators
function setLoadingState(isLoading) {
  state.isLoading = isLoading;
  const syncBtn = document.getElementById('refresh-btn');
  if (!syncBtn) return;
  
  if (isLoading) {
    syncBtn.disabled = true;
    syncBtn.innerHTML = `<i class="ti ti-refresh" style="display:inline-block; animation: spin 1s linear infinite;"></i>`;
  } else {
    syncBtn.disabled = false;
    syncBtn.innerHTML = `<i class="ti ti-refresh"></i>`;
  }
}

// Google Sheet / Cache Mutation calls
async function performMutation(action, category, payload) {
  setLoadingState(true);
  
  // Set loading state in buttons
  const submitBtnText = elements.submitBtn ? elements.submitBtn.querySelector('.btn-text') : null;
  const deleteBtnText = elements.confirmDeleteBtn ? elements.confirmDeleteBtn.querySelector('.btn-text') : null;
  
  if (action === 'delete') {
    if (elements.confirmDeleteBtn) {
      elements.confirmDeleteBtn.disabled = true;
      elements.confirmDeleteBtn.classList.add("loading");
      if (deleteBtnText) {
        deleteBtnText.textContent = "Deleting...";
      }
    }
  } else {
    if (elements.submitBtn) {
      elements.submitBtn.disabled = true;
      elements.submitBtn.classList.add("loading");
      if (submitBtnText) {
        submitBtnText.textContent = "Saving...";
      }
    }
  }

  // Create a 1.5s delay promise to ensure loader is visible to the user
  const minDelayPromise = new Promise(resolve => setTimeout(resolve, 1500));

  // Back up current state in case we need to roll back
  const stateBackup = JSON.stringify(state.data);
  const records = state.data[category] || [];

  let tempId = null;
  let newRecord = null;
  if (action === 'add') {
    // Generate a temporary ID
    tempId = "TEMP_" + category.substring(0, 1).toUpperCase() + "_" + new Date().getTime();
    newRecord = { id: tempId, ...payload };
    if (category === 'taravih') {
      newRecord.year = Number(newRecord.year) || new Date().getFullYear();
      newRecord.amount = Number(newRecord.amount) || 0;
    } else {
      newRecord.amount = Number(newRecord.amount) || 0;
    }
  }

  // If in mock mode, just wait for the minimum delay and apply state change
  if (state.connectionStatus === 'mock') {
    await minDelayPromise;
    
    if (action === 'add') {
      records.push(newRecord);
    } else if (action === 'edit') {
      const idToEdit = payload.id;
      const index = records.findIndex(r => r.id.toString() === idToEdit.toString());
      if (index !== -1) {
        records[index] = { ...records[index], ...payload };
        if (category === 'taravih') {
          records[index].year = Number(records[index].year);
          records[index].amount = Number(records[index].amount);
        } else {
          records[index].amount = Number(records[index].amount);
        }
      }
    } else if (action === 'delete') {
      const idToDelete = payload.id;
      const index = records.findIndex(r => r.id.toString() === idToDelete.toString());
      if (index !== -1) {
        records.splice(index, 1);
      }
    }
    
    localStorage.setItem('masjid_hisab_backup', JSON.stringify(state.data));
    if (action === 'delete') {
      closeDeleteModal();
    } else {
      closeModal();
    }
    renderUI();
    setLoadingState(false);
    
    if (elements.submitBtn) {
      elements.submitBtn.disabled = false;
      elements.submitBtn.classList.remove("loading");
      if (submitBtnText) {
        submitBtnText.textContent = state.editRecordId ? "Save Changes" : "Save Record";
      }
    }
    if (elements.confirmDeleteBtn) {
      elements.confirmDeleteBtn.disabled = false;
      elements.confirmDeleteBtn.classList.remove("loading");
      if (deleteBtnText) {
        deleteBtnText.textContent = "Confirm Delete";
      }
    }
    showToast(`Record ${action === 'delete' ? 'deleted' : action === 'add' ? 'added' : 'updated'} successfully!`);
    return;
  }

  // Real sheet mutation
  try {
    const postBody = { action, category, ...payload };
    
    // Run fetch and minimum delay in parallel
    const [response] = await Promise.all([
      fetch(CONFIG.submitUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify(postBody)
      }),
      minDelayPromise
    ]);

    if (!response.ok) throw new Error("HTTP error " + response.status);
    
    const result = await response.json();
    if (result.status === 'success') {
      // Apply the state changes locally after successful network sync
      if (action === 'add') {
        newRecord.id = result.id; // Use official ID returned by Google Sheets
        records.push(newRecord);
      } else if (action === 'edit') {
        const idToEdit = payload.id;
        const index = records.findIndex(r => r.id.toString() === idToEdit.toString());
        if (index !== -1) {
          records[index] = { ...records[index], ...payload };
          if (category === 'taravih') {
            records[index].year = Number(records[index].year);
            records[index].amount = Number(records[index].amount);
          } else {
            records[index].amount = Number(records[index].amount);
          }
        }
      } else if (action === 'delete') {
        const idToDelete = payload.id;
        const index = records.findIndex(r => r.id.toString() === idToDelete.toString());
        if (index !== -1) {
          records.splice(index, 1);
        }
      }

      localStorage.setItem('masjid_hisab_backup', JSON.stringify(state.data));
      if (action === 'delete') {
        closeDeleteModal();
      } else {
        closeModal();
      }
      renderUI();
      showToast(`Record ${action === 'delete' ? 'deleted' : action === 'add' ? 'added' : 'updated'} successfully!`);
    } else {
      throw new Error(result.message || "Mutation rejected by Google Apps Script");
    }
  } catch (error) {
    console.error("Mutation failed", error);
    showToast("Sync failed. Changes not saved.", "error");
  } finally {
    setLoadingState(false);
    if (elements.submitBtn) {
      elements.submitBtn.disabled = false;
      elements.submitBtn.classList.remove("loading");
      if (submitBtnText) {
        submitBtnText.textContent = state.editRecordId ? "Save Changes" : "Save Record";
      }
    }
    if (elements.confirmDeleteBtn) {
      elements.confirmDeleteBtn.disabled = false;
      elements.confirmDeleteBtn.classList.remove("loading");
      if (deleteBtnText) {
        deleteBtnText.textContent = "Confirm Delete";
      }
    }
  }
}

// UI Rendering orchestrator
function renderUI() {
  renderKPIs();
  renderCharts();
  if (state.activeTab !== "dashboard") {
    renderTable();
  }
}

// Animate numbers and populate KPI grids
function renderKPIs() {
  const sum = arr => arr.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  
  const jummaTotal = sum(state.data.jumma);
  const lillahTotal = sum(state.data.lillah);
  const madresahTotal = sum(state.data.madresah);
  
  // Taravih income splits
  const taravihIncome = (state.data.taravih || [])
    .filter(r => r.entry_type === 'income')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
  const taravihExpense = (state.data.taravih || [])
    .filter(r => r.entry_type === 'expense')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
  const taravihNet = taravihIncome - taravihExpense;
  const grandTotal = jummaTotal + lillahTotal + madresahTotal + taravihIncome;
  
  // Update targets
  animateValue('kpi-grand-total', grandTotal);
  animateValue('kpi-jumma', jummaTotal);
  animateValue('kpi-lillah', lillahTotal);
  animateValue('kpi-madrasah', madresahTotal);
  animateValue('kpi-taravih', taravihNet);
  
  // Update secondary captions
  document.getElementById('kpi-taravih-inc').textContent = `In: ₹${taravihIncome.toLocaleString('en-IN')}`;
  document.getElementById('kpi-taravih-exp').textContent = `Out: ₹${taravihExpense.toLocaleString('en-IN')}`;
}

// Build pie chart ratios
function renderCharts() {
  const sum = arr => arr.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  
  const jummaVal = sum(state.data.jumma);
  const lillahVal = sum(state.data.lillah);
  const madresahVal = sum(state.data.madresah);
  const taravihIncomeVal = (state.data.taravih || [])
    .filter(r => r.entry_type === 'income')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
  const total = jummaVal + lillahVal + madresahVal + taravihIncomeVal;
  
  const chartWrapper = document.getElementById('chart-wrapper');
  const legendContainer = document.getElementById('chart-legend');
  
  if (total === 0) {
    chartWrapper.innerHTML = `
      <svg viewBox="0 0 200 200">
        <circle class="chart-circle-bg" cx="100" cy="100" r="80"></circle>
      </svg>
      <div class="chart-center-text">
        <span class="chart-center-amount">₹0</span>
        <span class="chart-center-label">No Income</span>
      </div>
    `;
    legendContainer.innerHTML = `<div style="text-align:center; font-weight:600; color:var(--text-muted); font-size:0.8rem; padding:0.5rem 0;">No data available</div>`;
    return;
  }
  
  const radius = 80;
  const circumference = 2 * Math.PI * radius; // ~502.65
  
  const dataPoints = [
    { name: 'Jumma', val: jummaVal, color: 'var(--primary)', pct: jummaVal / total },
    { name: 'Lillah', val: lillahVal, color: 'var(--accent)', pct: lillahVal / total },
    { name: 'Madrasah', val: madresahVal, color: 'hsl(190, 70%, 42%)', pct: madresahVal / total },
    { name: 'Taravih Income', val: taravihIncomeVal, color: 'hsl(330, 70%, 55%)', pct: taravihIncomeVal / total }
  ];
  
  let currentOffset = 0;
  let circlesHtml = `<circle class="chart-circle-bg" cx="100" cy="100" r="80"></circle>`;
  let legendHtml = ``;
  
  dataPoints.forEach(point => {
    if (point.val === 0) return;
    
    const strokeDash = point.pct * circumference;
    const remaining = circumference - strokeDash;
    
    circlesHtml += `
      <circle class="chart-circle-val" 
              cx="100" 
              cy="100" 
              r="${radius}" 
              stroke="${point.color}" 
              stroke-dasharray="${strokeDash} ${remaining}" 
              stroke-dashoffset="-${currentOffset}">
      </circle>
    `;
    currentOffset += strokeDash;
    
    const pctString = (point.pct * 100).toFixed(1) + '%';
    legendHtml += `
      <div class="legend-item">
        <div class="legend-label-group">
          <div class="legend-color" style="background: ${point.color}"></div>
          <span class="legend-name">${point.name}</span>
        </div>
        <div class="legend-val-group">
          <span class="legend-val">₹${point.val.toLocaleString('en-IN')}</span>
          <span class="legend-pct">(${pctString})</span>
        </div>
      </div>
    `;
  });
  
  chartWrapper.innerHTML = `
    <svg viewBox="0 0 200 200">
      ${circlesHtml}
    </svg>
    <div class="chart-center-text">
      <span class="chart-center-amount" style="font-size: 1.15rem">₹${Math.round(total).toLocaleString('en-IN')}</span>
      <span class="chart-center-label">Total Income</span>
    </div>
  `;
  
  legendContainer.innerHTML = legendHtml;
}

// Compile, sort, filter and build ledger lists cards
function renderTable() {
  const category = state.activeTab;
  if (category === "dashboard") return;

  const records = state.data[category] || [];
  
  const filtered = records.filter(item => {
    const query = state.filters.searchQuery.toLowerCase().trim();
    let matchesSearch = true;
    if (query) {
      const idStr = (item.id || '').toLowerCase();
      const noteStr = (item.note || '').toLowerCase();
      const dateStr = formatReadableDate(item.entry_date || item.donation_date, item.id).toLowerCase();
      const nameStr = (item.donor_name || '').toLowerCase();
      const houseStr = (item.house_no || '').toLowerCase();
      
      matchesSearch = idStr.includes(query) || 
                      noteStr.includes(query) || 
                      dateStr.includes(query) || 
                      nameStr.includes(query) || 
                      houseStr.includes(query);
    }
    
    let matchesCategoryFilters = true;
    
    if (category === 'taravih') {
      if (state.filters.taravihYear) {
        matchesCategoryFilters = Number(item.year) === Number(state.filters.taravihYear);
      }
    }
    
    return matchesSearch && matchesCategoryFilters;
  });
  
  // Sort chronologically descending (newest dates at the top)
  filtered.sort((a, b) => {
    const dateA = parseDate(a.entry_date || a.donation_date, a.id);
    const dateB = parseDate(b.entry_date || b.donation_date, b.id);
    const timeA = dateA ? dateA.getTime() : 0;
    const timeB = dateB ? dateB.getTime() : 0;
    return timeB - timeA;
  });

  // Calculate filtered totals
  const colExpense = document.getElementById("col-filtered-expense");
  const colNet = document.getElementById("col-filtered-net");
  const labelTotal = document.getElementById("label-filtered-total");

  if (category === "taravih") {
    colExpense.style.display = "flex";
    colNet.style.display = "flex";
    labelTotal.textContent = "Filtered Income";

    const incVal = filtered.filter(r => r.entry_type === 'income').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const expVal = filtered.filter(r => r.entry_type === 'expense').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const netVal = incVal - expVal;

    elements.ledgerFilteredSum.textContent = `₹${incVal.toLocaleString('en-IN')}`;
    document.getElementById("ledger-filtered-expense").textContent = `₹${expVal.toLocaleString('en-IN')}`;
    
    const netEl = document.getElementById("ledger-filtered-net");
    netEl.textContent = `₹${netVal.toLocaleString('en-IN')}`;
    if (netVal < 0) {
      netEl.style.color = "var(--color-expense-text)";
    } else {
      netEl.style.color = "var(--color-income-text)";
    }
  } else {
    colExpense.style.display = "none";
    colNet.style.display = "none";
    labelTotal.textContent = "Filtered Total";

    const sumVal = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    elements.ledgerFilteredSum.textContent = `₹${sumVal.toLocaleString('en-IN')}`;
  }

  // Update Title text and Icon in the Banner
  const titleInfo = {
    jumma: { text: "Jumma Collections", icon: "ti-calendar-event" },
    lillah: { text: "Lillah Donations", icon: "ti-heart" },
    madresah: { text: "Madrasah Tuition", icon: "ti-school" },
    taravih: { text: "Taravih Ledger", icon: "ti-moon" }
  };
  
  elements.ledgerTitle.innerHTML = `<i class="ti ${titleInfo[category].icon}"></i> ${titleInfo[category].text}`;
  elements.ledgerCategoryBadge.textContent = category;
  
  elements.countBadge.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''} listed`;
  
  // Render cards
  elements.resultsList.innerHTML = '';
  
  if (filtered.length === 0) {
    elements.resultsList.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-mood-empty"></i>
        <h3>No records found</h3>
        <p>Try refining search query or filters.</p>
      </div>
    `;
    return;
  }
  
  filtered.forEach((row, idx) => {
    const card = document.createElement('div');
    
    if (category === 'taravih') {
      const typeClass = row.entry_type === 'expense' ? 'expense-type' : 'income-type';
      const amountClass = row.entry_type === 'expense' ? 'card-amount-val expense' : 'card-amount-val';
      const amountSign = row.entry_type === 'expense' ? '- ' : '+ ';
      const typeBadge = `<span class="card-info-badge ${row.entry_type}">${row.entry_type}</span>`;
      
      card.className = `record-card ${typeClass}`;
      card.id = `record-card-${row.id}`;
      card.innerHTML = `
        <div class="card-serial-block">${filtered.length - idx}</div>
        <div class="card-content-area">
          <div class="card-header-row">
            <span class="card-date">${formatReadableDate(row.donation_date, row.id)}</span>
            <div class="card-actions-top">
              <button class="btn-card-action edit" onclick="triggerEdit('${row.id}')" title="Edit Record">
                <i class="ti ti-edit"></i>
              </button>
              <button class="btn-card-action delete" onclick="triggerDelete('${row.id}')" title="Delete Record">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
          <div class="card-body-row">
            <span class="card-title-main">${escapeHtml(row.donor_name || 'Hadiyo Payout')}</span>
            <span class="${amountClass}">${amountSign}₹${Number(row.amount).toLocaleString('en-IN')}</span>
          </div>
          <div class="taravih-details-box">
            <div class="taravih-details-item">
              <i class="ti ti-tag"></i> ${typeBadge}
            </div>
            <div class="taravih-details-item">
              <i class="ti ti-history"></i> Year: <strong>${row.year}</strong>
            </div>
            ${row.house_no ? `
              <div class="taravih-details-item">
                <i class="ti ti-home"></i> House: <strong>${row.house_no}</strong>
              </div>
            ` : ''}
          </div>
          ${row.note ? `
            <div class="card-note-box">
              <i class="ti ti-notes"></i>
              <span>${escapeHtml(row.note)}</span>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      card.className = 'record-card';
      card.id = `record-card-${row.id}`;
      card.innerHTML = `
        <div class="card-serial-block">${filtered.length - idx}</div>
        <div class="card-content-area">
          <div class="card-header-row">
            <span class="card-date">${formatReadableDate(row.entry_date, row.id)}</span>
            <div class="card-actions-top">
              <button class="btn-card-action edit" onclick="triggerEdit('${row.id}')" title="Edit Record">
                <i class="ti ti-edit"></i>
              </button>
              <button class="btn-card-action delete" onclick="triggerDelete('${row.id}')" title="Delete Record">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
          <div class="card-body-row">
            <span class="card-title-main">${category.toUpperCase()} Collection</span>
            <span class="card-amount-val">+ ₹${Number(row.amount).toLocaleString('en-IN')}</span>
          </div>
          ${row.note ? `
            <div class="card-note-box">
              <i class="ti ti-notes"></i>
              <span>${escapeHtml(row.note)}</span>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    elements.resultsList.appendChild(card);
  });
}

// Inline trigger bindings
window.triggerEdit = function(id) {
  openModal('edit', state.activeTab, id);
};

window.triggerDelete = function(id) {
  openDeleteModal(id);
};

// Modal Operations
function openModal(mode, category = state.activeTab, recordId = null) {
  state.editRecordId = recordId;
  const modalTitle = document.getElementById('modal-title');
  const submitBtnText = elements.submitBtn.querySelector('.btn-text');

  // Reset form errors and elements
  elements.memberForm.reset();
  document.getElementById("form-date-error").textContent = "";
  document.getElementById("form-amount-error").textContent = "";

  // Set category selector value
  let targetCat = category;
  if (category === 'dashboard') {
    targetCat = 'jumma';
  }
  elements.formCategory.value = targetCat;
  toggleTaravihFields(targetCat);

  // If adding from a ledger tab, lock down the category select
  if (category !== 'dashboard') {
    elements.formCategory.disabled = true;
  } else {
    elements.formCategory.disabled = false;
  }

  // Pre-fill date to today (local YYYY-MM-DD format)
  const todayStr = new Date().toISOString().split('T')[0];
  elements.formDate.value = todayStr;

  if (mode === 'edit' && recordId) {
    modalTitle.textContent = `Edit Transaction Details`;
    submitBtnText.textContent = "Save Changes";

    const records = state.data[targetCat] || [];
    const item = records.find(r => r.id.toString() === recordId.toString());

    if (item) {
      elements.formAmount.value = item.amount;
      elements.formNote.value = item.note || '';

      if (targetCat === 'taravih') {
        elements.formDate.value = formatDateToInput(item.donation_date, item.id) || todayStr;
        document.getElementById('form-taravih-year').value = item.year || new Date().getFullYear();
        document.getElementById('form-donor-name').value = item.donor_name || '';
        document.getElementById('form-house-no').value = item.house_no || '';

        if (item.entry_type === 'expense') {
          document.getElementById('type-expense').checked = true;
          toggleHouseNoField('expense');
        } else {
          document.getElementById('type-income').checked = true;
          toggleHouseNoField('income');
        }
      } else {
        elements.formDate.value = formatDateToInput(item.entry_date, item.id) || todayStr;
      }
    }
  } else {
    modalTitle.textContent = `Add Transaction`;
    submitBtnText.textContent = "Save Record";
  }

  // Open modal
  elements.modalOverlay.classList.add("open");
  elements.modalOverlay.setAttribute("aria-hidden", "false");
  elements.formAmount.focus();
}

function closeModal() {
  elements.modalOverlay.classList.remove("open");
  elements.modalOverlay.setAttribute("aria-hidden", "true");
  state.editRecordId = null;
}

function openDeleteModal(id) {
  state.deleteRecordId = id;
  const category = state.activeTab;
  const records = state.data[category] || [];
  const item = records.find(r => r.id.toString() === id.toString());
  
  if (item) {
    elements.deleteAmountDisplay.textContent = `₹${Number(item.amount).toLocaleString('en-IN')}`;
    elements.deleteDateDisplay.textContent = formatReadableDate(item.entry_date || item.donation_date, item.id);
    elements.deleteNoteDisplay.textContent = item.note || '-';
    
    if (category === 'taravih') {
      let donorDetails = item.donor_name || 'Hadiyo Payout';
      if (item.house_no) donorDetails += ` (House: ${item.house_no})`;
      elements.deleteNoteDisplay.textContent = `${donorDetails}${item.note ? ` - ${item.note}` : ''}`;
    }
    
    elements.deleteConfirmOverlay.classList.add("open");
    elements.deleteConfirmOverlay.setAttribute("aria-hidden", "false");
  }
}

function closeDeleteModal() {
  elements.deleteConfirmOverlay.classList.remove("open");
  elements.deleteConfirmOverlay.setAttribute("aria-hidden", "true");
  state.deleteRecordId = null;
}

// Modal Form Submission Handler
function handleFormSubmit(e) {
  e.preventDefault();

  const category = elements.formCategory.value;
  const action = state.editRecordId ? 'edit' : 'add';
  const recordId = state.editRecordId;

  const amountStr = elements.formAmount.value.trim();
  const amount = amountStr === "" ? 0 : Number(amountStr);
  const note = elements.formNote.value.trim();
  const date = elements.formDate.value;

  // Clear errors
  document.getElementById("form-date-error").textContent = "";
  document.getElementById("form-amount-error").textContent = "";

  let hasError = false;
  if (!date) {
    document.getElementById("form-date-error").textContent = "Date is required";
    hasError = true;
  }
  if (amount < 0) {
    document.getElementById("form-amount-error").textContent = "Amount cannot be negative";
    hasError = true;
  } else if (amount === 0 && !note) {
    document.getElementById("form-amount-error").textContent = "Description (note) is required for 0 amount";
    hasError = true;
  }

  if (hasError) return;

  const payload = {};
  if (recordId) payload.id = recordId;
  
  payload.amount = amount;
  payload.note = note;

  if (category === 'taravih') {
    payload.donation_date = date;
    payload.year = Number(document.getElementById('form-taravih-year').value) || new Date().getFullYear();
    
    const entryType = document.querySelector('input[name="entry_type"]:checked').value;
    payload.entry_type = entryType;
    payload.donor_name = document.getElementById('form-donor-name').value.trim();
    payload.house_no = entryType === 'income' ? document.getElementById('form-house-no').value.trim() : '';

    if (!payload.donor_name) {
      showToast("Name is required", "error");
      return;
    }
  } else {
    payload.entry_date = date;
  }

  performMutation(action, category, payload);
}

// Visual layout helper to set loading spinner/overlay
function animateValue(id, endVal) {
  const obj = document.getElementById(id);
  if (!obj) return;
  
  let start = 0;
  const textVal = obj.textContent.replace(/[^\d]/g, '');
  if (textVal) start = Number(textVal);
  
  if (start === endVal) {
    obj.innerHTML = `₹${endVal.toLocaleString('en-IN')}`;
    return;
  }
  
  const duration = 400;
  let startTimestamp = null;
  
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const val = Math.floor(progress * (endVal - start) + start);
    obj.innerHTML = `₹${val.toLocaleString('en-IN')}`;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = `₹${endVal.toLocaleString('en-IN')}`;
    }
  };
  
  window.requestAnimationFrame(step);
}

// Utility HTML escape
function escapeHtml(text) {
  if (!text) return '';
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper to parse dates robustly, cleaning up times, timestamps, and zone suffixes like "00:00:00 GM"
function parseDate(dStr, idStr = '') {
  if (!dStr) {
    if (idStr && idStr.startsWith('ID_')) {
      const match = idStr.match(/^ID_(\d+)/);
      if (match) {
        const timestamp = parseInt(match[1]);
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return null;
  }
  let str = dStr.toString().trim();
  
  try {
    // 1. Handle yyyy-mm-dd or dd-mm-yyyy formats with dash delimiters
    if (str.includes('-')) {
      const datePart = str.split(' ')[0]; // Strip any time suffix
      const parts = datePart.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return new Date(parts[0], parts[1] - 1, parts[2]);
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          return new Date(parts[2], parts[1] - 1, parts[0]);
        }
      }
    }
    
    // 1b. Handle yyyy/mm/dd or dd/mm/yyyy formats with slash delimiters
    if (str.includes('/')) {
      const datePart = str.split(' ')[0];
      const parts = datePart.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY/MM/DD
          return new Date(parts[0], parts[1] - 1, parts[2]);
        } else if (parts[2].length === 4) {
          // DD/MM/YYYY
          return new Date(parts[2], parts[1] - 1, parts[0]);
        }
      }
    }
    
    // 2. Handle space-separated dates (e.g. "Fri Jun 26 2026 00:00:00 GM")
    const words = str.split(/\s+/);
    if (words.length >= 4) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      let monthWord = "";
      let dayVal = "";
      let yearVal = "";
      
      // If words[1] is a month (e.g. "Fri Jun 26 2026")
      const idx1 = months.indexOf(words[1].toLowerCase().substring(0, 3));
      if (idx1 !== -1) {
        monthWord = words[1];
        dayVal = words[2];
        yearVal = words[3];
      } 
      // If words[0] is a month (e.g. "Jun 26 2026")
      else {
        const idx0 = months.indexOf(words[0].toLowerCase().substring(0, 3));
        if (idx0 !== -1) {
          monthWord = words[0];
          dayVal = words[1];
          yearVal = words[2];
        }
      }
      
      if (monthWord && dayVal && yearVal) {
        const date = new Date(`${monthWord} ${dayVal} ${yearVal}`);
        if (!isNaN(date.getTime())) return date;
      }
    }
    
    // 3. Fallback to default Javascript Date parser
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date;
  } catch (e) {
    console.error("Date parsing error: ", e);
  }
  
  if (idStr && idStr.startsWith('ID_')) {
    const match = idStr.match(/^ID_(\d+)/);
    if (match) {
      const timestamp = parseInt(match[1]);
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  return null;
}

// Format date into clean readable layout (e.g. "Wed, Jun 17, 2026") without timestamps
function formatReadableDate(dateString, idStr = '') {
  if (!dateString && (!idStr || !idStr.startsWith('ID_'))) return '-';
  const date = parseDate(dateString, idStr);
  if (!date) return dateString || '-'; // Fallback to raw string if parsing fails
  
  // Format to "Wed, Jun 17, 2026"
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
}

// Format date into standard YYYY-MM-DD input field layout
function formatDateToInput(dateString, idStr = '') {
  const date = parseDate(dateString, idStr);
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Toast Notification popup
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `<i class="ti ti-circle-check"></i>`;
  } else if (type === 'error') {
    iconHtml = `<i class="ti ti-circle-x"></i>`;
  } else {
    iconHtml = `<i class="ti ti-info-circle"></i>`;
  }
  
  toast.innerHTML = `${iconHtml} ${message}`;
  toast.className = `toast ${type} show`;
  
  // Clear any existing toast auto-dismiss timeouts
  if (window.toastTimeout) clearTimeout(window.toastTimeout);
  
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000); // Hide after 3 seconds
}

// Swipe/drag up to dismiss toast alert
function setupToastDismissal() {
  const toast = document.getElementById('toast');
  if (!toast) return;

  let startY = 0;
  let isDragging = false;

  const handleStart = (clientY) => {
    startY = clientY;
    isDragging = true;
  };

  const handleMove = (clientY) => {
    if (!isDragging) return;
    const diffY = clientY - startY;
    // Dragged up by more than 15px
    if (diffY < -15) {
      toast.classList.remove('show');
      isDragging = false;
    }
  };

  toast.addEventListener('touchstart', (e) => {
    handleStart(e.touches[0].clientY);
  }, { passive: true });

  toast.addEventListener('touchmove', (e) => {
    handleMove(e.touches[0].clientY);
  }, { passive: true });

  toast.addEventListener('touchend', () => {
    isDragging = false;
  });

  toast.addEventListener('mousedown', (e) => {
    handleStart(e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) handleMove(e.clientY);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
