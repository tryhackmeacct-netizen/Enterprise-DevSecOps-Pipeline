const request = require('supertest');
const app = require('../src/app');

describe('E-commerce API Integration Tests', () => {
  const validSessionId = 'test-session-12345';
  const invalidSessionId = 'short';

  describe('GET /health', () => {
    it('should return UP and HTTP 200', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'UP');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /products', () => {
    it('should return the full in-memory product catalog', async () => {
      const res = await request(app).get('/products');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('price');
    });
  });

  describe('POST /cart', () => {
    it('should successfully add a valid product to cart', async () => {
      const res = await request(app)
        .post('/cart')
        .set('x-session-id', validSessionId)
        .send({
          productId: 'prod-001',
          qty: 2
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Item added to cart successfully.');
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart[0]).toEqual({ productId: 'prod-001', qty: 2 });
    });

    it('should fail validation when session ID header is missing', async () => {
      const res = await request(app)
        .post('/cart')
        .send({
          productId: 'prod-001',
          qty: 1
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Session-ID');
    });

    it('should fail validation when session ID is invalid', async () => {
      const res = await request(app)
        .post('/cart')
        .set('x-session-id', invalidSessionId)
        .send({
          productId: 'prod-001',
          qty: 1
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 404 if product does not exist in catalog', async () => {
      const res = await request(app)
        .post('/cart')
        .set('x-session-id', validSessionId)
        .send({
          productId: 'non-existent-product',
          qty: 1
        });
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should fail validation when quantity is negative or decimal', async () => {
      const res = await request(app)
        .post('/cart')
        .set('x-session-id', validSessionId)
        .send({
          productId: 'prod-001',
          qty: -5
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');

      const res2 = await request(app)
        .post('/cart')
        .set('x-session-id', validSessionId)
        .send({
          productId: 'prod-001',
          qty: 1.5
        });
      expect(res2.statusCode).toEqual(400);
    });

    it('should fail validation when quantity exceeds 100', async () => {
      const res = await request(app)
        .post('/cart')
        .set('x-session-id', validSessionId)
        .send({
          productId: 'prod-001',
          qty: 101
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('POST /checkout', () => {
    const checkoutSessionId = 'checkout-session-999';

    it('should fail validation when session cart is empty', async () => {
      const res = await request(app)
        .post('/checkout')
        .set('x-session-id', checkoutSessionId);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('empty');
    });

    it('should checkout successfully when cart is populated', async () => {
      // 1. Add item to cart
      await request(app)
        .post('/cart')
        .set('x-session-id', checkoutSessionId)
        .send({
          productId: 'prod-001',
          qty: 1
        });

      // 2. Checkout
      const res = await request(app)
        .post('/checkout')
        .set('x-session-id', checkoutSessionId);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Order processed successfully.');
      expect(res.body.order).toBeDefined();
      expect(res.body.order.sessionId).toEqual(checkoutSessionId);
      expect(res.body.order.items.length).toEqual(1);
      expect(res.body.order.total).toEqual(49.99);
      expect(res.body.order.status).toEqual('CONFIRMED');

      // 3. Verify that the cart was cleared by checking out again (should fail)
      const resRetry = await request(app)
        .post('/checkout')
        .set('x-session-id', checkoutSessionId);
      expect(resRetry.statusCode).toEqual(400);
    });
  });

  describe('Undefined Routes', () => {
    it('should return 404 for random endpoints', async () => {
      const res = await request(app).get('/invalid-route-path');
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Endpoint not found.');
    });
  });
});
