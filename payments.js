// Simple payments helper for Premium upgrade
// Uses a Stripe Payment Link or any hosted checkout URL
// Configure via localStorage.setItem('lockin_payment_link', 'https://buy.stripe.com/your_link')
// Optional: localStorage.setItem('lockin_billing_portal', 'https://billing.stripe.com/p/session/<id>')

(function paymentsInit(){
  try {
    // Show a basic toast if returning from checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get('premium') === 'success') {
      setTimeout(() => alert('✅ Payment received. Premium will activate shortly. If not, please refresh or contact support.'), 300);
    } else if (params.get('premium') === 'cancel') {
      setTimeout(() => alert('Payment canceled.'), 300);
    }
  } catch (_) {}
})();

function startPremiumCheckout() {
  try {
    const url = localStorage.getItem('lockin_payment_link');
    if (!url) {
      alert('Payment link is not configured. Set localStorage key lockin_payment_link to your Stripe Payment Link.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  } catch (e) {
    alert('Unable to start checkout.');
  }
}

function openBillingPortal() {
  try {
    const url = localStorage.getItem('lockin_billing_portal');
    if (!url) {
      alert('Billing portal is not configured. Set localStorage key lockin_billing_portal to your portal URL.');
      return;
    }
    window.open(url, '_blank', 'noopener');
  } catch (e) {
    alert('Unable to open billing portal.');
  }
}

window.startPremiumCheckout = startPremiumCheckout;
window.openBillingPortal = openBillingPortal;
