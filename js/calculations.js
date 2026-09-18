/**
 * Jewellery Ledger - Financial & Accounting Calculations Engine
 */

window.Calculations = {
  // Convert unit to standard grams
  getGramsRatio: function(unit) {
    if (!unit) return 1.0;
    const u = String(unit).toLowerCase();
    if (u.includes('tola')) return 11.664;
    if (u.includes('10')) return 10.0;
    return 1.0; // standard gram
  },

  // Calculate net weight in grams
  calculateNetWeight: function(grossWeight, stoneWeight, otherWeight) {
    const gross = parseFloat(grossWeight) || 0;
    const stone = parseFloat(stoneWeight) || 0;
    const other = parseFloat(otherWeight) || 0;
    const net = gross - stone - other;
    return Math.max(0, parseFloat(net.toFixed(3)));
  },

  // Calculate metal value based on net weight, rate, and rate unit
  calculateMetalValue: function(netWeight, ratePerGram, unit) {
    const net = parseFloat(netWeight) || 0;
    const rate = parseFloat(ratePerGram) || 0;
    // Rate is always internally normalized to per gram
    const value = net * rate;
    return Math.round(value);
  },

  // Calculate wastage amount
  calculateWastage: function(metalValue, wastagePercent) {
    const val = parseFloat(metalValue) || 0;
    const pct = parseFloat(wastagePercent) || 0;
    return Math.round((val * pct) / 100);
  },

  // Calculate full item total
  calculateItemTotal: function(params) {
    const netWeight = this.calculateNetWeight(params.grossWeight, params.stoneWeight, params.otherWeight);
    const metalVal = this.calculateMetalValue(netWeight, params.rate, params.unit);
    const wastage = this.calculateWastage(metalVal, params.wastagePercent);
    const making = parseFloat(params.makingCharge) || 0;
    const stone = parseFloat(params.stoneCharge) || 0;
    const other = parseFloat(params.otherCharge) || 0;
    const discount = parseFloat(params.discount) || 0;

    const total = metalVal + wastage + making + stone + other - discount;
    return {
      netWeight: netWeight,
      metalValue: metalVal,
      wastageAmount: wastage,
      itemTotal: Math.max(0, Math.round(total))
    };
  },

  // Calculate bill totals including multi-items and old gold exchange
  calculateBillTotals: function(items, oldGold, billDiscount, taxPercent) {
    let subtotal = 0;
    let makingTotal = 0;
    let wastageTotal = 0;
    let stoneTotal = 0;
    let otherTotal = 0;
    let itemDiscountsTotal = 0;

    (items || []).forEach(item => {
      subtotal += parseFloat(item.itemTotal) || 0;
      makingTotal += parseFloat(item.makingCharge) || 0;
      wastageTotal += parseFloat(item.wastageAmount) || 0;
      stoneTotal += parseFloat(item.stoneCharge) || 0;
      otherTotal += parseFloat(item.otherCharge) || 0;
      itemDiscountsTotal += parseFloat(item.discount) || 0;
    });

    let oldGoldVal = 0;
    if (oldGold && oldGold.hasOldGold) {
      oldGoldVal = parseFloat(oldGold.value) || 0;
    }

    const discount = parseFloat(billDiscount) || 0;
    const taxableAmount = Math.max(0, subtotal - oldGoldVal - discount);
    const taxPct = parseFloat(taxPercent) || 0;
    const taxAmount = Math.round((taxableAmount * taxPct) / 100);
    const grandTotal = taxableAmount + taxAmount;

    return {
      subtotal: Math.round(subtotal),
      makingChargesTotal: Math.round(makingTotal),
      wastageTotal: Math.round(wastageTotal),
      stoneChargesTotal: Math.round(stoneTotal),
      otherChargesTotal: Math.round(otherTotal),
      itemDiscountsTotal: Math.round(itemDiscountsTotal),
      oldGoldValue: Math.round(oldGoldVal),
      billDiscount: Math.round(discount),
      taxPercent: taxPct,
      taxAmount: taxAmount,
      grandTotal: Math.round(grandTotal)
    };
  },

  // Determine status automatically
  calculateBillStatus: function(grandTotal, paidAmount, dueDate, isCancelled, isDraft) {
    if (isCancelled) return "Cancelled";
    if (isDraft) return "Draft";

    const total = parseFloat(grandTotal) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const remaining = total - paid;

    if (total > 0 && remaining <= 0) {
      return "Paid";
    }

    // Check if overdue
    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      if (today > due && remaining > 0) {
        return "Overdue";
      }
    }

    if (paid > 0 && remaining > 0) {
      return "Partially Paid";
    }

    return "Unpaid";
  },

  // Calculate customer financial position (total purchase, paid, outstanding)
  calculateCustomerSummary: function(customerId, bills, payments) {
    const custBills = (bills || []).filter(b => b.customerId === customerId && b.status !== 'Cancelled' && b.status !== 'Draft');
    const custPayments = (payments || []).filter(p => p.customerId === customerId && p.status === 'Success');

    let totalPurchase = 0;
    let totalPaidFromBills = 0;

    custBills.forEach(b => {
      totalPurchase += parseFloat(b.grandTotal) || 0;
    });

    let totalPaid = 0;
    custPayments.forEach(p => {
      totalPaid += parseFloat(p.amount) || 0;
    });

    const outstanding = Math.max(0, totalPurchase - totalPaid);

    return {
      totalBills: custBills.length,
      totalPurchase: Math.round(totalPurchase),
      totalPaid: Math.round(totalPaid),
      outstanding: Math.round(outstanding)
    };
  },

  // Convert Gregorian/English number to Nepali Devnagari numerals
  toNepaliNumerals: function(num) {
    if (num === null || num === undefined) return '';
    const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(num).replace(/[0-9]/g, function(d) {
      return devanagariDigits[parseInt(d, 10)];
    });
  },

  // Format currency with commas (NPR 1,234,567)
  formatNPR: function(amount) {
    const num = parseFloat(amount) || 0;
    return "NPR " + num.toLocaleString('en-IN');
  },

  // Format currency with Nepali Rupee symbol
  formatNepaliRS: function(amount) {
    const num = parseFloat(amount) || 0;
    return "रु. " + this.toNepaliNumerals(num.toLocaleString('en-IN'));
  },

  // Format weight to Tola-Lal (1 Tola = 11.664 g, 1 Tola = 100 Lal)
  formatTolaLal: function(grams) {
    const g = parseFloat(grams) || 0;
    if (g <= 0) return "० ग्रा.";
    const tola = Math.floor(g / 11.664);
    const remGrams = g - (tola * 11.664);
    const lal = ((remGrams / 11.664) * 100).toFixed(1);
    if (tola > 0) {
      return `${this.toNepaliNumerals(g.toFixed(2))} ग्रा. (${this.toNepaliNumerals(tola)} तोला ${this.toNepaliNumerals(lal)} लाल)`;
    }
    return `${this.toNepaliNumerals(g.toFixed(2))} ग्रा. (${this.toNepaliNumerals(lal)} लाल)`;
  },

  // Convert Gregorian YYYY-MM-DD to Bikram Sambat display format
  toBikramSambat: function(dateStr) {
    if (!dateStr) return "२०८३/०५/३०";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const bsYear = y + 57;
      return `${this.toNepaliNumerals(bsYear)}/${this.toNepaliNumerals(String(m).padStart(2, '0'))}/${this.toNepaliNumerals(String(d).padStart(2, '0'))}`;
    }
    return this.toNepaliNumerals(dateStr);
  },

  // Convert positive integer to Nepali words
  numberToNepaliWords: function(amount) {
    const num = Math.round(parseFloat(amount) || 0);
    if (num === 0) return "शून्य रुपैयाँ मात्र";

    const ones = [
      "", "एक", "दुई", "तीन", "चार", "पाँच", "छ", "सात", "आठ", "नौ",
      "दश", "एघार", "बाह्र", "तेह्र", "चौध", "पन्ध्र", "सोह्र", "सत्र", "अठार", "उन्नाइस",
      "बीस", "एक्काइस", "बाइस", "तेइस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताइस", "अठ्ठाइस", "उनन्तीस",
      "तीस", "एकतीस", "बत्तीस", "तेत्तीस", "चउतीस", "पैंतीस", "छत्तीस", "सरतीस", "अडतीस", "उनन्चालीस",
      "चालीस", "एकचालीस", "बयालीस", "त्रिचालीस", "चवालीस", "पैंतालीस", "छयालीस", "सरचालीस", "अडचालीस", "उनञ्चास",
      "पचास", "एकाउन्न", "बाउन्न", "त्रिपन्न", "चउन्न", "पचपन्न", "छपन्न", "ससन्ताउन्न", "अन्ठाउन्न", "उनन्साठ्ठी",
      "साठ्ठी", "एकसट्ठी", "बासट्ठी", "त्रिसट्ठी", "चौंसट्ठी", "पैंसट्ठी", "छयसट्ठी", "सतसट्ठी", "अठसट्ठी", "उनन्सत्तरी",
      "सत्तरी", "एकहत्तर", "बहत्तर", "त्रिहत्तर", "चौहत्तर", "पचहत्तर", "छयहत्तर", "सतहत्तर", "अठहत्तर", "उनासी",
      "असी", "एकासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छयासी", "सतासी", "अठासी", "उनान्नब्बे",
      "नब्बे", "एकानब्बे", "बयानब्बे", "त्रियानब्बे", "चौरानब्बे", "पन्चानब्बे", "छयानब्बे", "सन्तानब्बे", "अन्ठानब्बे", "उनान्सय"
    ];

    let result = "";
    let n = num;

    // Crores (करोड)
    if (n >= 10000000) {
      const cr = Math.floor(n / 10000000);
      result += (ones[cr] || cr) + " करोड ";
      n %= 10000000;
    }

    // Lakhs (लाख)
    if (n >= 100000) {
      const lk = Math.floor(n / 100000);
      result += (ones[lk] || lk) + " लाख ";
      n %= 100000;
    }

    // Thousands (हजार)
    if (n >= 1000) {
      const th = Math.floor(n / 1000);
      result += (ones[th] || th) + " हजार ";
      n %= 1000;
    }

    // Hundreds (सय)
    if (n >= 100) {
      const hd = Math.floor(n / 100);
      result += (ones[hd] || hd) + " सय ";
      n %= 100;
    }

    if (n > 0) {
      result += (ones[n] || n) + " ";
    }

    return result.trim() + " रुपैयाँ मात्र";
  }
};
