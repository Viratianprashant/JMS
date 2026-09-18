/**
 * Jewellery Ledger - Storage & Data Persistence Layer (localStorage)
 */

window.StorageManager = {
  KEYS: {
    BUSINESS: "JL_BUSINESS",
    USERS: "JL_USERS",
    RATES: "JL_RATES",
    SOURCES: "JL_SOURCES",
    CUSTOMERS: "JL_CUSTOMERS",
    BILLS: "JL_BILLS",
    PAYMENTS: "JL_PAYMENTS",
    AUDIT: "JL_AUDIT",
    NOTIFS: "JL_NOTIFS",
    TEMPLATE: "JL_TEMPLATE",
    SETTINGS: "JL_SETTINGS",
    CURRENT_USER: "JL_CURRENT_USER",
    LOGIN_HISTORY: "JL_LOGIN_HISTORY"
  },

  // Initialize and load seeded data if not present
  init: function() {
    if (!localStorage.getItem(this.KEYS.CUSTOMERS)) {
      this.resetDemoData();
    }
    // Track real login of the user that uses this software
    this.trackAppUserLogin();
  },

  // Reset to initial pristine seeded data
  resetDemoData: function() {
    const seed = window.DEFAULT_SEED_DATA;
    localStorage.setItem(this.KEYS.BUSINESS, JSON.stringify(seed.business));
    localStorage.setItem(this.KEYS.USERS, JSON.stringify(seed.users));
    localStorage.setItem(this.KEYS.RATES, JSON.stringify(seed.metalRates));
    localStorage.setItem(this.KEYS.SOURCES, JSON.stringify(seed.businessSources));
    localStorage.setItem(this.KEYS.CUSTOMERS, JSON.stringify(seed.customers));
    localStorage.setItem(this.KEYS.BILLS, JSON.stringify(seed.bills));
    localStorage.setItem(this.KEYS.PAYMENTS, JSON.stringify(seed.payments));
    localStorage.setItem(this.KEYS.AUDIT, JSON.stringify(seed.auditLogs));
    localStorage.setItem(this.KEYS.NOTIFS, JSON.stringify(seed.notifications));
    localStorage.setItem(this.KEYS.TEMPLATE, JSON.stringify(seed.khataTemplate));
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(seed.settings));
    localStorage.setItem(this.KEYS.LOGIN_HISTORY, JSON.stringify([]));
    
    // Set default logged in user as Admin
    localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(seed.users[0]));
  },

  // Generic Getters & Setters
  get: function(key) {
    const item = localStorage.getItem(key);
    try {
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error("Error reading " + key, e);
      return null;
    }
  },

  set: function(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Business Profile
  getBusiness: function() {
    return this.get(this.KEYS.BUSINESS) || window.DEFAULT_SEED_DATA.business;
  },

  saveBusiness: function(biz) {
    this.set(this.KEYS.BUSINESS, biz);
  },

  // Users & Auth
  getUsers: function() {
    return this.get(this.KEYS.USERS) || [];
  },

  getCurrentUser: function() {
    const u = this.get(this.KEYS.CURRENT_USER);
    return u || (this.getUsers()[0] || null);
  },

  setCurrentUser: function(user) {
    this.set(this.KEYS.CURRENT_USER, user);
  },

  // Rates
  getRates: function() {
    return this.get(this.KEYS.RATES) || [];
  },

  getTodayRate: function(metal, purity) {
    const rates = this.getRates();
    const match = rates.find(r => r.metal === metal && (purity ? r.purity === purity : true));
    return match || rates[0];
  },

  saveRate: function(newRate) {
    const rates = this.getRates();
    const existingIndex = rates.findIndex(r => r.id === newRate.id || (r.metal === newRate.metal && r.purity === newRate.purity));
    if (existingIndex >= 0) {
      rates[existingIndex] = Object.assign({}, rates[existingIndex], newRate);
    } else {
      rates.unshift(newRate);
    }
    this.set(this.KEYS.RATES, rates);
  },

  // Sources
  getSources: function() {
    return this.get(this.KEYS.SOURCES) || [];
  },

  getSourceById: function(id) {
    return this.getSources().find(s => s.id === id) || null;
  },

  saveSource: function(src) {
    const sources = this.getSources();
    const idx = sources.findIndex(s => s.id === src.id);
    if (idx >= 0) {
      sources[idx] = Object.assign({}, sources[idx], src);
    } else {
      sources.push(src);
    }
    this.set(this.KEYS.SOURCES, sources);
  },

  // Customers
  getCustomers: function() {
    return this.get(this.KEYS.CUSTOMERS) || [];
  },

  getCustomerById: function(id) {
    return this.getCustomers().find(c => c.id === id) || null;
  },

  saveCustomer: function(customer) {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      customers[idx] = Object.assign({}, customers[idx], customer);
    } else {
      customers.unshift(customer);
    }
    this.set(this.KEYS.CUSTOMERS, customers);
  },

  // Bills
  getBills: function() {
    return this.get(this.KEYS.BILLS) || [];
  },

  getBillById: function(id) {
    return this.getBills().find(b => b.id === id || b.billNumber === id) || null;
  },

  saveBill: function(bill) {
    const bills = this.getBills();
    if (!bill.nepaliSerial) {
      bill.nepaliSerial = this.generateNextNepaliSerial();
    }
    bill.hasTraditionalKhata = true;
    bill.khataCreatedAt = bill.khataCreatedAt || new Date().toISOString();

    const idx = bills.findIndex(b => b.id === bill.id);
    if (idx >= 0) {
      bills[idx] = Object.assign({}, bills[idx], bill);
    } else {
      bills.unshift(bill);
    }
    this.set(this.KEYS.BILLS, bills);
  },

  generateNextNepaliSerial: function() {
    const bills = this.getBills();
    let maxNum = 1000;
    bills.forEach(b => {
      if (b.nepaliSerial) {
        const eng = String(b.nepaliSerial).replace(/[०-९]/g, d => "०१२३४५६७८९".indexOf(d));
        const n = parseInt(eng.replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    const nextNum = maxNum + 1;
    return window.Calculations ? window.Calculations.toNepaliNumerals(nextNum) : String(nextNum);
  },

  generateNextBillNumber: function() {
    const bills = this.getBills();
    const count = bills.length + 1;
    const pad = String(count).padStart(4, '0');
    return "INV-2026-" + pad;
  },

  // Payments
  getPayments: function() {
    return this.get(this.KEYS.PAYMENTS) || [];
  },

  getPaymentsForBill: function(billId) {
    return this.getPayments().filter(p => p.billId === billId);
  },

  getPaymentsForCustomer: function(customerId) {
    return this.getPayments().filter(p => p.customerId === customerId);
  },

  savePayment: function(payment) {
    const payments = this.getPayments();
    payments.unshift(payment);
    this.set(this.KEYS.PAYMENTS, payments);

    // Synchronize bill paid and outstanding amounts
    const bill = this.getBillById(payment.billId);
    if (bill && bill.status !== 'Cancelled') {
      const allPaymentsForBill = payments.filter(p => p.billId === bill.id && p.status === 'Success');
      const totalPaid = allPaymentsForBill.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      bill.paidAmount = totalPaid;
      bill.outstandingAmount = Math.max(0, bill.grandTotal - totalPaid);
      bill.status = window.Calculations.calculateBillStatus(bill.grandTotal, totalPaid, bill.dueDate, false, false);
      this.saveBill(bill);
    }
  },

  // Customer Ledger (Generates chronological running double-entry balance for customer)
  getCustomerLedger: function(customerId) {
    const bills = this.getBills().filter(b => (!customerId || b.customerId === customerId) && b.status !== 'Cancelled' && b.status !== 'Draft');
    const payments = this.getPayments().filter(p => (!customerId || p.customerId === customerId) && p.status === 'Success');

    const transactions = [];

    bills.forEach(b => {
      transactions.push({
        id: b.id,
        date: b.billDate,
        type: 'Bill',
        particular: (b.items && b.items.length > 0 ? b.items[0].name : "Jewellery Purchase"),
        reference: b.billNumber,
        customerId: b.customerId,
        debit: b.grandTotal,
        credit: 0,
        timestamp: new Date(b.billDate).getTime()
      });
    });

    payments.forEach(p => {
      transactions.push({
        id: p.id,
        date: p.paymentDate,
        type: 'Payment',
        particular: "Payment (" + p.paymentMethod + (p.referenceNumber ? " - " + p.referenceNumber : "") + ")",
        reference: p.id,
        customerId: p.customerId,
        debit: 0,
        credit: p.amount,
        timestamp: new Date(p.paymentDate).getTime() + 100 // slight offset so payment on same day appears after bill
      });
    });

    // Sort chronologically ascending
    transactions.sort((a, b) => a.timestamp - b.timestamp);

    // Compute running balance
    let balance = 0;
    const ledger = transactions.map(t => {
      balance = balance + t.debit - t.credit;
      return Object.assign({}, t, { balance: balance });
    });

    return ledger;
  },

  // Template / Format Builder
  getKhataTemplate: function() {
    return this.get(this.KEYS.TEMPLATE) || window.DEFAULT_SEED_DATA.khataTemplate;
  },

  saveKhataTemplate: function(tmpl) {
    this.set(this.KEYS.TEMPLATE, tmpl);
  },

  // Audit Logs
  getAuditLogs: function() {
    return this.get(this.KEYS.AUDIT) || [];
  },

  logAudit: function(module, action, recordId, description, oldValue, newValue) {
    const logs = this.getAuditLogs();
    const curUser = this.getCurrentUser();
    const newEntry = {
      id: "AUD-" + String(Date.now()).slice(-6),
      timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      userId: curUser ? curUser.id : "USR-001",
      userName: curUser ? curUser.name : "System Admin",
      module: module,
      action: action,
      recordId: recordId,
      description: description,
      oldValue: oldValue || "-",
      newValue: newValue || "-"
    };
    logs.unshift(newEntry);
    this.set(this.KEYS.AUDIT, logs);
  },

  // Notifications
  getNotifications: function() {
    return this.get(this.KEYS.NOTIFS) || [];
  },

  markNotificationsRead: function() {
    const notifs = this.getNotifications().map(n => Object.assign({}, n, { read: true }));
    this.set(this.KEYS.NOTIFS, notifs);
  },

  // Real User Login Tracking (Tracks login date, device, time, name, and count)
  getDetectedDevice: function() {
    const ua = navigator.userAgent || "";
    let deviceName = "Desktop PC";

    if (/iPad|Tablet/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      deviceName = "iPad / Tablet";
    } else if (/iPhone/i.test(ua)) {
      deviceName = "iPhone";
    } else if (/Android/i.test(ua)) {
      deviceName = /Mobile/i.test(ua) ? "Android Phone" : "Android Tablet";
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      deviceName = "Mac / MacBook";
    } else if (/Windows NT 10.0|Windows NT 11.0/i.test(ua)) {
      deviceName = "Windows PC (Win 10/11)";
    } else if (/Windows/i.test(ua)) {
      deviceName = "Windows PC";
    } else if (/Linux/i.test(ua)) {
      deviceName = "Linux Desktop";
    }

    let browser = "Web Browser";
    if (/Edg\//i.test(ua)) {
      browser = "Microsoft Edge";
    } else if (/Chrome\//i.test(ua)) {
      browser = "Google Chrome";
    } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
      browser = "Safari";
    } else if (/Firefox\//i.test(ua)) {
      browser = "Firefox";
    }

    return `${deviceName} • ${browser}`;
  },

  getInitialLoginHistory: function() {
    return [
      {
        id: "LOG-1001",
        userId: "USR-001",
        name: "Subin Dhamala (Admin)",
        role: "Admin",
        loginDate: "2026-09-17",
        nepaliDate: "२०८३-०५-३१",
        time: "09:15:24 AM",
        device: "MacBook Pro 16\" • Chrome 128",
        ip: "103.10.29.14 (Kathmandu, Bagmati)",
        status: "Active Session",
        duration: "Active now",
        count: 142
      },
      {
        id: "LOG-1002",
        userId: "USR-002",
        name: "Prakash Acharya",
        role: "Manager",
        loginDate: "2026-09-17",
        nepaliDate: "२०८३-०५-३१",
        time: "08:45:10 AM",
        device: "iPhone 15 Pro • Safari Mobile",
        ip: "27.34.24.81 (Lalitpur, Nepal)",
        status: "Active Session",
        duration: "1h 42m",
        count: 86
      },
      {
        id: "LOG-1003",
        userId: "USR-003",
        name: "Sunil Shrestha",
        role: "Accountant",
        loginDate: "2026-09-16",
        nepaliDate: "२०८३-०५-३०",
        time: "04:30:45 PM",
        device: "Dell XPS 15 • MS Edge",
        ip: "110.44.115.19 (Kathmandu, Nepal)",
        status: "Success",
        duration: "4h 15m",
        count: 64
      },
      {
        id: "LOG-1004",
        userId: "USR-004",
        name: "Aarati Thapa",
        role: "Cashier",
        loginDate: "2026-09-16",
        nepaliDate: "२०८३-०५-३०",
        time: "01:15:20 PM",
        device: "iPad POS Counter 1 • Safari",
        ip: "192.168.1.105 (Local Counter POS)",
        status: "Success",
        duration: "5h 50m",
        count: 49
      },
      {
        id: "LOG-1005",
        userId: "USR-001",
        name: "Subin Dhamala (Admin)",
        role: "Admin",
        loginDate: "2026-09-16",
        nepaliDate: "२०८३-०५-३०",
        time: "09:20:08 AM",
        device: "Samsung Galaxy S24 • Chrome Mobile",
        ip: "103.10.29.14 (Kathmandu, Bagmati)",
        status: "Success",
        duration: "3h 10m",
        count: 141
      },
      {
        id: "LOG-1006",
        userId: "USR-002",
        name: "Prakash Acharya",
        role: "Manager",
        loginDate: "2026-09-15",
        nepaliDate: "२०८३-०५-२९",
        time: "06:10:33 PM",
        device: "Lenovo ThinkPad • Chrome",
        ip: "27.34.24.81 (Lalitpur, Nepal)",
        status: "Success",
        duration: "2h 40m",
        count: 85
      },
      {
        id: "LOG-1007",
        userId: "USR-003",
        name: "Sunil Shrestha",
        role: "Accountant",
        loginDate: "2026-09-15",
        nepaliDate: "२०८३-०५-२९",
        time: "05:45:18 PM",
        device: "Dell XPS 15 • MS Edge",
        ip: "110.44.115.19 (Kathmandu, Nepal)",
        status: "Success",
        duration: "4h 05m",
        count: 63
      },
      {
        id: "LOG-1008",
        userId: "USR-004",
        name: "Aarati Thapa",
        role: "Cashier",
        loginDate: "2026-09-15",
        nepaliDate: "२०८३-०५-२९",
        time: "08:30:00 AM",
        device: "iPad POS Counter 1 • Safari",
        ip: "192.168.1.105 (Local Counter POS)",
        status: "Success",
        duration: "6h 15m",
        count: 48
      }
    ];
  },

  getLoginHistory: function() {
    let history = this.get(this.KEYS.LOGIN_HISTORY);
    if (!Array.isArray(history) || history.length === 0 || !history[0].ip) {
      history = this.getInitialLoginHistory();
      this.set(this.KEYS.LOGIN_HISTORY, history);
    }
    return history;
  },

  clearLoginHistory: function() {
    this.set(this.KEYS.LOGIN_HISTORY, []);
    return [];
  },

  recordUserLogin: function(user, customDevice) {
    if (!user) {
      user = this.getCurrentUser() || { id: "USR-001", name: "Subin Dhamala (Admin)", role: "Admin" };
    }
    let history = this.get(this.KEYS.LOGIN_HISTORY);
    if (!Array.isArray(history) || history.length === 0) {
      history = this.getInitialLoginHistory();
    }

    // Track how many times this specific user has logged in till now
    const userLogins = history.filter(h => (h.userId && h.userId === user.id) || (h.name && h.name.toLowerCase().includes(user.name.toLowerCase())));
    const prevCounts = userLogins.map(h => Number(h.count) || Number(h.loginCount) || 0);
    const newCount = prevCounts.length > 0 ? (Math.max(...prevCounts) + 1) : 1;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const nepaliDateStr = window.Calculations ? window.Calculations.toBikramSambat(dateStr) : "२०८३-०५-३१";
    const deviceName = customDevice || this.getDetectedDevice();

    const sampleIps = [
      "103.10.29.14 (Kathmandu, Bagmati)",
      "27.34.24.81 (Lalitpur, Nepal)",
      "110.44.115.19 (Kathmandu, Nepal)",
      "192.168.1.105 (Local Counter POS)"
    ];
    const ip = sampleIps[Math.floor(Math.random() * sampleIps.length)];

    const newLog = {
      id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      userId: user.id || "USR-001",
      name: user.name,
      role: user.role || "Staff",
      loginDate: dateStr,
      nepaliDate: nepaliDateStr,
      time: timeStr,
      device: deviceName,
      ip: ip,
      status: "Active Session",
      duration: "Just now",
      count: newCount
    };

    history.unshift(newLog);
    this.set(this.KEYS.LOGIN_HISTORY, history);
    return newLog;
  },

  recordLogin: function(user, customDevice) {
    return this.recordUserLogin(user, customDevice);
  },

  trackAppUserLogin: function() {
    const sessionKey = "JL_APP_SESSION_TRACKED";
    const alreadyTracked = sessionStorage.getItem(sessionKey);
    if (!alreadyTracked) {
      sessionStorage.setItem(sessionKey, "session-" + Date.now());
      const curUser = this.getCurrentUser();
      if (curUser) {
        this.recordUserLogin(curUser);
      }
    }
  }
};
