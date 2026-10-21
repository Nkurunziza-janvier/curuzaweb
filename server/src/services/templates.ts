import { Prisma, QuestionType } from "@prisma/client";
import { prisma } from "../config/prisma.js";

const questionsByType: Record<string, Array<{ label: string; type: QuestionType; required: boolean; options?: string[] }>> = {
  mechanic: [
    { label: "What do you need?", type: "SELECT", required: true, options: ["Repair", "Maintenance", "Inspection", "Other"] },
    { label: "Vehicle type", type: "TEXT", required: false },
    { label: "Vehicle model", type: "TEXT", required: false },
    { label: "Describe the problem", type: "TEXTAREA", required: false },
    { label: "Upload photo", type: "FILE", required: false },
    { label: "Location", type: "LOCATION", required: false },
    { label: "Preferred date", type: "DATE", required: false },
  ],
  restaurant: [
    { label: "What would you like?", type: "TEXT", required: true },
    { label: "Quantity", type: "NUMBER", required: false },
    { label: "Pickup or delivery", type: "SELECT", required: false, options: ["Pickup", "Delivery"] },
    { label: "Location", type: "LOCATION", required: false },
    { label: "Preferred time", type: "TIME", required: false },
    { label: "Special instructions", type: "TEXTAREA", required: false },
  ],
  photographer: [
    { label: "Event type", type: "TEXT", required: true },
    { label: "Event date", type: "DATE", required: false },
    { label: "Event location", type: "LOCATION", required: false },
    { label: "Number of people", type: "NUMBER", required: false },
    { label: "Package", type: "SELECT", required: false, options: ["Essential", "Classic", "Premium"] },
    { label: "Budget", type: "NUMBER", required: false },
  ],
  construction: [
    { label: "Project type", type: "TEXT", required: true },
    { label: "Location", type: "LOCATION", required: false },
    { label: "Property size", type: "TEXT", required: false },
    { label: "Service required", type: "TEXTAREA", required: false },
    { label: "Budget", type: "NUMBER", required: false },
    { label: "Photos", type: "FILE", required: false },
  ],
  furniture: [
    { label: "Product", type: "TEXT", required: true },
    { label: "Quantity", type: "NUMBER", required: false },
    { label: "Size", type: "TEXT", required: false },
    { label: "Material", type: "TEXT", required: false },
    { label: "Customization", type: "TEXTAREA", required: false },
    { label: "Delivery", type: "LOCATION", required: false },
  ],
};

export async function createDefaultTemplate(businessId: string, businessType: string, database: Prisma.TransactionClient | typeof prisma = prisma) {
  const key = businessType.toLowerCase();
  const questions = questionsByType[key] ?? [
    { label: "What do you need?", type: "TEXT" as const, required: true },
    { label: "Preferred date", type: "DATE" as const, required: false },
    { label: "Location", type: "LOCATION" as const, required: false },
  ];
  return database.requestTemplate.create({
    data: {
      businessId,
      name: `${businessType} request`,
      businessType,
      questions: { create: questions.map((question, sortOrder) => ({ ...question, sortOrder })) },
    },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
}
