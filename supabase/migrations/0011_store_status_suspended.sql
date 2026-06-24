-- Phase 5 — Store oversight: add a 'suspended' state to store_status.
-- (Adding an enum value must be committed before it can be used, so the policy
-- that references it lives in the next migration.)
alter type store_status add value if not exists 'suspended';
