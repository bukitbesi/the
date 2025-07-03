
// Wait for the HTML content to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- Get references to DOM elements ---
    const loanAmountEl = document.getElementById('loanAmount');
    const interestRateEl = document.getElementById('interestRate');
    const loanTenureEl = document.getElementById('loanTenure');

    const monthlyPaymentEl = document.getElementById('monthlyPayment');
    const totalRepaymentEl = document.getElementById('totalRepayment');
    const totalInterestEl = document.getElementById('totalInterest');

    // --- Main calculation function ---
    function calculateLoan() {
        // Parse input values as numbers, default to 0 if empty or invalid
        const P = parseFloat(loanAmountEl.value) || 0; // Principal loan amount
        const annualInterestRate = parseFloat(interestRateEl.value) || 0; // Annual interest rate (%)
        const tenureInYears = parseFloat(loanTenureEl.value) || 0; // Loan tenure in years

        // --- Input validation ---
        if (P <= 0 || annualInterestRate <= 0 || tenureInYears <= 0) {
            resetResults();
            return; // Exit if inputs are not valid
        }

        // --- Calculations ---
        const r = (annualInterestRate / 100) / 12; // Monthly interest rate
        const n = tenureInYears * 12; // Total number of payments (months)

        // Monthly Payment (M) using the formula: M = P * [r(1+r)^n] / [(1+r)^n – 1]
        const monthlyPayment = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        
        // Handle case where interest rate is zero
        const finalMonthlyPayment = (annualInterestRate === 0) ? (P / n) : monthlyPayment;

        const totalRepayment = finalMonthlyPayment * n;
        const totalInterest = totalRepayment - P;

        // --- Update the UI with formatted results ---
        updateResults({
            monthlyPayment: finalMonthlyPayment,
            totalRepayment: totalRepayment,
            totalInterest: totalInterest
        });
    }

    // --- Function to update the display ---
    function updateResults(results) {
        // Using toLocaleString for clean currency formatting
        const currencyOptions = { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 };
        
        monthlyPaymentEl.textContent = results.monthlyPayment.toLocaleString('en-MY', currencyOptions);
        totalRepaymentEl.textContent = results.totalRepayment.toLocaleString('en-MY', currencyOptions);
        totalInterestEl.textContent = results.totalInterest.toLocaleString('en-MY', currencyOptions);
    }

    // --- Function to reset the display ---
    function resetResults() {
        monthlyPaymentEl.textContent = 'RM 0.00';
        totalRepaymentEl.textContent = 'RM 0.00';
        totalInterestEl.textContent = 'RM 0.00';
    }

    // --- Add event listeners for real-time calculation ---
    // The 'input' event triggers immediately after the value of an element has changed.
    [loanAmountEl, interestRateEl, loanTenureEl].forEach(el => {
        el.addEventListener('input', calculateLoan);
    });

    // Initial calculation on page load (if there are preset values)
    calculateLoan(); 
});
