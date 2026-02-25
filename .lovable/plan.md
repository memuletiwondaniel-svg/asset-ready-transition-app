

## Add BFM Lead to PSSR Allowed Approver Roles

### Change
Insert the **BFM Lead** role (`ed6046ca-a68c-4840-a2ba-787f0fd6f3d5`) into the `pssr_allowed_approver_roles` table.

### SQL
```sql
INSERT INTO pssr_allowed_approver_roles (role_id)
VALUES ('ed6046ca-a68c-4840-a2ba-787f0fd6f3d5');
```

### Impact
- No code changes needed — the UI dynamically reads from this table
- "BFM Lead" will appear in the PSSR Approvers dropdown in Step 2 of the Edit PSSR Template

