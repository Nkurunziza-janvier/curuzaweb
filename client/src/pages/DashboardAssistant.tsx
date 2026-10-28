import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, Check, Copy, CreditCard, FileText, Gift, LifeBuoy, Package, PanelTop, RotateCcw, Send, Settings, ShoppingBag, Sparkles, Store, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui";
import { useCurrentUser } from "../hooks/apiHooks";
import { useLanguage } from "../i18n";

type HelpLink = { label: string; to: string };

interface HelpEntry {
  id: string;
  title: string;
  keywords: string[];
  body: string[];
  steps?: string[];
  links?: HelpLink[];
  followUps?: string[];
}

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string; entry?: HelpEntry };

const quickPrompts = [
  "How do I publish my business page?",
  "How do I add a product?",
  "How do I create a quote?",
  "What does my analytics mean?",
];

const topics: Array<{ label: string; prompt: string; icon: LucideIcon }> = [
  { label: "Page & publishing", prompt: "How do I publish my business page?", icon: Store },
  { label: "Products & services", prompt: "How do I add a product or service?", icon: Package },
  { label: "Requests & quotes", prompt: "How do I create and send a quote?", icon: FileText },
  { label: "Offers", prompt: "How do offers work?", icon: Gift },
  { label: "Plans & billing", prompt: "What does my publishing plan include?", icon: CreditCard },
  { label: "Analytics", prompt: "What does my analytics mean?", icon: BarChart3 },
  { label: "Settings", prompt: "How do I update my business information?", icon: Settings },
  { label: "Account & support", prompt: "How do I contact support?", icon: LifeBuoy },
];

const helpEntries: HelpEntry[] = [
  {
    id: "publishing",
    title: "Publishing your page",
    keywords: ["publish", "unpublish", "live page", "public page", "go live", "page is live", "share link", "public link", "website", "storefront"],
    body: [
      "Your public business page is what customers see when they open your e-businessRw link. It brings your products, services, offers, reviews, and contact details together in one place.",
      "Use Business page to publish or unpublish the page. Publishing makes the link available to customers. Unpublishing keeps your workspace private while you prepare.",
      "You can copy your public link from the Overview page and share it on WhatsApp, social media, or your printed materials.",
    ],
    links: [
      { label: "Open Business page", to: "/dashboard/business-page" },
      { label: "Go to Overview", to: "/dashboard" },
    ],
    followUps: ["What does my publishing plan include?", "How do I add a product?"],
  },
  {
    id: "products",
    title: "Adding products",
    keywords: ["product", "products", "add item", "catalog", "price", "photo", "image", "publish product", "unpublish product"],
    body: [
      "Products are the items customers can browse and request from your page. Each product needs a name and price; a photo and description help customers decide.",
      "New listings stay private until you publish them. Your publishing plan controls how many products can be live at once.",
    ],
    steps: [
      "Open Products and choose New product.",
      "Add the product name, price, description, and an optional image.",
      "Save the product, then use Publish on its card to make it visible.",
      "Use Unpublish at any time to hide it from customers without deleting it.",
    ],
    links: [{ label: "Manage products", to: "/dashboard/products" }],
    followUps: ["How do services work?", "What does my publishing plan include?"],
  },
  {
    id: "services",
    title: "Adding services",
    keywords: ["service", "services", "booking", "bookable", "appointment", "duration", "capacity", "starting price"],
    body: [
      "Services let you present what you offer with a starting price and description. Customers can send a request, or book an available time when online booking is enabled.",
      "If you turn on Allow online booking, set the duration, buffer time, and capacity so customers only see times you can handle.",
    ],
    steps: [
      "Open Services and choose New service.",
      "Add the service name, starting price, description, and an optional image.",
      "Turn on Allow online booking if customers should choose a time.",
      "Set duration, buffer, and capacity, then save and publish the service.",
    ],
    links: [{ label: "Manage services", to: "/dashboard/services" }],
    followUps: ["How do I add a product?", "How do requests work?"],
  },
  {
    id: "offers",
    title: "Running offers",
    keywords: ["offer", "offers", "discount", "promotion", "percentage", "fixed amount", "end date", "campaign"],
    body: [
      "Offers give customers a clear reason to act now. You can create a percentage or fixed-amount discount with a start and end date.",
      "An offer appears on your public page while it is active. Deactivate it when the promotion ends; you can reactivate it later without recreating it.",
    ],
    steps: [
      "Open Offers and choose New offer.",
      "Add a title and choose Percentage or Fixed amount.",
      "Set the discount value and the dates the offer should run.",
      "Save the offer, then activate it from its card.",
    ],
    links: [{ label: "Manage offers", to: "/dashboard/offers" }],
    followUps: ["How do I publish my page?", "What does my analytics mean?"],
  },
  {
    id: "requests",
    title: "Handling customer requests",
    keywords: ["request", "requests", "enquiry", "inquiry", "customer", "lead", "status", "new request", "respond"],
    body: [
      "Requests are customer enquiries sent from your public page. Each request shows the customer, what they need, when it arrived, its status, and an estimated value when available.",
      "Open a request to review the customer's contact details, answers, and notes. From there you can create a quote or follow up directly.",
    ],
    steps: [
      "Open Requests and use search or status filters to find a request.",
      "Select Review or Open to see the full details.",
      "Use Create quote to prepare a professional response.",
      "Keep the status current so you can see what still needs attention.",
    ],
    links: [{ label: "Open Requests", to: "/dashboard/requests" }],
    followUps: ["How do I create a quote?", "How do I contact support?"],
  },
  {
    id: "quotes",
    title: "Creating and sending quotes",
    keywords: ["quote", "quotes", "proposal", "estimate", "line item", "discount", "deposit", "accept", "send quote", "expire"],
    body: [
      "A quote turns a customer request into a clear, professional proposal. You can add line items, quantities, unit prices, a discount, validity dates, notes, payment terms, and a deposit.",
      "Preview the quote before sending. The customer receives a private link where they can accept or reject it, and the status updates in your workspace.",
      "Quotes can be drafts, awaiting a response, accepted, rejected, or expired. The summary shows totals, pending value, accepted value, and your acceptance rate.",
    ],
    steps: [
      "Open Requests and choose Create quote, or go to Quotes and choose Create from a request.",
      "Add each item with a quantity and unit price.",
      "Set validity, discount, deposit, notes, and payment terms if needed.",
      "Preview the quote, then send it to the customer.",
    ],
    links: [
      { label: "Create from a request", to: "/dashboard/requests" },
      { label: "Manage quotes", to: "/dashboard/quotes" },
    ],
    followUps: ["How do requests work?", "What does my analytics mean?"],
  },
  {
    id: "billing",
    title: "Plans and billing",
    keywords: ["plan", "plans", "billing", "payment", "pay", "mobile money", "subscription", "renew", "expire", "access", "price", "cost"],
    body: [
      "Your publishing plan controls whether products and services can appear publicly. Monthly and annual plans are available from Plans & billing.",
      "In this development preview, checkout is simulated and access activates immediately. Real payments are reviewed by an administrator before activation.",
      "Renew before your access expires so your public listings stay visible. You can prepare catalog items even without an active plan; they remain private until access is active.",
    ],
    links: [{ label: "Open Plans & billing", to: "/dashboard/billing" }],
    followUps: ["How do I publish my page?", "How do I contact support?"],
  },
  {
    id: "analytics",
    title: "Understanding analytics",
    keywords: ["analytics", "stats", "statistics", "page views", "visitors", "conversion", "funnel", "whatsapp clicks", "calls", "directions"],
    body: [
      "Analytics shows how people discover and act on your page. Page views count visits, while customer actions track WhatsApp clicks, calls, and direction requests.",
      "The conversion journey follows visitors through actions, requests, quotes, and accepted quotes. Use it to see where customers lose interest and where to improve.",
    ],
    links: [{ label: "Open Analytics", to: "/dashboard/analytics" }],
    followUps: ["How do I publish my page?", "How do offers work?"],
  },
  {
    id: "settings",
    title: "Updating business information",
    keywords: ["settings", "business information", "name", "address", "phone", "email", "category", "city", "description", "profile", "hours", "location"],
    body: [
      "Settings is where you keep your business name, category, email, phone, city, address, and description accurate. Customers rely on these details to find and contact you.",
      "Business page is separate: use it to control whether your public page is published. Updates to your profile appear across your workspace and public page.",
    ],
    steps: [
      "Open Settings and update the fields you need.",
      "Choose Save changes and confirm the success message.",
      "Review Business page to make sure your page is published when ready.",
    ],
    links: [
      { label: "Open Settings", to: "/dashboard/settings" },
      { label: "Open Business page", to: "/dashboard/business-page" },
    ],
    followUps: ["How do I publish my page?", "How do I contact support?"],
  },
  {
    id: "notifications",
    title: "Notifications and account access",
    keywords: ["notification", "notifications", "bell", "alerts", "unread", "account", "sign out", "logout", "password", "login", "email", "language"],
    body: [
      "The bell in the top bar shows updates about payments and account access. Unread items are highlighted, and you can mark them all as read.",
      "To sign out, use the sign-out button beside your account at the bottom of the sidebar. You can change the interface language from the top bar.",
      "Password reset is not available inside the app yet. Contact your business administrator if you cannot sign in.",
    ],
    links: [{ label: "Open Settings", to: "/dashboard/settings" }],
    followUps: ["How do I contact support?", "How do I update my business information?"],
  },
  {
    id: "support",
    title: "Contacting support",
    keywords: ["support", "help", "human", "contact", "administrator", "admin", "problem", "issue", "bug", "error", "payment review"],
    body: [
      "For account-specific issues such as payments, access, or sign-in, contact your platform administrator. Include your business name and account email so they can find you quickly.",
      "For general guidance about the workspace, this assistant can walk you through publishing, catalog setup, requests, quotes, and analytics.",
    ],
    links: [{ label: "Open Plans & billing", to: "/dashboard/billing" }],
    followUps: ["What does my publishing plan include?", "How do I publish my page?"],
  },
];

const stopWords = new Set(["the", "and", "for", "with", "how", "what", "does", "can", "you", "your", "are", "was", "where", "when", "why", "who", "this", "that", "from", "have", "has", "into", "about", "want", "need", "help", "please", "tell", "show", "give", "make"]);

function findEntry(query: string) {
  const normalized = query.toLowerCase();
  const tokens = normalized.split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !stopWords.has(token));
  let best: HelpEntry | undefined;
  let bestScore = 0;
  for (const entry of helpEntries) {
    let score = 0;
    for (const rawKeyword of entry.keywords) {
      const keyword = rawKeyword.toLowerCase();
      if (normalized.includes(keyword)) score += 5 + keyword.split(" ").length;
      for (const token of tokens) {
        if (keyword.includes(token) || (keyword.length > 4 && token.includes(keyword))) score += 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= 4 ? best : undefined;
}

function entryToText(entry: HelpEntry) {
  const lines = [entry.title, "", ...entry.body];
  if (entry.steps?.length) lines.push("", "Steps:", ...entry.steps.map((step, index) => `${index + 1}. ${step}`));
  return lines.join("\n");
}

export default function DashboardAssistant() {
  const { t, locale } = useLanguage();
  const { data: user } = useCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? "";
  const welcomeText = `Hi${firstName ? ` ${firstName}` : ""} — I'm your e-businessRw assistant. I can guide you through publishing your page, adding products and services, handling requests and quotes, and understanding your analytics. What can I help with?`;
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "assistant", text: welcomeText }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const copyTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (messages.length <= 1) log.scrollTop = 0;
    else log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const ask = (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query || typing) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text: query };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setTyping(true);
    const normalized = query.toLowerCase();
    const entry = /^(hi|hello|hey|muraho|bonjour|good (morning|afternoon|evening))\b/.test(normalized) ? undefined : findEntry(query);
    const reply: ChatMessage = /thank|merci|murakoze/.test(normalized)
      ? { id: `assistant-${Date.now()}`, role: "assistant", text: "You're welcome. If you need anything else, ask me about publishing, products, requests, quotes, or analytics." }
      : entry
        ? { id: `assistant-${Date.now()}`, role: "assistant", text: "", entry }
        : /^(hi|hello|hey|muraho|bonjour|good (morning|afternoon|evening))\b/.test(normalized)
          ? { id: `assistant-${Date.now()}`, role: "assistant", text: welcomeText }
          : { id: `assistant-${Date.now()}`, role: "assistant", text: "I don't have a guide for that yet. Try asking about publishing your page, products, services, offers, requests, quotes, plans, analytics, or settings. For account-specific help, contact your platform administrator." };
    timerRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, reply]);
      setTyping(false);
      inputRef.current?.focus({ preventScroll: true });
    }, 620);
  };

  const reset = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setTyping(false);
    setInput("");
    setMessages([{ id: "welcome", role: "assistant", text: welcomeText }]);
    inputRef.current?.focus({ preventScroll: true });
  };

  const copyMessage = async (message: ChatMessage) => {
    const text = message.role === "assistant" ? (message.entry ? entryToText(message.entry) : message.text) : message.text;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(message.id);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedId(""), 1400);
    } catch {
      setCopiedId("");
    }
  };

  const resizeInput = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  };

  return (
    <div className="dash-assistant mx-auto max-w-[88rem]">
      <div className="dash-assistant-head">
        <div className="min-w-0">
          <span className="dash-assistant-badge">
            <Sparkles size={14} /> {t("AI assistant")}
            <span className="dash-assistant-beta">{t("Beta")}</span>
          </span>
          <h1>{t("How can we help?")}</h1>
          <p>{t("Ask anything about running your workspace. Answers come from the e-businessRw help guides.")}</p>
        </div>
        <div className="dash-assistant-head-actions">
          <span className="dash-assistant-status"><span className="dash-status-dot is-live" /> {t("Guides up to date")}</span>
          <Button variant="secondary" onClick={reset} icon={<RotateCcw size={16} />}>{t("New chat")}</Button>
        </div>
      </div>

      <div className="dash-assistant-grid">
        <section className="dash-chat" aria-label={t("AI assistant chat")}>
          <header className="dash-chat-head">
            <span className="dash-chat-avatar"><Sparkles size={18} /></span>
            <div className="min-w-0">
              <p>{t("e-businessRw Assistant")}</p>
              <span><span className="dash-status-dot is-live" /> {t("Online · answers from help guides")}</span>
            </div>
            <span className="dash-chat-private">{t("Private to your workspace")}</span>
          </header>

          <div ref={logRef} className="dash-chat-log" aria-live="polite">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="dash-msg dash-msg-user">
                  <div className="dash-msg-bubble">{message.text}</div>
                </div>
              ) : (
                <article key={message.id} className="dash-msg dash-msg-assistant">
                  <span className="dash-msg-avatar"><Sparkles size={15} /></span>
                  <div className="dash-msg-content">
                    <div className="dash-msg-meta">
                      <span>{t("Assistant")}</span>
                      <button type="button" onClick={() => void copyMessage(message)} aria-label={t("Copy answer")} title={t("Copy answer")}>
                        {copiedId === message.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === message.id ? t("Copied") : t("Copy")}
                      </button>
                    </div>
                    {message.entry ? (
                      <>
                        <p className="dash-msg-title">{t(message.entry.title)}</p>
                        {message.entry.body.map((paragraph) => <p key={paragraph} className="dash-msg-text">{paragraph}</p>)}
                        {message.entry.steps && (
                          <ol className="dash-msg-steps">
                            {message.entry.steps.map((step, index) => (
                              <li key={step}>
                                <span className="dash-step-num">{index + 1}</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {message.entry.links && (
                          <div className="dash-msg-actions">
                            {message.entry.links.map((link) => (
                              <Link key={link.to + link.label} to={link.to} className="dash-msg-link">
                                {t(link.label)} <ArrowUpRight size={14} />
                              </Link>
                            ))}
                          </div>
                        )}
                        {message.entry.followUps && (
                          <div className="dash-msg-followups">
                            {message.entry.followUps.map((followUp) => (
                              <button key={followUp} type="button" className="dash-followup" onClick={() => ask(followUp)}>
                                {followUp}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="dash-msg-text">{message.text}</p>
                    )}
                    {message.id === "welcome" && (
                      <div className="dash-msg-followups">
                        {quickPrompts.map((prompt) => (
                          <button key={prompt} type="button" className="dash-followup" onClick={() => ask(prompt)}>
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ),
            )}
            {typing && (
              <div className="dash-msg dash-msg-assistant">
                <span className="dash-msg-avatar"><Sparkles size={15} /></span>
                <div className="dash-typing" role="status" aria-label={t("Assistant is typing")}>
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          <div className="dash-chat-compose">
            <form onSubmit={(event) => { event.preventDefault(); ask(input); }}>
              <div className="dash-chat-input">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  maxLength={500}
                  onChange={(event) => { setInput(event.target.value); resizeInput(event.target); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      ask(input);
                    }
                  }}
                  placeholder={t("Ask about your workspace…")}
                  aria-label={t("Ask the assistant")}
                />
                <button type="submit" className="dash-chat-send" disabled={!input.trim() || typing} aria-label={t("Send message")}>
                  <Send size={18} />
                </button>
              </div>
              <div className="dash-chat-hint">
                <span>{t("Enter to send · Shift + Enter for a new line")}</span>
                {locale !== "en" && <span>{t("Help guides are currently written in English.")}</span>}
              </div>
            </form>
          </div>
        </section>

        <aside className="dash-assist-rail">
          <section className="dash-assist-panel">
            <div className="dash-assist-panel-head">
              <span className="dash-assist-panel-icon"><BookOpen size={17} /></span>
              <div>
                <p>{t("Browse guides")}</p>
                <span>{t("Jump straight to a topic")}</span>
              </div>
            </div>
            <div className="dash-topic-list">
              {topics.map(({ label, prompt, icon: Icon }) => (
                <button key={label} type="button" onClick={() => ask(prompt)}>
                  <Icon size={16} />
                  <span>{t(label)}</span>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </section>

          <section className="dash-assist-panel dash-assist-human">
            <span className="dash-assist-panel-icon"><LifeBuoy size={17} /></span>
            <p className="dash-assist-human-title">{t("Need human help?")}</p>
            <p className="dash-assist-human-copy">{t("Payments, access, and sign-in issues are handled by your platform administrator.")}</p>
            <button type="button" onClick={() => ask("How do I contact support?")}>
              {t("Contact support")} <ArrowRight size={14} />
            </button>
          </section>

          <section className="dash-assist-panel dash-assist-links">
            <p className="dash-assist-links-title">{t("Shortcuts")}</p>
            <Link to="/dashboard/business-page"><PanelTop size={15} /> {t("Business page")} <ArrowUpRight size={13} /></Link>
            <Link to="/dashboard/requests"><FileText size={15} /> {t("Requests")} <ArrowUpRight size={13} /></Link>
            <Link to="/dashboard/billing"><ShoppingBag size={15} /> {t("Plans & billing")} <ArrowUpRight size={13} /></Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
