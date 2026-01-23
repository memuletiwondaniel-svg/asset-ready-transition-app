-- Link the PSSR "DP300 HM Additional Compressors" to its corresponding project
UPDATE pssrs 
SET project_id = '76901c6c-927d-4266-aaea-bc036888f274'
WHERE id = '07d1679b-e53e-4b5b-a6df-3a100d30aa6b' 
AND project_id IS NULL;