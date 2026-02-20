-- Fix existing PSSR record with incorrect GEN code
UPDATE pssrs SET pssr_id = 'PSSR-BNGL-2026-001' WHERE id = '4d9cc686-028e-49f1-9873-0a22e23b3639' AND pssr_id = 'PSSR-GEN-2026-001';