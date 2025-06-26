
import { useState } from 'react';

interface Project {
  id: string;
  name: string;
  plant: string;
  subdivision?: string;
  scope: string;
  milestone?: string;
  scorecardProject?: string;
  hubLead: any;
  others: any[];
}

export const useProjectsData = () => {
  const [projects, setProjects] = useState<Project[]>([
    { 
      id: '300', 
      name: 'HM Additional Compressors',
      plant: 'KAZ',
      subdivision: 'CS-7',
      scope: 'Installation and commissioning of two new gas compressors to increase processing capacity at Hammar field. Includes tie-in to existing infrastructure, safety systems integration, and performance testing.',
      hubLead: {
        name: 'Ahmed Al-Rashid',
        email: 'ahmed.alrashid@company.com',
        avatar: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'Sarah Johnson',
          role: 'Commissioning Lead',
          email: 'sarah.johnson@company.com',
          avatar: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        },
        {
          name: 'Mohammed Hassan',
          role: 'Construction Lead',
          email: 'mohammed.hassan@company.com',
          avatar: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=150&h=150&fit=crop&crop=face',
          status: 'amber'
        }
      ]
    },
    { 
      id: '163', 
      name: 'LPG Unit 12.1 Rehabilitation',
      plant: 'NRNGL',
      scope: 'Major rehabilitation of LPG processing unit including vessel replacements, piping upgrades, and control system modernization to restore full operational capacity.',
      hubLead: {
        name: 'Omar Al-Basri',
        email: 'omar.albasri@company.com',
        avatar: 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'Lisa Chen',
          role: 'Commissioning Lead',
          email: 'lisa.chen@company.com',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
          status: 'red'
        }
      ]
    },
    { 
      id: '083C', 
      name: 'UQ Jetty 2 Export Terminal',
      plant: 'UQ',
      scope: 'Construction of new marine export terminal with loading arms, metering systems, and safety equipment for enhanced export capacity.',
      hubLead: {
        name: 'David Rodriguez',
        email: 'david.rodriguez@company.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        status: 'amber'
      },
      others: [
        {
          name: 'Elena Petrov',
          role: 'Construction Lead',
          email: 'elena.petrov@company.com',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        },
        {
          name: 'Marcus Thompson',
          role: 'Commissioning Lead',
          email: 'marcus.thompson@company.com',
          avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        }
      ]
    },
    { 
      id: '317', 
      name: 'Majnoon New Gas Tie-in',
      plant: 'Compressor Station (CS)',
      subdivision: 'CS-3',
      scope: 'Installation of new gas tie-in pipeline from Majnoon field to existing compressor station with pressure regulation and metering facilities.',
      hubLead: {
        name: 'Fatima Al-Zahra',
        email: 'fatima.alzahra@company.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'John Mitchell',
          role: 'Construction Lead',
          email: 'john.mitchell@company.com',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
          status: 'amber'
        }
      ]
    },
    { 
      id: '33A', 
      name: 'Hammar New TEG',
      plant: 'BNGL',
      scope: 'Installation of new Triethylene Glycol (TEG) dehydration unit for natural gas processing with regeneration system and utilities.',
      hubLead: {
        name: 'Yasmin Ibrahim',
        email: 'yasmin.ibrahim@company.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: []
    },
    { 
      id: '368', 
      name: 'CS7 to CS6 Cross-over Line',
      plant: 'Compressor Station (CS)',
      subdivision: 'CS-6',
      scope: 'Construction of cross-over pipeline between CS7 and CS6 compressor stations for operational flexibility and emergency backup.',
      hubLead: {
        name: 'Ali Hassan',
        email: 'ali.hassan@company.com',
        avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
        status: 'red'
      },
      others: [
        {
          name: 'Nina Volkov',
          role: 'Commissioning Lead',
          email: 'nina.volkov@company.com',
          avatar: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        }
      ]
    },
    { 
      id: '245', 
      name: 'KAZ Flare System Upgrade',
      plant: 'KAZ',
      scope: 'Upgrade of existing flare system with new flare tip, knockout drum, and enhanced safety systems for improved environmental compliance.',
      hubLead: {
        name: 'Karim Al-Sudani',
        email: 'karim.alsudani@company.com',
        avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face',
        status: 'amber'
      },
      others: []
    },
    { 
      id: '156', 
      name: 'NRNGL Gas Processing Enhancement',
      plant: 'NRNGL',
      scope: 'Enhancement of gas processing capabilities through installation of additional separation equipment and process optimization systems.',
      hubLead: {
        name: 'Layla Mahmoud',
        email: 'layla.mahmoud@company.com',
        avatar: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'Robert Kim',
          role: 'Construction Lead',
          email: 'robert.kim@company.com',
          avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
          status: 'green'
        }
      ]
    },
    { 
      id: '421', 
      name: 'BNGL Storage Tank Expansion',
      plant: 'BNGL',
      scope: 'Construction of additional storage tanks with associated piping, instrumentation, and fire protection systems to increase storage capacity.',
      hubLead: {
        name: 'Noor Al-Tamimi',
        email: 'noor.altamimi@company.com',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        status: 'amber'
      },
      others: []
    },
    { 
      id: '289', 
      name: 'UQ Pipeline Integrity Project',
      plant: 'UQ',
      scope: 'Comprehensive pipeline integrity assessment and rehabilitation including smart pig runs, coating repairs, and cathodic protection upgrades.',
      hubLead: {
        name: 'Hassan Al-Baghdadi',
        email: 'hassan.albaghdadi@company.com',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop&crop=face',
        status: 'green'
      },
      others: [
        {
          name: 'Maria Santos',
          role: 'Commissioning Lead',
          email: 'maria.santos@company.com',
          avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
          status: 'red'
        },
        {
          name: 'James Wilson',
          role: 'Construction Lead',
          email: 'james.wilson@company.com',
          avatar: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=150&h=150&fit=crop&crop=face',
          status: 'amber'
        }
      ]
    }
  ]);

  const handleNewProjectAdded = (projectData: any) => {
    const newProject: Project = {
      id: projectData.projectId,
      name: projectData.projectTitle,
      plant: projectData.plant,
      subdivision: projectData.csLocation || undefined,
      scope: projectData.projectScope,
      milestone: projectData.projectMilestone,
      scorecardProject: projectData.scorecardProject,
      hubLead: {
        ...projectData.projectHubLead,
        role: 'Project Hub Lead'
      },
      others: [
        ...(projectData.commissioningLead?.name ? [{
          ...projectData.commissioningLead,
          role: 'Commissioning Lead'
        }] : []),
        ...(projectData.constructionLead?.name ? [{
          ...projectData.constructionLead,
          role: 'Construction Lead'
        }] : []),
        ...projectData.additionalPersons.map((person: any) => ({
          name: person.name,
          email: person.email,
          avatar: person.avatar || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`,
          status: person.status || 'green',
          role: person.role
        }))
      ]
    };

    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  return {
    projects,
    setProjects,
    handleNewProjectAdded
  };
};
