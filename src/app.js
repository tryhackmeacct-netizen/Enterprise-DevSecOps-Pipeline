const express = require('express');
const app = express();

// Security Headers & Settings
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  next();
});

// JSON Body Parser with strict payload size limit (Defense against DoS)
app.use(express.json({ limit: '10kb' }));

// Hardcoded in-memory product catalog (Read-only)
const productsCatalog = [
  { id: 'prod-001', name: 'Secure Shield VPN', price: 49.99, description: 'Enterprise grade privacy' },
  { id: 'prod-002', name: 'Cyber Sentinel Antivirus', price: 89.99, description: 'Real-time threat detection' },
  { id: 'prod-003', name: 'Zero-Trust Gateway', price: 299.99, description: 'Micro-segmentation firewall' }
];

// In-memory cart storage keyed by sessionId
// Maps: sessionId -> Array of { productId, qty }
const carts = new Map();

// Helper validator for sessionId
const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') return false;
  // Limit character set to alphanumeric and hyphens, max length 64 chars
  const sessionIdRegex = /^[a-zA-Z0-9-]{8,64}$/;
  return sessionIdRegex.test(sessionId);
};

/**
 * @api {get} /health Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

/**
 * @api {get} /products Get hardcoded product catalog
 */
app.get('/products', (req, res) => {
  res.status(200).json(productsCatalog);
});

/**
 * @api {post} /cart Add product to in-memory cart
 */
app.post('/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'];

  if (!validateSessionId(sessionId)) {
    return res.status(400).json({
      error: 'Invalid or missing Session-ID header. Must be alphanumeric/hyphen, between 8 and 64 characters.'
    });
  }

  const { productId, qty } = req.body;

  // Validate productId
  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid productId (must be a string).' });
  }

  const productExists = productsCatalog.find(p => p.id === productId);
  if (!productExists) {
    return res.status(404).json({ error: `Product with ID '${productId}' not found in catalog.` });
  }

  // Validate qty
  if (qty === undefined || typeof qty !== 'number' || !Number.isInteger(qty) || qty <= 0 || qty > 100) {
    return res.status(400).json({ error: 'Quantity (qty) must be a positive integer between 1 and 100.' });
  }

  // Retrieve or initialize cart for session
  if (!carts.has(sessionId)) {
    carts.set(sessionId, []);
  }

  const cart = carts.get(sessionId);
  const existingItem = cart.find(item => item.productId === productId);

  if (existingItem) {
    // Prevent cart quantities exceeding max limits
    const newQty = existingItem.qty + qty;
    if (newQty > 100) {
      return res.status(400).json({ error: `Adding ${qty} would exceed the maximum item quantity limit of 100.` });
    }
    existingItem.qty = newQty;
  } else {
    cart.push({ productId, qty });
  }

  res.status(200).json({
    message: 'Item added to cart successfully.',
    cart: cart
  });
});

/**
 * @api {post} /checkout Checkout cart and receive order confirmation
 */
app.post('/checkout', (req, res) => {
  const sessionId = req.headers['x-session-id'];

  if (!validateSessionId(sessionId)) {
    return res.status(400).json({
      error: 'Invalid or missing Session-ID header. Must be alphanumeric/hyphen, between 8 and 64 characters.'
    });
  }

  const cart = carts.get(sessionId);
  if (!cart || cart.length === 0) {
    return res.status(400).json({
      error: 'Cart is empty. Add products to cart before checking out.'
    });
  }

  // Calculate total and compile order items
  let totalOrderValue = 0;
  const orderItems = cart.map(cartItem => {
    const product = productsCatalog.find(p => p.id === cartItem.productId);
    const subtotal = product.price * cartItem.qty;
    totalOrderValue += subtotal;
    return {
      productId: cartItem.productId,
      name: product.name,
      price: product.price,
      qty: cartItem.qty,
      subtotal: parseFloat(subtotal.toFixed(2))
    };
  });

  // Mock order confirmation details
  const orderId = `ord-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const orderConfirmation = {
    orderId: orderId,
    sessionId: sessionId,
    items: orderItems,
    total: parseFloat(totalOrderValue.toFixed(2)),
    status: 'CONFIRMED',
    timestamp: new Date().toISOString()
  };

  // Clear cart after successful checkout
  carts.delete(sessionId);

  res.status(201).json({
    message: 'Order processed successfully.',
    order: orderConfirmation
  });
});

// Catch-all route handler for undefined paths (Defends against information leakage)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

module.exports = app;
