-- Vague narrative questions should never block a customer from sending a request.
UPDATE "RequestQuestion"
SET "required" = false
WHERE LOWER("label") LIKE '%tell us more%'
   OR LOWER("label") LIKE '%anything else%'
   OR LOWER("label") LIKE '%additional details%'
   OR LOWER("label") LIKE '%anything that would help%';
