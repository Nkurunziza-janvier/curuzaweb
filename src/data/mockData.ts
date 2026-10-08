import type { Analytics, Business, Quote, Request } from "../types";

const foodOne = "https://images.unsplash.com/photo-1665333048952-a3ee97714c6b?auto=format&fit=crop&w=1200&q=85";
const foodTwo = "https://images.unsplash.com/photo-1765338915553-6e02fe63ff4f?auto=format&fit=crop&w=900&q=80";
const foodThree = "https://images.unsplash.com/photo-1783408356251-f4953f943bb2?auto=format&fit=crop&w=900&q=80";
const ownerPhoto = "https://images.unsplash.com/photo-1765648764078-dfacb54752e5?auto=format&fit=crop&w=1000&q=80";

export const business: Business = {
  id: "biz-1",
  slug: "afrinai-ja",
  name: "Afrinaija Pots",
  category: { id: "restaurant", name: "African restaurant", icon: "Utensils" },
  profile: {
    tagline: "Bold West African flavour, made with heart.",
    description: "A warm table for authentic Nigerian favourites, family recipes, and memorable catering in the heart of Kigali.",
    location: "KG 13 Ave, Kimihurura, Kigali",
    hours: "Open today · 11:00–22:00",
    isOpen: true,
    logo: "AP",
    coverImage: foodOne,
    gallery: [foodOne, foodTwo, foodThree],
    rating: 4.8,
    reviewCount: 126,
    verified: true,
  },
  phone: "+250 788 123 456",
  whatsapp: "+250 788 123 456",
  email: "hello@afrinai-japots.rw",
  actions: [
    { type: "order", title: "Order food", description: "Browse the menu and order for pickup or delivery.", enabled: true },
    { type: "quote", title: "Request catering", description: "Tell us about your event and get a tailored quote.", enabled: true },
    { type: "book", title: "Book a table", description: "Reserve a table for your next meal or celebration.", enabled: true },
    { type: "question", title: "Ask a question", description: "Dietary needs or a special request? Ask us.", enabled: true },
    { type: "directions", title: "Get directions", description: "Find the easiest route to our Kimihurura location.", enabled: true },
    { type: "pay", title: "Pay securely", description: "Complete an approved order or quote payment.", enabled: true },
  ],
  products: [
    { id: "p1", name: "Jollof Celebration Pot", description: "Smoky party jollof, grilled chicken, plantain and slaw.", price: 18500, image: foodThree, category: "Signature pots", available: true },
    { id: "p2", name: "Egusi & Pounded Yam", description: "Rich melon seed soup with tender beef and traditional yam.", price: 14500, image: foodTwo, category: "Traditional", available: true },
    { id: "p3", name: "Naija Grill Platter", description: "Spiced fish, suya beef, plantain and house pepper sauce.", price: 24000, image: foodOne, category: "Sharing", available: true },
  ],
  services: [
    { id: "s1", name: "Event catering", description: "Custom menus for weddings, team events and private celebrations.", startingPrice: 180000, duration: "Custom", image: foodOne, category: "Catering", customRequest: true },
    { id: "s2", name: "Private dining", description: "A hosted dining experience for groups of 8–24.", startingPrice: 220000, duration: "3 hours", image: foodTwo, category: "Experience", customRequest: true },
  ],
  offers: [{ id: "o1", title: "Sunday family feast", value: "15% OFF", validFrom: "10 Oct", validTo: "15 Oct", status: "Active" }],
  reviews: [
    { id: "r1", customer: "Claudine M.", rating: 5, comment: "The catering was effortless and every guest asked where the food came from.", date: "2 weeks ago" },
    { id: "r2", customer: "David K.", rating: 5, comment: "Beautiful flavours, generous portions, and genuinely warm service.", date: "1 month ago" },
  ],
  requestQuestions: [
    { id: "event", type: "select", label: "What are you planning?", options: ["Wedding", "Birthday", "Corporate event", "Family gathering", "Other"], required: true },
    { id: "guests", type: "number", label: "How many guests are you expecting?", helper: "An estimate is perfectly fine.", required: true },
    { id: "details", type: "textarea", label: "Tell us what would make it special", helper: "Mention menu preferences, dietary needs, or the atmosphere you want.", required: true },
    { id: "date", type: "date", label: "When is your event?", required: true },
    { id: "location", type: "location", label: "Where will it take place?", required: true },
    { id: "contact", type: "text", label: "Where should we send your quote?", helper: "Enter your WhatsApp number.", required: true },
  ],
};

export const demoBusinesses = [
  ["Afrinaija Pots Restaurant", "Restaurant"],
  ["Kigali AutoCare", "Mechanic"],
  ["Glow Beauty Studio", "Beauty"],
  ["Horizon Construction", "Construction"],
  ["Rwanda Furniture House", "Furniture"],
  ["PixelFrame Photography", "Photography"],
  ["Kigali Event Decor", "Events"],
  ["Prime Real Estate", "Real estate"],
  ["Kigali Clean Services", "Home services"],
  ["Urban Fashion Rwanda", "Retail"],
];

export const analytics: Analytics = {
  pageViews: 1284, uniqueVisitors: 1038, returningVisitors: 246, requests: 86, quotes: 42,
  acceptedQuotes: 21, quoteValue: 3800000, whatsappClicks: 164, calls: 73, directions: 91,
};

export const requests: Request[] = [
  { id: "1052", customer: "Aline Mukamana", title: "Wedding catering · 150 guests", date: "Today, 09:42", status: "New", estimatedValue: 980000, answers: [] },
  { id: "1051", customer: "Patrick N.", title: "Corporate lunch · 40 guests", date: "Yesterday", status: "Reviewing", estimatedValue: 320000, answers: [] },
  { id: "1048", customer: "John Doe", title: "Wedding decoration & catering", date: "12 Oct", status: "Quote Sent", estimatedValue: 850000, answers: [] },
  { id: "1043", customer: "Keza Studio", title: "Team dinner · 22 guests", date: "10 Oct", status: "Accepted", estimatedValue: 410000, answers: [] },
];

export const quote: Quote = {
  id: "1048", businessId: "biz-1", customer: "John Doe", requestTitle: "Wedding catering",
  createdAt: "13 October 2026", validUntil: "20 October 2026", status: "Sent", discount: 0,
  items: [
    { id: "i1", description: "Premium wedding menu", quantity: 1, unitPrice: 500000 },
    { id: "i2", description: "Dining tables", quantity: 20, unitPrice: 5000 },
    { id: "i3", description: "Guest seating", quantity: 150, unitPrice: 1000 },
    { id: "i4", description: "Transport & setup", quantity: 1, unitPrice: 100000 },
  ],
  notes: "Thank you for considering Afrinaija Pots. This quote includes on-site setup and a dedicated event coordinator.",
};

export const assets = { ownerPhoto, foodOne, foodTwo, foodThree };
