-- First, create the Business Opportunity Manager role if it doesn't exist
INSERT INTO roles (name, description, display_order, is_active)
SELECT 'Business Opportunity Manager', 'Business Opportunity Manager (BOM) - responsible for production promise and business outcomes', 50, true
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Business Opportunity Manager');

-- Insert FAC Prerequisites
-- Get role IDs for reference
DO $$
DECLARE
  v_project_engr_id uuid;
  v_project_manager_id uuid;
  v_bom_id uuid;
BEGIN
  SELECT id INTO v_project_engr_id FROM roles WHERE name = 'Project Engr' AND is_active = true LIMIT 1;
  SELECT id INTO v_project_manager_id FROM roles WHERE name = 'Project Manager' AND is_active = true LIMIT 1;
  SELECT id INTO v_bom_id FROM roles WHERE name = 'Business Opportunity Manager' AND is_active = true LIMIT 1;

  -- Insert prerequisites
  INSERT INTO fac_prerequisites (summary, description, delivering_party_role_id, display_order, is_active)
  VALUES
    -- 01. Project Engineer
    ('All outstanding work (OWL), Punchlists and NCR actions listed in the PAC have been completed. Where items remain open, and subject to mutual agreement between the project and asset teams, responsibility for completing the work has been formally transferred to the asset team along with the necessary budget allocation.',
     NULL, v_project_engr_id, 1, true),
    
    -- 02. Project Engineer
    ('All Project Related MoCs, and outstanding actions have been implemented and closed out',
     NULL, v_project_engr_id, 2, true),
    
    -- 03. Project Engineer
    ('As-Built Documentation have been handed over to the Asset',
     NULL, v_project_engr_id, 3, true),
    
    -- 04. Project Manager
    ('Lessons learned sessions have been conducted with all relevant stakeholders. The outputs from these sessions have been documented and made accessible to both the Asset and Project Teams to support continuous improvement and future project execution.',
     NULL, v_project_manager_id, 4, true),
    
    -- 05. Project Engineer
    ('The project team has demobilized or ready to demobilize from the site',
     NULL, v_project_engr_id, 5, true),
    
    -- 06. Project Engineer
    ('All Project Permits have been closed out.',
     NULL, v_project_engr_id, 6, true),
    
    -- 07. Project Manager
    ('Any outstanding contractual arrangements that project has at the time of FAC are terminated or carried over into asset responsibility if agreement has been reached to this end. Details are to be formally listed and agreed.',
     NULL, v_project_manager_id, 7, true),
    
    -- 08. Project Manager
    ('Where applicable, warranty transfer has taken place and vendor details shared with asset maintenance and operations teams',
     NULL, v_project_manager_id, 8, true),
    
    -- 09. Business Opportunity Manager (BOM)
    ('The Production Promise—covering target production rates, product quality specifications, system reliability, uptime expectations, and the timeframe for achieving stable operations—has been successfully demonstrated against the agreed performance criteria. Where specific targets have not been fully met, a gap closure plan has been jointly reviewed and accepted by all relevant stakeholders.',
     NULL, v_bom_id, 9, true);
END $$;