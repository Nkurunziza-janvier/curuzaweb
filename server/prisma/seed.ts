import "dotenv/config";
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("UbucuruziDemo2026!", 12);
const sampleBusinesses = [
  { name: "Afrinaija Pots Restaurant", slug: "afrinai-ja", category: "Restaurant", city: "Kigali", email: "hello@afrinai-japots.rw", phone: "+250788123456", description: "A warm table for authentic Nigerian favourites, family recipes, and memorable catering in Kigali." },
  { name: "Kigali AutoCare", slug: "kigali-autocare", category: "Mechanic", city: "Kigali", email: "hello@kigaliautocare.rw", phone: "+250788123457", description: "Reliable diagnostics, maintenance, and vehicle repairs from experienced local mechanics." },
  { name: "Glow Beauty Studio", slug: "glow-beauty-studio", category: "Beauty", city: "Kigali", email: "hello@glowbeauty.rw", phone: "+250788123458", description: "Thoughtful beauty, hair, and wellness services tailored to you." },
  { name: "Horizon Construction", slug: "horizon-construction", category: "Construction", city: "Kigali", email: "hello@horizonconstruction.rw", phone: "+250788123459", description: "Construction, renovation, and project management for homes and businesses." },
  { name: "Rwanda Furniture House", slug: "rwanda-furniture-house", category: "Furniture", city: "Kigali", email: "hello@rwandafurniture.rw", phone: "+250788123460", description: "Locally crafted furniture, made-to-measure pieces, and delivery across Kigali." },
  { name: "PixelFrame Photography", slug: "pixelframe-photography", category: "Photographer", city: "Kigali", email: "hello@pixelframe.rw", phone: "+250788123461", description: "Wedding, portrait, and commercial photography that captures the moments that matter." },
  { name: "Kigali Event Decor", slug: "kigali-event-decor", category: "Events", city: "Kigali", email: "hello@kigalidecor.rw", phone: "+250788123462", description: "Event styling, floral design, and decor for celebrations of every size." },
  { name: "Prime Real Estate", slug: "prime-real-estate", category: "Real estate", city: "Kigali", email: "hello@primerealestate.rw", phone: "+250788123463", description: "Local property sales and rentals with clear advice and responsive service." },
  { name: "Kigali Clean Services", slug: "kigali-clean-services", category: "Home services", city: "Kigali", email: "hello@kigaliclean.rw", phone: "+250788123464", description: "Trusted home and office cleaning with flexible schedules and transparent quotes." },
  { name: "Urban Fashion Rwanda", slug: "urban-fashion-rwanda", category: "Retail", city: "Kigali", email: "hello@urbanfashion.rw", phone: "+250788123465", description: "Modern Rwandan fashion, curated pieces, and custom styling for every occasion." },
];

async function main() {
  const demo = await prisma.user.upsert({
    where: { email: "demo@ubucuruzihub.com" },
    update: { name: "Amina Demo", passwordHash },
    create: { name: "Amina Demo", email: "demo@ubucuruzihub.com", passwordHash, role: "BUSINESS_OWNER" },
  });
  await prisma.user.upsert({
    where: { email: "admin@ubucuruzihub.com" },
    update: { name: "UbucuruziHub Admin", passwordHash, role: "ADMIN" },
    create: { name: "UbucuruziHub Admin", email: "admin@ubucuruzihub.com", passwordHash, role: "ADMIN" },
  });

  const owners = new Map<string, string>([[sampleBusinesses[0]!.slug, demo.id]]);
  for (const item of sampleBusinesses.slice(1)) {
    const owner = await prisma.user.upsert({
      where: { email: `owner+${item.slug}@ubucuruzihub.com` },
      update: { passwordHash },
      create: { name: `${item.name} Owner`, email: `owner+${item.slug}@ubucuruzihub.com`, passwordHash, role: "BUSINESS_OWNER" },
    });
    owners.set(item.slug, owner.id);
  }

  const seeded: Array<{ id: string; slug: string; name: string }> = [];
  for (const [index, item] of sampleBusinesses.entries()) {
    const business = await prisma.business.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        category: item.category,
        description: item.description,
        phone: item.phone,
        whatsapp: item.phone,
        email: item.email,
        city: item.city,
        address: `${index + 1} KN ${index + 10} Street`,
        country: "Rwanda",
        isPublished: true,
        canPublishProducts: true,
        productAccessExpiresAt: new Date(Date.now() + 365 * 86400000),
        coverImageUrl: "https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?auto=format&fit=crop&w=1200&q=85",
      },
      create: {
        ownerId: owners.get(item.slug)!,
        name: item.name,
        slug: item.slug,
        category: item.category,
        description: item.description,
        phone: item.phone,
        whatsapp: item.phone,
        email: item.email,
        city: item.city,
        address: `${index + 1} KN ${index + 10} Street`,
        country: "Rwanda",
        isPublished: true,
        canPublishProducts: true,
        productAccessExpiresAt: new Date(Date.now() + 365 * 86400000),
        coverImageUrl: "https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?auto=format&fit=crop&w=1200&q=85",
      },
    });
    seeded.push({ id: business.id, slug: business.slug, name: business.name });
    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { businessId: business.id } }),
      prisma.availabilityBlock.deleteMany({ where: { businessId: business.id } }),
      prisma.availabilityWindow.deleteMany({ where: { businessId: business.id } }),
      prisma.bookingSettings.deleteMany({ where: { businessId: business.id } }),
      prisma.customerRequest.deleteMany({ where: { businessId: business.id } }),
      prisma.requestTemplate.deleteMany({ where: { businessId: business.id } }),
      prisma.businessEvent.deleteMany({ where: { businessId: business.id } }),
      prisma.product.deleteMany({ where: { businessId: business.id } }),
      prisma.service.deleteMany({ where: { businessId: business.id } }),
      prisma.offer.deleteMany({ where: { businessId: business.id } }),
      prisma.review.deleteMany({ where: { businessId: business.id } }),
    ]);

    await prisma.product.createMany({
      data: [
        { businessId: business.id, name: `${item.category} popular choice`, description: `A customer favourite from ${item.name}.`, price: new Prisma.Decimal(18500 + index * 1200), currency: "RWF", category: "Popular", sortOrder: 0 },
        { businessId: business.id, name: "Custom option", description: "Tell us what you are looking for.", price: new Prisma.Decimal(24000 + index * 1500), currency: "RWF", category: "Featured", sortOrder: 1 },
      ],
    });
    await prisma.service.create({
      data: {
        businessId: business.id,
        name: `${item.category} consultation`,
        description: `A focused appointment with a professional from ${item.name}.`,
        startingPrice: new Prisma.Decimal(25000 + index * 5000),
        currency: "RWF",
        category: item.category,
        duration: "60 minutes",
        durationMinutes: 60,
        bufferMinutes: 15,
        capacity: 1,
        isBookable: true,
      },
    });
    await prisma.bookingSettings.create({
      data: {
        businessId: business.id,
        isEnabled: true,
        timezone: "Africa/Kigali",
        slotIntervalMinutes: 30,
        minNoticeMinutes: 120,
        maxAdvanceDays: 60,
        cancellationCutoffMinutes: 240,
        requireConfirmation: true,
      },
    });
    await prisma.availabilityWindow.createMany({
      data: [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
        { businessId: business.id, weekday, startMinute: 9 * 60, endMinute: 12 * 60 },
        { businessId: business.id, weekday, startMinute: 14 * 60, endMinute: 17 * 60 },
      ]),
    });
    await prisma.offer.create({
      data: { businessId: business.id, title: "Welcome offer", description: "A special offer for new customers.", discountType: "PERCENTAGE", discountValue: new Prisma.Decimal(10), startsAt: new Date(Date.now() - 2 * 86400000), endsAt: new Date(Date.now() + 30 * 86400000), isActive: true },
    });
    await prisma.review.createMany({
      data: [
        { businessId: business.id, customerName: "Claudine M.", rating: 5, comment: `Excellent service and a wonderful experience at ${item.name}.` },
        { businessId: business.id, customerName: "David K.", rating: 4, comment: "Friendly, professional, and easy to recommend." },
      ],
    });

    const templateQuestions = questionsFor(item.category);
    await prisma.requestTemplate.create({
      data: {
        businessId: business.id,
        name: `${item.category} request`,
        businessType: item.category,
        questions: { create: templateQuestions.map((question, sortOrder) => ({ ...question, sortOrder })) },
      },
    });
  }

  const restaurant = seeded[0]!;
  const existingRequest = await prisma.customerRequest.create({
    data: {
      businessId: restaurant.id,
      requestNumber: "PENDING-SEED",
      customerName: "Aline Mukamana",
      customerPhone: "+250788765432",
      customerWhatsapp: "+250788765432",
      requestType: "Wedding catering",
      description: "Catering for an outdoor wedding with 150 guests.",
      location: "Kimihurura, Kigali",
      budget: new Prisma.Decimal(980000),
      status: "NEW",
    },
  });
  const requestNumber = `REQ-${String(existingRequest.sequence).padStart(6, "0")}`;
  await prisma.customerRequest.update({ where: { id: existingRequest.id }, data: { requestNumber } });
  const sampleQuote = await prisma.quote.create({
    data: {
      businessId: restaurant.id,
      requestId: existingRequest.id,
      quoteNumber: "PENDING-SEED",
      subtotal: new Prisma.Decimal(850000),
      discount: new Prisma.Decimal(0),
      total: new Prisma.Decimal(850000),
      currency: "RWF",
      validityDays: 7,
      validUntil: new Date(Date.now() + 7 * 86400000),
      notes: "Thank you for considering Afrinaija Pots. This quote includes event setup and a dedicated coordinator.",
      status: "SENT",
      sentAt: new Date(),
      items: {
        create: [
          { name: "Premium catering menu", quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(500000), total: new Prisma.Decimal(500000), sortOrder: 0 },
          { name: "Tables and seating", quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(250000), total: new Prisma.Decimal(250000), sortOrder: 1 },
          { name: "Transport and setup", quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(100000), total: new Prisma.Decimal(100000), sortOrder: 2 },
        ],
      },
    },
  });
  await prisma.quote.update({ where: { id: sampleQuote.id }, data: { quoteNumber: `QUO-${String(sampleQuote.sequence).padStart(6, "0")}` } });

  const eventTypes = ["PAGE_VIEW", "PAGE_VIEW", "PAGE_VIEW", "WHATSAPP_CLICK", "PHONE_CLICK", "DIRECTIONS_CLICK"] as const;
  await prisma.businessEvent.createMany({ data: eventTypes.map((eventType) => ({ businessId: restaurant.id, eventType })) });
  console.log(`Seeded ${seeded.length} businesses, products, services, offers, reviews, request templates, and demo request/quote.`);
  console.log("Demo login: demo@ubucuruzihub.com / UbucuruziDemo2026!");
  console.log("Admin login: admin@ubucuruzihub.com / UbucuruziDemo2026!");
}

function questionsFor(category: string): Array<{ label: string; type: "TEXT" | "TEXTAREA" | "NUMBER" | "SELECT" | "DATE" | "LOCATION"; required: boolean; options?: string[] }> {
  const templates: Record<string, Array<{ label: string; type: "TEXT" | "TEXTAREA" | "NUMBER" | "SELECT" | "DATE" | "LOCATION"; required: boolean; options?: string[] }>> = {
    Mechanic: [
      { label: "What do you need?", type: "SELECT", required: true, options: ["Repair", "Maintenance", "Inspection", "Other"] },
      { label: "Vehicle type", type: "TEXT", required: false },
      { label: "Vehicle model", type: "TEXT", required: false },
      { label: "Describe the problem", type: "TEXTAREA", required: false },
      { label: "Location", type: "LOCATION", required: false },
      { label: "Preferred date", type: "DATE", required: false },
    ],
    Restaurant: [
      { label: "What would you like?", type: "TEXT", required: true },
      { label: "Quantity", type: "NUMBER", required: false },
      { label: "Pickup or delivery", type: "SELECT", required: false, options: ["Pickup", "Delivery"] },
      { label: "Location", type: "LOCATION", required: false },
      { label: "Special instructions", type: "TEXTAREA", required: false },
    ],
    Photographer: [
      { label: "Event type", type: "TEXT", required: true },
      { label: "Event date", type: "DATE", required: false },
      { label: "Event location", type: "LOCATION", required: false },
      { label: "Number of people", type: "NUMBER", required: false },
    ],
    Construction: [
      { label: "Project type", type: "TEXT", required: true },
      { label: "Location", type: "LOCATION", required: false },
      { label: "Service required", type: "TEXTAREA", required: false },
      { label: "Budget", type: "NUMBER", required: false },
    ],
    Furniture: [
      { label: "Product", type: "TEXT", required: true },
      { label: "Quantity", type: "NUMBER", required: false },
      { label: "Material", type: "TEXT", required: false },
      { label: "Customization", type: "TEXTAREA", required: false },
      { label: "Delivery location", type: "LOCATION", required: false },
    ],
  };
  return templates[category] ?? [
    { label: "What service do you need?", type: "TEXT", required: true },
    { label: "Anything that would help us prepare?", type: "TEXTAREA", required: false },
    { label: "Preferred date", type: "DATE", required: false },
    { label: "Location", type: "LOCATION", required: false },
  ];
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
