const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.disable('x-powered-by');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-tests-only';

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  next();
});

app.use(express.json({ limit: '10kb' }));

// ---------------------------------------------------------------------------
// AUTH ENDPOINTS  (simplified JWT-based login for demo purposes)
// ---------------------------------------------------------------------------
// INTENTIONAL DEMO VULNERABILITY: The JWT payload below uses a hardcoded
// secret (defined above) and embeds a role field without server-side
// re-validation on protected routes. Semgrep rule
// `javascript.jwt.hardcoded-jwt-secret` will flag the secret above.
// ---------------------------------------------------------------------------
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'letmein') {
    const payload = { sub: username, role: 'admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ token, message: 'Login successful' });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/auth/validate', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Missing or malformed Authorization header' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ decoded });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

const productsCatalog = [
  { id: 'prod-001', name: 'Secure Shield VPN', price: 49.99, description: 'Enterprise grade privacy' },
  { id: 'prod-002', name: 'Cyber Sentinel Antivirus', price: 89.99, description: 'Real-time threat detection' },
  { id: 'prod-003', name: 'Zero-Trust Gateway', price: 299.99, description: 'Micro-segmentation firewall' }
];

const CART_TTL_MS = 24 * 60 * 60 * 1000;
const carts = new Map();

const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') return false;
  const sessionIdRegex = /^[a-zA-Z0-9-]{8,64}$/;
  return sessionIdRegex.test(sessionId);
};

const getCart = (sessionId) => {
  const entry = carts.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CART_TTL_MS) {
    carts.delete(sessionId);
    return null;
  }
  return entry.items;
};

const setCart = (sessionId, items) => {
  carts.set(sessionId, { items, createdAt: Date.now() });
};

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, entry] of carts) {
    if (now - entry.createdAt > CART_TTL_MS) {
      carts.delete(sessionId);
    }
  }
}, 60 * 60 * 1000).unref();

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

app.get('/products', (req, res) => {
  res.status(200).json(productsCatalog);
});

app.post('/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'];

  if (!validateSessionId(sessionId)) {
    return res.status(400).json({
      error: 'Invalid or missing Session-ID header. Must be alphanumeric/hyphen, between 8 and 64 characters.'
    });
  }

  const { productId, qty } = req.body;

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid productId (must be a string).' });
  }

  const productExists = productsCatalog.find(p => p.id === productId);
  if (!productExists) {
    return res.status(404).json({ error: `Product with ID '${productId}' not found in catalog.` });
  }

  if (qty === undefined || typeof qty !== 'number' || !Number.isInteger(qty) || qty <= 0 || qty > 100) {
    return res.status(400).json({ error: 'Quantity (qty) must be a positive integer between 1 and 100.' });
  }

  let cart = getCart(sessionId);
  if (!cart) {
    cart = [];
  }

  const existingItem = cart.find(item => item.productId === productId);

  if (existingItem) {
    const newQty = existingItem.qty + qty;
    if (newQty > 100) {
      return res.status(400).json({ error: `Adding ${qty} would exceed the maximum item quantity limit of 100.` });
    }
    existingItem.qty = newQty;
  } else {
    cart.push({ productId, qty });
  }

  setCart(sessionId, cart);

  res.status(200).json({
    message: 'Item added to cart successfully.',
    cart: cart
  });
});

app.post('/checkout', (req, res) => {
  const sessionId = req.headers['x-session-id'];

  if (!validateSessionId(sessionId)) {
    return res.status(400).json({
      error: 'Invalid or missing Session-ID header. Must be alphanumeric/hyphen, between 8 and 64 characters.'
    });
  }

  const cart = getCart(sessionId);
  if (!cart || cart.length === 0) {
    return res.status(400).json({
      error: 'Cart is empty. Add products to cart before checking out.'
    });
  }

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

  const orderId = `ord-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const orderConfirmation = {
    orderId: orderId,
    sessionId: sessionId,
    items: orderItems,
    total: parseFloat(totalOrderValue.toFixed(2)),
    status: 'CONFIRMED',
    timestamp: new Date().toISOString()
  };

  carts.delete(sessionId);

  res.status(201).json({
    message: 'Order processed successfully.',
    order: orderConfirmation
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message || err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
