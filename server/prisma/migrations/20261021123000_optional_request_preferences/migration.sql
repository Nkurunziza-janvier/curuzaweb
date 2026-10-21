UPDATE "RequestQuestion"
SET "required" = false
WHERE "required" = true
  AND (
    "type" IN ('DATE', 'LOCATION', 'FILE', 'NUMBER', 'TIME')
    OR "label" IN (
      'Vehicle type',
      'Vehicle model',
      'Describe the problem',
      'Pickup or delivery',
      'Service required'
    )
  );

UPDATE "RequestQuestion"
SET "label" = regexp_replace("label", '\s*\(optional\)\s*$', '', 'i')
WHERE "label" ~* '\(optional\)\s*$';
