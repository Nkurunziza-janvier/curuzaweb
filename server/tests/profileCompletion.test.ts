import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { calculateProfileCompletion, type ProfileCompletionBusiness } from "../src/config/profileCompletion.js";
import { prisma } from "../src/config/prisma.js";

interface ApiBody<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

interface AuthPayload {
  token: string;
  user: { business: { id: string; slug: string } };
}

interface CompletionPayload {
  percentage: number;
  applicableWeight: number;
  recommendations: Array<{ key: string }>;
  fields: Array<{ key: string; section: string; done: boolean }>;
}

const baseBusiness: ProfileCompletionBusiness = {
  name: "Fresh Cuts",
  industryKey: "beauty",
  subtype: "barbershop",
  description: "",
  phone: "+250788000001",
  whatsapp: null,
  email: null,
  city: null,
  address: null,
  logoUrl: null,
  coverImageUrl: null,
  profileData: {},
};

describe("profile completion", () => {
  const suffix = randomUUID();
  const email = `profile-completion-${suffix}@example.com`;
  let businessId = "";
  let token = "";

  afterAll(async () => {
    if (businessId) await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it("scores only saved profile information and recommends missing sections", () => {
    const result = calculateProfileCompletion(baseBusiness);
    expect(result.percentage).toBeGreaterThan(0);
    expect(result.percentage).toBeLessThan(100);
    expect(result.recommendations.map((item) => item.key)).toEqual(expect.arrayContaining(["description", "logo", "cover", "detail:specialties"]));
    expect(result.fields.find((field) => field.key === "contact")?.done).toBe(true);
    expect(result.fields.find((field) => field.key === "location")).toBeTruthy();
  });

  it("does not require a physical location for online professional businesses", () => {
    const result = calculateProfileCompletion({
      ...baseBusiness,
      name: "Remote Studio",
      industryKey: "technology",
      subtype: "software_company",
      phone: null,
      email: "hello@example.com",
    });
    expect(result.fields.find((field) => field.key === "location")).toBeUndefined();
    expect(result.applicableWeight).toBe(90);
    expect(result.percentage).toBeGreaterThan(0);
  });

  it("uses business-specific details for hotels and retail shops", () => {
    const hotel = calculateProfileCompletion({ ...baseBusiness, industryKey: "accommodation", subtype: "hotel" });
    const retail = calculateProfileCompletion({ ...baseBusiness, industryKey: "retail", subtype: "clothing" });
    expect(hotel.recommendations.map((item) => item.key)).toEqual(expect.arrayContaining(["detail:checkInTime", "detail:checkOutTime", "detail:amenities"]));
    expect(retail.recommendations.map((item) => item.key)).toEqual(expect.arrayContaining(["detail:productCategories"]));
    expect(retail.recommendations.map((item) => item.key)).not.toContain("detail:checkInTime");
  });

  it("returns persisted completion for the owner and updates after profile saves", async () => {
    const registration = await request(app).post("/api/auth/register").send({
      name: "Completion Owner",
      email,
      password: "secure-test-password",
      businessName: `Completion Barbers ${suffix.slice(0, 6)}`,
      industryKey: "beauty",
      subtype: "barbershop",
      phone: "+250788000002",
    });
    expect(registration.status).toBe(201);
    const auth = (registration.body as ApiBody<AuthPayload>).data;
    token = auth.token;
    businessId = auth.user.business.id;

    const before = await request(app).get(`/api/businesses/${businessId}/profile-completion`).set("Authorization", `Bearer ${token}`);
    expect(before.status).toBe(200);
    const beforeCompletion = (before.body as ApiBody<CompletionPayload>).data;
    expect(beforeCompletion.percentage).toBeGreaterThan(0);
    expect(beforeCompletion.percentage).toBeLessThan(100);

    const update = await request(app).patch(`/api/businesses/${businessId}`).set("Authorization", `Bearer ${token}`).send({
      description: "Fresh cuts, beard trims and grooming for the whole family.",
      logoUrl: "https://example.com/logo.png",
      city: "Kigali",
      profileData: { specialties: "Fades, beard trims and hot towel shaves" },
    });
    expect(update.status).toBe(200);

    const after = await request(app).get(`/api/businesses/${businessId}/profile-completion`).set("Authorization", `Bearer ${token}`);
    expect(after.status).toBe(200);
    const afterCompletion = (after.body as ApiBody<CompletionPayload>).data;
    expect(afterCompletion.percentage).toBeGreaterThan(beforeCompletion.percentage);
    expect(afterCompletion.fields.find((field) => field.key === "description")?.done).toBe(true);
    expect(afterCompletion.fields.find((field) => field.key === "detail:specialties")?.done).toBe(true);
  });

  it("does not expose completion for another owner's business", async () => {
    const otherEmail = `profile-other-${suffix}@example.com`;
    const registration = await request(app).post("/api/auth/register").send({
      name: "Other Owner",
      email: otherEmail,
      password: "secure-test-password",
      businessName: `Other Business ${suffix.slice(0, 6)}`,
      industryKey: "retail",
      subtype: "clothing",
      phone: "+250788000003",
    });
    expect(registration.status).toBe(201);
    const other = (registration.body as ApiBody<AuthPayload>).data;
    const response = await request(app).get(`/api/businesses/${businessId}/profile-completion`).set("Authorization", `Bearer ${other.token}`);
    expect([403, 404]).toContain(response.status);
    await prisma.business.deleteMany({ where: { id: other.user.business.id } });
    await prisma.user.deleteMany({ where: { email: otherEmail } });
  });
});
