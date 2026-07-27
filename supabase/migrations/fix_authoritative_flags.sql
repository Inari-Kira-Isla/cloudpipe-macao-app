
-- Fix is_authoritative violations
UPDATE knowledge_facts 
SET flagged_issue = NULL 
WHERE is_authoritative = true 
AND flagged_issue IS NOT NULL;

UPDATE knowledge_facts 
SET is_authoritative = false 
WHERE is_authoritative = true 
AND verification_status = 'UNVERIFIED';

