/* Rent or buy a home in Malaysia: the buyer pays the down payment, stamp duty (with the first-home exemption), SRO 2023
   legal fees and SST up front, then the instalment and upkeep; the renter pays rent rising each year and invests what
   the buyer spent up front, plus any monthly difference. After the chosen years, the buyer's wealth is the home's value
   less selling costs and the loan balance (plus any invested difference); the renter's is the investment pot.
   Built on TBBLoan (loan-core.js). Verified 14 October 2026. */
(function (root) {
  'use strict';
  var L = typeof module === 'object' && module.exports ? require('./loan-core.js') : root.TBBLoan;

  var FACTS = { verified: '2026-10-14', maxYears: 35 };

  var cents = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var num = function (v, d) { v = Number(v); return v !== '' && isFinite(v) && v >= 0 ? v : (d || 0); };

  function calculate(input) {
    var buy = L.calculate({ price: input.price, downPct: input.downPct, rate: input.rate, years: input.years, firstHome: input.firstHome });
    var price = buy.price, horizon = Math.min(FACTS.maxYears, Math.max(1, Math.round(num(input.horizon, 10))));
    var growth = num(input.growth) / 100, rentRise = num(input.rentRise) / 100, ret = num(input.invest) / 100;
    var upkeep = num(input.upkeep) / 100, sell = num(input.sellCost) / 100, rent = num(input.rent);
    var rows = L.amortise(buy.loan, buy.rate, buy.years, 0).rows;
    var upfront = buy.costs.total, renterPot = upfront, buyerPot = 0, rows2 = [], breakEven = null;
    var buyerPaid = upfront, renterPaid = 0;
    for (var y = 1; y <= horizon; y++) {
      var value = price * Math.pow(1 + growth, y);
      var loanPaid = y <= buy.years ? buy.instalment * 12 : 0;
      var own = loanPaid + price * Math.pow(1 + growth, y - 1) * upkeep;
      var rentYear = rent * 12 * Math.pow(1 + rentRise, y - 1);
      buyerPaid += own; renterPaid += rentYear;
      // Whoever spends less this year invests the difference; pots grow at the return rate.
      renterPot = renterPot * (1 + ret) + Math.max(0, own - rentYear);
      buyerPot = buyerPot * (1 + ret) + Math.max(0, rentYear - own);
      var bal = y <= rows.length ? rows[y - 1].balance : 0;
      var buyer = value * (1 - sell) - bal + buyerPot, renter = renterPot;
      if (breakEven === null && buyer >= renter) breakEven = y;
      rows2.push({ year: y, value: cents(value), balance: cents(bal), buyer: cents(buyer), renter: cents(renter), rent: cents(rentYear / 12) });
    }
    var last = rows2[rows2.length - 1];
    return {
      price: price, loan: buy.loan, instalment: buy.instalment, upfront: upfront, costs: buy.costs, horizon: horizon,
      buyer: last.buyer, renter: last.renter, difference: cents(last.buyer - last.renter), better: last.buyer >= last.renter ? 'buy' : 'rent',
      buyerPaid: cents(buyerPaid), renterPaid: cents(renterPaid), breakEven: breakEven, rows: rows2,
      firstMonthOwn: cents(buy.instalment + price * upkeep / 12)
    };
  }

  var api = { FACTS: FACTS, calculate: calculate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TBBRentBuy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
