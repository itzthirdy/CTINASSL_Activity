import assert from "node:assert/strict";
import http from "node:http";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import { signAuthToken } from "../src/middleware/authMiddleware.js";
import { sanitizeMongoPayload } from "../src/middleware/securityMiddleware.js";
import { AuditLogModel } from "../src/models/AuditLog.js";
import { BasketModel } from "../src/models/Basket.js";
import { OrderModel } from "../src/models/Order.js";
import { ProductModel } from "../src/models/Product.js";
import { ReviewModel } from "../src/models/Review.js";
import { serializeUser, UserModel } from "../src/models/User.js";

describe("Sole Purpose Backend Middleware, Models & API", () => {
  let server: http.Server;
  let baseUrl = "";

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      throw new Error("Failed to bind test HTTP server");
    }
    baseUrl = `http://127.0.0.1:${addr.port}/api`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("GET /api/health returns 200 and cross-origin resource header", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    assert.equal(
      res.headers.get("cross-origin-resource-policy"),
      "cross-origin"
    );
    const body = (await res.json()) as { status: string; app: string };
    assert.equal(body.status, "ok");
    assert.equal(body.app, "Sole Purpose API");
  });

  it("blocks unauthenticated requests on protected user, basket, order, and audit endpoints", async () => {
    const endpoints = [
      { method: "GET", path: "/auth/me" },
      { method: "GET", path: "/users" },
      { method: "GET", path: "/basket" },
      { method: "GET", path: "/orders" },
      { method: "GET", path: "/audit-logs" },
      { method: "POST", path: "/products" },
      { method: "POST", path: "/products/upload" },
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, { method: ep.method });
      assert.equal(
        res.status,
        401,
        `Expected 401 for unauthenticated ${ep.method} ${ep.path}`
      );
    }
  });

  it("rejects invalid JWT tokens cleanly with 401", async () => {
    const res = await fetch(`${baseUrl}/audit-logs`, {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    assert.equal(res.status, 401);
  });

  it("sanitizeMongoPayload strips $ operators and dotted keys in-place", () => {
    const body = {
      username: "thirdy",
      $ne: "bypass",
      nested: { $gt: "", "profile.role": "admin", safe: 42 },
    };
    const req = { body, query: { $where: "1==1" }, params: { "a.b": "x" } };
    let nextCalled = false;
    sanitizeMongoPayload(req as never, {} as never, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal("$ne" in req.body, false);
    assert.equal("$gt" in req.body.nested, false);
    assert.equal("profile.role" in req.body.nested, false);
    assert.equal(req.body.username, "thirdy");
    assert.equal(req.body.nested.safe, 42);
    assert.equal("$where" in req.query, false);
    assert.equal("a.b" in req.params, false);
  });

  it("UserModel hides sensitive fields on toJSON and serializeUser maps likedShoeIds", () => {
    const productOid = new mongoose.Types.ObjectId();
    const userDoc = new UserModel({
      username: "tester",
      email: "tester@solepurpose.ph",
      password: "hashed-secret-value",
      role: "customer",
      likedProductIds: [productOid],
      resetOtpHash: "otp-hash",
      resetOtpExpiresAt: new Date(Date.now() + 60_000),
    });

    const rawJson = userDoc.toJSON() as Record<string, unknown>;
    assert.equal("password" in rawJson, false);
    assert.equal("resetOtpHash" in rawJson, false);
    assert.equal("resetOtpExpiresAt" in rawJson, false);

    // Populated likedProductIds resolves product slugs cleanly
    const serialized = serializeUser({
      _id: userDoc._id,
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
      likedProductIds: [{ _id: productOid, id: "ja-4-heat-check-ep" }],
      createdAt: new Date(),
    } as never);
    assert.deepEqual(serialized.likedProductIds, [String(productOid)]);
    assert.deepEqual(serialized.likedShoeIds, ["ja-4-heat-check-ep"]);
  });

  it("validates ObjectId references across Product, Basket, Review, Order, and AuditLog models", async () => {
    const userId = new mongoose.Types.ObjectId();
    const parentProdId = new mongoose.Types.ObjectId();
    const prodId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();

    const prod = new ProductModel({
      id: "caitlin-1-ep-royal",
      sku: "SLP-CC1-RY23",
      name: "Caitlin 1 EP 'Hyper Royal'",
      colorwayName: "Hyper Royal",
      modelGroup: "caitlin-1-ep",
      parentProductId: parentProdId,
      createdBy: userId,
      category: "Basketball Shoes",
      price: 7995,
      stock: 10,
      angles: { lateral: "/shoes/nike3.avif" },
    });
    await prod.validate();
    assert.ok(prod.parentProductId instanceof mongoose.Types.ObjectId);
    assert.ok(prod.createdBy instanceof mongoose.Types.ObjectId);

    const basket = new BasketModel({
      userId,
      items: [{ productId: prodId, shoeId: prod.id, size: "US 9", quantity: 2 }],
    });
    await basket.validate();
    assert.ok(basket.userId instanceof mongoose.Types.ObjectId);

    const review = new ReviewModel({
      productId: prodId,
      userId,
      author: "tester",
      rating: 5,
      title: "Great grip",
      comment: "Clean court bite.",
      date: "Nov 25, 2026",
    });
    await review.validate();

    const order = new OrderModel({
      orderNumber: "SLP-2026-9999",
      userId,
      username: "tester",
      userEmail: "tester@solepurpose.ph",
      items: [
        {
          productId: prodId,
          shoeId: prod.id,
          shoeName: prod.name,
          size: "US 9",
          quantity: 1,
          price: 7995,
          imageUrl: "/shoes/nike3.avif",
        },
      ],
      totalAmount: 7995,
      paymentMethod: "COD",
      shippingAddress: {
        fullName: "Test User",
        phone: "09171234567",
        street: "123 Ayala Ave",
        city: "Makati",
        province: "Metro Manila",
        postalCode: "1226",
      },
    });
    await order.validate();

    const audit = new AuditLogModel({
      actorUserId: userId,
      actorUsername: "tester",
      action: "ORDER_CREATE",
      targetCollection: "orders",
      targetProductId: prodId,
      targetOrderId: orderId,
      status: "SUCCESS",
    });
    await audit.validate();

    // Ensure signAuthToken returns a non-empty JWT string
    const token = signAuthToken({ _id: userId, role: "admin" });
    assert.equal(token.split(".").length, 3);
  });
});
