/* Malaysia payroll core: EPF, SOCSO, EIS, LINDUNG 24 Jam and PCB/MTD for one month.
   Shared by the calculator pages and the build (example tables) and unit tests.
   Rules last verified 10 October 2026; see RULES.verified and the page "Sources" section. */
(function (root) {
  'use strict';

  var RULES = {
    verified: '2026-10-10',
    taxYear: 2026,
    minWage: 1000,
    socsoCeiling: 6000,
    // Chargeable income bands for PCB: [lower M, rate R, base B for categories 1/3, base B for category 2].
    // B already includes the RM400 (individual) / RM800 (with spouse) rebate below RM35,000.
    pcb: [
      [5000, 0.01, -400, -800],
      [20000, 0.03, -250, -650],
      [35000, 0.06, 600, 600],
      [50000, 0.11, 1500, 1500],
      [70000, 0.19, 3700, 3700],
      [100000, 0.25, 9400, 9400],
      [400000, 0.26, 84400, 84400],
      [600000, 0.28, 136400, 136400],
      [2000000, 0.30, 528400, 528400]
    ],
    // Annual tax for reporting (YA2026 resident rates, before rebate).
    tax: [
      [0, 5000, 0], [5000, 20000, 0.01], [20000, 35000, 0.03], [35000, 50000, 0.06],
      [50000, 70000, 0.11], [70000, 100000, 0.19], [100000, 400000, 0.25],
      [400000, 600000, 0.26], [600000, 2000000, 0.28], [2000000, Infinity, 0.30]
    ],
    relief: { self: 9000, spouse: 4000, child: 2000, epfCap: 4000 }
  };

  var cents = function (n) { return Math.round(n * 100) / 100; };

  // EPF Third Schedule: wages are banded (RM20 steps to RM5,000, RM100 steps to RM20,000),
  // the rate applies to the band's upper limit, and each share is rounded up to the next ringgit.
  function epfWage(w) {
    if (w <= 10) return 0;
    if (w <= 5000) return Math.ceil(w / 20) * 20;
    if (w <= 20000) return Math.ceil(w / 100) * 100;
    return w;
  }
  function epf(w, age60, permanentResident) {
    var base = epfWage(w);
    var er = age60 ? (permanentResident ? (w > 5000 ? 0.06 : 0.065) : 0.04) : (w > 5000 ? 0.12 : 0.13);
    var ee = age60 ? (permanentResident ? 0.055 : 0) : 0.11;
    // Above RM20,000, KWSP rounds the COMBINED contribution upward once.
    // Keep employee's actual cents; allocate the rounding difference to the employer.
    var employee = w > 20000 ? cents(w * ee) : Math.ceil(cents(base * ee));
    var employer = w > 20000 ? Math.ceil(cents(w * (ee + er)) - 1e-9) - employee : Math.ceil(cents(base * er));
    return {
      employee: employee,
      employer: cents(employer),
      employeeRate: ee, employerRate: er
    };
  }

  // PERKESO schedules (Act 4 and Act 800) use RM100 bands from RM400 up to the RM6,000 ceiling;
  // the rate applies to the band mid-point and rounds to 5 sen, with exact halves going to the
  // amount ending in 5 (e.g. RM51.625 -> RM51.65, RM53.375 -> RM53.35), matching the published tables.
  function perkesoMid(w) {
    var capped = Math.min(w, RULES.socsoCeiling);
    return Math.max(Math.ceil(capped / 100) * 100, 500) - 50;
  }
  function round5(amount) {
    var steps = Math.round(amount * 100 * 1000) / 1000 / 5;
    var floor = Math.floor(steps);
    if (Math.abs(steps - floor - 0.5) < 1e-9) steps = floor % 2 ? floor : floor + 1;
    else steps = Math.round(steps);
    return cents(steps * 5 / 100);
  }
  function perkeso(w, age60, lindung, eisExempt) {
    var mid = perkesoMid(w);
    return {
      socsoEmployee: age60 ? 0 : round5(mid * 0.005),
      socsoEmployer: round5(mid * (age60 ? 0.0125 : 0.0175)),
      eisEmployee: age60 || eisExempt ? 0 : round5(mid * 0.002),
      eisEmployer: age60 || eisExempt ? 0 : round5(mid * 0.002),
      lindung: lindung ? round5(mid * 0.0075) : 0
    };
  }

  function bracket(p) {
    for (var i = RULES.pcb.length - 1; i >= 0; i--) if (p > RULES.pcb[i][0]) return RULES.pcb[i];
    return null;
  }

  // LHDN computerised method for a month with no prior earnings in the year (January) and the
  // same pay every month, which is also the steady monthly amount for a regular salary.
  function pcb(o, epfEmployee) {
    var n = 11;
    var y1 = o.salary;
    var k1 = Math.min(epfEmployee, RULES.relief.epfCap);
    var k2 = Math.min(k1, Math.max(0, (RULES.relief.epfCap - k1) / n));
    var reliefs = RULES.relief.self + (o.status === 'spouse' ? RULES.relief.spouse : 0) +
      RULES.relief.child * o.children + o.otherRelief;
    var p = (y1 - k1) + (y1 - k2) * n - reliefs;
    var b = bracket(p);
    var annual = b ? (p - b[0]) * b[1] + (o.status === 'spouse' ? b[3] : b[2]) : 0;
    var mtd = Math.max(0, annual) / (n + 1);
    // LHDN: keep two decimals (truncate), then round up to the next 5 sen; under RM10 is not deducted.
    mtd = Math.floor(mtd * 100 + 1e-7) / 100;
    mtd = Math.ceil(mtd * 20 - 1e-7) / 20;
    if (mtd < 10) mtd = 0;
    return {
      chargeable: Math.max(0, p),
      monthly: cents(mtd),
      net: (function () {
        // Round the final monthly deduction AFTER zakat, per LHDN PCB specification.
        var afterZakat = Math.max(0, mtd - o.zakat);
        return cents(Math.ceil(afterZakat * 20 - 1e-9) / 20);
      })(),
      rate: b ? b[1] : 0
    };
  }

  function annualTax(chargeable, status) {
    var t = 0;
    RULES.tax.forEach(function (r) { if (chargeable > r[0]) t += (Math.min(chargeable, r[1]) - r[0]) * r[2]; });
    if (chargeable <= 35000) t -= status === 'spouse' ? 800 : 400;
    return cents(Math.max(0, t));
  }

  function normalise(input) {
    var num = function (v, min, max) {
      v = Number(v);
      if (!isFinite(v)) v = 0;
      return Math.min(max, Math.max(min, v));
    };
    return {
      salary: cents(num(input.salary, 0, 1000000)),
      age60: !!input.age60,
      age57: !!input.age57 && !input.age60,
      permanentResident: !!input.permanentResident,
      eisExempt: !!input.age57 && !input.age60 && !!input.eisExempt,
      status: input.status === 'spouse' ? 'spouse' : (input.status === 'married' ? 'married' : 'single'),
      children: Math.round(num(input.children, 0, 20)),
      otherRelief: cents(num(input.otherRelief, 0, 1000000)),
      zakat: cents(num(input.zakat, 0, 1000000)),
      lindung: input.lindung !== false
    };
  }

  function calculate(input) {
    var o = normalise(input);
    var e = epf(o.salary, o.age60, o.permanentResident);
    var s = perkeso(o.salary, o.age60, o.lindung, o.eisExempt);
    var t = pcb(o, e.employee);
    var deductions = cents(e.employee + s.socsoEmployee + s.eisEmployee + s.lindung + t.net + o.zakat);
    var employerCost = cents(o.salary + e.employer + s.socsoEmployer + s.eisEmployer);
    return {
      input: o,
      valid: o.salary >= RULES.minWage,
      epf: e, perkeso: s, pcb: t,
      zakat: o.zakat,
      deductions: deductions,
      net: cents(o.salary - deductions),
      employerCost: employerCost,
      annual: {
        gross: cents(o.salary * 12),
        net: cents((o.salary - deductions) * 12),
        epfTotal: cents((e.employee + e.employer) * 12),
        tax: cents(Math.max(0, annualTax(t.chargeable, o.status) - o.zakat * 12))
      }
    };
  }

  var api = { RULES: RULES, calculate: calculate, epf: epf, perkeso: perkeso, round5: round5, annualTax: annualTax };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBSalary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
