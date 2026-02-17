-- Fix: Remove incorrectly assigned Construction Lead (Ali Zachi / North) from DP-300 (Central region)
DELETE FROM project_team_members 
WHERE project_id = '76901c6c-927d-4266-aaea-bc036888f274' 
  AND role = 'Construction Lead' 
  AND user_id = '08fab8c4-9ac1-4646-a823-b62761fd1c58';