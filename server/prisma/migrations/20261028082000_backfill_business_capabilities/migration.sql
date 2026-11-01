-- Backfill legacy businesses so existing pages and dashboards keep working.
UPDATE "Business"
SET
  "industryKey" = CASE
    WHEN lower("category") LIKE '%restaurant%' OR lower("category") LIKE '%food%' OR lower("category") LIKE '%cafe%' OR lower("category") LIKE '%bakery%' OR lower("category") LIKE '%catering%' THEN 'food'
    WHEN lower("category") LIKE '%retail%' OR lower("category") LIKE '%shop%' OR lower("category") LIKE '%furniture%' OR lower("category") LIKE '%pharmacy%' OR lower("category") LIKE '%electronic%' THEN 'retail'
    WHEN lower("category") LIKE '%beauty%' OR lower("category") LIKE '%salon%' OR lower("category") LIKE '%spa%' OR lower("category") LIKE '%barber%' THEN 'beauty'
    WHEN lower("category") LIKE '%mechanic%' OR lower("category") LIKE '%auto%' OR lower("category") LIKE '%garage%' THEN 'automotive'
    WHEN lower("category") LIKE '%construction%' OR lower("category") LIKE '%clean%' OR lower("category") LIKE '%plumber%' OR lower("category") LIKE '%electrician%' OR lower("category") LIKE '%home service%' THEN 'home_services'
    WHEN lower("category") LIKE '%photo%' OR lower("category") LIKE '%consult%' OR lower("category") LIKE '%lawyer%' OR lower("category") LIKE '%account%' OR lower("category") LIKE '%agency%' THEN 'professional'
    WHEN lower("category") LIKE '%event%' OR lower("category") LIKE '%decor%' THEN 'entertainment'
    WHEN lower("category") LIKE '%real estate%' OR lower("category") LIKE '%property%' THEN 'real_estate'
    WHEN lower("category") LIKE '%clinic%' OR lower("category") LIKE '%health%' THEN 'health'
    WHEN lower("category") LIKE '%gym%' OR lower("category") LIKE '%fitness%' THEN 'fitness'
    WHEN lower("category") LIKE '%school%' OR lower("category") LIKE '%tutor%' THEN 'education'
    WHEN lower("category") LIKE '%travel%' OR lower("category") LIKE '%tour%' THEN 'travel'
    WHEN lower("category") LIKE '%farm%' OR lower("category") LIKE '%agri%' THEN 'agriculture'
    WHEN lower("category") LIKE '%tech%' OR lower("category") LIKE '%software%' OR lower("category") LIKE '%it %' THEN 'technology'
    ELSE 'other'
  END,
  "subtype" = CASE
    WHEN lower("category") LIKE '%restaurant%' THEN 'restaurant'
    WHEN lower("category") LIKE '%cafe%' THEN 'cafe'
    WHEN lower("category") LIKE '%bakery%' THEN 'bakery'
    WHEN lower("category") LIKE '%catering%' THEN 'catering'
    WHEN lower("category") LIKE '%furniture%' THEN 'furniture'
    WHEN lower("category") LIKE '%pharmacy%' THEN 'pharmacy'
    WHEN lower("category") LIKE '%electronic%' THEN 'electronics'
    WHEN lower("category") LIKE '%beauty%' OR lower("category") LIKE '%salon%' THEN 'beauty_salon'
    WHEN lower("category") LIKE '%spa%' THEN 'spa'
    WHEN lower("category") LIKE '%barber%' THEN 'barbershop'
    WHEN lower("category") LIKE '%mechanic%' THEN 'mechanic'
    WHEN lower("category") LIKE '%garage%' THEN 'garage'
    WHEN lower("category") LIKE '%construction%' THEN 'contractor'
    WHEN lower("category") LIKE '%clean%' THEN 'cleaner'
    WHEN lower("category") LIKE '%plumber%' THEN 'plumber'
    WHEN lower("category") LIKE '%electrician%' THEN 'electrician'
    WHEN lower("category") LIKE '%photo%' THEN 'photographer'
    WHEN lower("category") LIKE '%consult%' THEN 'consultant'
    WHEN lower("category") LIKE '%lawyer%' THEN 'lawyer'
    WHEN lower("category") LIKE '%account%' THEN 'accountant'
    WHEN lower("category") LIKE '%agency%' THEN 'agency'
    WHEN lower("category") LIKE '%event%' OR lower("category") LIKE '%decor%' THEN 'event_planner'
    WHEN lower("category") LIKE '%real estate%' OR lower("category") LIKE '%property%' THEN 'agent'
    WHEN lower("category") LIKE '%clinic%' OR lower("category") LIKE '%health%' THEN 'clinic'
    WHEN lower("category") LIKE '%gym%' OR lower("category") LIKE '%fitness%' THEN 'gym'
    WHEN lower("category") LIKE '%school%' THEN 'school'
    WHEN lower("category") LIKE '%tutor%' THEN 'tutor'
    WHEN lower("category") LIKE '%travel%' OR lower("category") LIKE '%tour%' THEN 'tour_operator'
    WHEN lower("category") LIKE '%farm%' OR lower("category") LIKE '%agri%' THEN 'farm'
    WHEN lower("category") LIKE '%tech%' OR lower("category") LIKE '%software%' THEN 'software_company'
    ELSE 'general'
  END,
  "capabilities" = ARRAY[
    'products',
    'product_orders',
    'services',
    'appointments',
    'service_requests',
    'portfolio',
    'reviews',
    'whatsapp_contact',
    'contact_form',
    'delivery',
    'pickup'
  ]
WHERE cardinality("capabilities") = 0;

UPDATE "Business" SET "publishedAt" = "updatedAt" WHERE "isPublished" = true AND "publishedAt" IS NULL;
