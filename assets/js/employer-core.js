/* What an employee really costs an employer in Malaysia: wages, employer EPF (13% up to RM5,000, 12% above; 4% from
   age 60; 2% for foreign workers from October 2025), SOCSO (1.75%, 1.25% from age 60) and EIS (0.2%; not for foreign
   workers) from TBBSalary, plus the HRD Corp levy (1% for employers with 10 or more Malaysian employees in covered
   sectors, 0.5% voluntary for 5 to 9; Malaysian employees only). Bonus attracts EPF. Verified 14 October 2026. */
(function (root) {
  'use strict';
  var S = typeof module === 'object' && module.exports ? require('./salary-core.js') : root.TBBSalary;

  var FACTS = { verified: '2026-10-14', foreignEpf: 0.02, foreignFrom: '2025-10-01', hrd: { none: 0, half: 0.005, full: 0.01 } };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  // Employer and employee EPF on a month's wages; foreign workers pay 2% each on the Third Schedule wage band.
  function epf(w, age60, foreign) {
    if (!foreign) return S.epf(w, age60);
    var base = w <= 10 ? 0 : w <= 5000 ? Math.ceil(w / 20) * 20 : w <= 20000 ? Math.ceil(w / 100) * 100 : w;
    var share = Math.ceil(cents(base * FACTS.foreignEpf));
    return { employee: share, employer: share, employeeRate: FACTS.foreignEpf, employerRate: FACTS.foreignEpf };
  }

  function calculate(input) {
    var salary = num(input.salary), allow = num(input.allowances), w = cents(salary + allow);
    var age60 = input.age60 === true || input.age60 === 'yes', foreign = input.foreign === true || input.foreign === 'yes';
    var e = epf(w, age60, foreign), p = S.perkeso(w, age60, false, foreign);
    var hrdRate = foreign ? 0 : FACTS.hrd[input.hrd] || 0, hrd = cents(w * hrdRate);
    var monthly = cents(w + e.employer + p.socsoEmployer + p.eisEmployer + hrd);
    var bonus = cents(salary * num(input.bonus));
    var bonusEpf = bonus ? cents(epf(w + bonus, age60, foreign).employer - e.employer) : 0;
    var yearly = cents(monthly * 12 + bonus + bonusEpf);
    return {
      wages: w, epf: e.employer, epfRate: e.employerRate, socso: p.socsoEmployer, eis: p.eisEmployer, hrd: hrd, hrdRate: hrdRate,
      monthly: monthly, onTop: cents(monthly - w), onTopPct: w ? (monthly - w) / w * 100 : 0,
      bonus: bonus, bonusEpf: bonusEpf, yearly: yearly,
      employeeEpf: e.employee, employeeSocso: p.socsoEmployee, employeeEis: p.eisEmployee,
      takeHomeBeforeTax: cents(w - e.employee - p.socsoEmployee - p.eisEmployee)
    };
  }

  var api = { FACTS: FACTS, epf: epf, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBEmployer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
