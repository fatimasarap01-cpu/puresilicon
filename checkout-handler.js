async function proceedToCheckout(btn) {
  var cart = (function() { try { return JSON.parse(localStorage.getItem('psCart') || '[]'); } catch(e) { return []; } })();
  if (!cart.length) return;

  var original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    var res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(function(i) { return { name: i.name, price: i.price, qty: i.qty }; }) }),
    });
    var data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Checkout error: ' + (data.error || 'Please try again.'));
      btn.disabled = false;
      btn.textContent = original;
    }
  } catch (e) {
    alert('Network error. Please try again.');
    btn.disabled = false;
    btn.textContent = original;
  }
}
