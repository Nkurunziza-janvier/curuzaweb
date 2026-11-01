import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

interface ApiBody<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

interface AuthPayload {
  token: string;
  user: {
    business: {
      id: string;
      slug: string;
      industryKey: string;
      subtype: string;
      capabilities: string[];
    };
  };
}

describe("business capabilities catalog and onboarding", () => {
  const suffix = randomUUID();
  const email = `capabilities-${suffix}@example.com`;
  let businessId = "";
  let token = "";
  let businessSlug = "";

  afterAll(async () => {
    if (businessId) await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("publishes the catalog of industries, subtypes, and capabilities", async () => {
    const response = await request(app).get("/api/public/business-catalog");
    expect(response.status).toBe(200);
    const body = response.body as ApiBody<{
      industries: Array<{ key: string; recommended: string[]; subtypes: Array<{ key: string }> }>;
      capabilities: Array<{ key: string; status: string; dependsOn?: string[] }>;
    }>;
    expect(body.data.industries.length).toBeGreaterThan(0);
    expect(body.data.industries.find((industry) => industry.key === "retail")?.recommended).toContain("products");
    expect(body.data.capabilities.find((capability) => capability.key === "product_orders")?.dependsOn).toEqual(expect.arrayContaining(["products"]));
    expect(body.data.capabilities.find((capability) => capability.key === "inventory")?.status).toBe("planned");
  });

  it("requires a phone or WhatsApp number at registration", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "No Contact Owner",
      email: `no-contact-${suffix}@example.com`,
      password: "secure-test-password",
      businessName: `No Contact ${suffix.slice(0, 6)}`,
      industryKey: "other",
      subtype: "Mobile repair lab",
    });
    expect(response.status).toBe(422);
    expect((response.body as ApiBody<unknown>).success).toBe(false);
  });

  it("registers a business with a custom subtype and recommended capabilities", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Capabilities Owner",
      email,
      password: "secure-test-password",
      businessName: `Custom Workshop ${suffix.slice(0, 6)}`,
      industryKey: "other",
      subtype: "Mobile repair lab",
      phone: "+250788000005",
      capabilities: ["services", "appointments", "whatsapp_contact"],
    });
    expect(response.status).toBe(201);
    const data = (response.body as ApiBody<AuthPayload>).data;
    token = data.token;
    businessId = data.user.business.id;
    businessSlug = data.user.business.slug;
    expect(data.user.business.industryKey).toBe("other");
    expect(data.user.business.subtype).toBe("Mobile repair lab");
    expect(data.user.business.capabilities.length).toBeGreaterThan(0);
  });

  it("normalizes dependencies for selected capabilities", async () => {
    const response = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ capabilities: ["product_orders"] });
    expect(response.status).toBe(200);
    const body = response.body as ApiBody<{ capabilities: string[] }>;
    expect(body.data.capabilities).toEqual(expect.arrayContaining(["products", "product_orders", "pickup"]));
  });

  it("rejects capabilities that are not available yet", async () => {
    const response = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ capabilities: ["inventory"] });
    expect(response.status).toBe(422);
    expect((response.body as ApiBody<unknown>).success).toBe(false);
  });

  it("publishes a capability-driven public page", async () => {
    const update = await request(app)
      .patch(`/api/businesses/${businessId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        capabilities: ["services", "appointments", "whatsapp_contact"],
        onboardingStep: 5,
        tagline: "Repairs wherever you are",
      });
    expect(update.status).toBe(200);

    const publish = await request(app)
      .post(`/api/businesses/${businessId}/publish`)
      .set("Authorization", `Bearer ${token}`);
    expect(publish.status).toBe(200);

    const publicPage = await request(app).get(`/api/public/businesses/${businessSlug}`);
    expect(publicPage.status).toBe(200);
    const body = publicPage.body as ApiBody<{ capabilities: string[]; products: unknown[]; services: unknown[]; requestTemplate: unknown }>;
    expect(body.data.capabilities).toEqual(expect.arrayContaining(["services", "appointments"]));
    expect(body.data.products).toEqual([]);
    expect(body.data.requestTemplate).toBeNull();
  });
});
