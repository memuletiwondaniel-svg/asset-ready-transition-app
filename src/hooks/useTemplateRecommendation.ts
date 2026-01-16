import { useMemo } from 'react';
import { PACTemplate } from './useHandoverPrerequisites';

interface TemplateMatch {
  template: PACTemplate;
  score: number;
  matchedKeywords: string[];
}

// Keywords mapped to template types for intelligent matching
const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  'pipeline': ['pipeline', 'piping', 'line', 'transmission', 'gas line', 'oil line'],
  'compressor': ['compressor', 'compression', 'turbine', 'rotating equipment'],
  'teg': ['teg', 'dehydration', 'glycol', 'drying', 'moisture removal'],
  'separator': ['separator', 'separation', 'vessel', 'knockout', 'slug catcher'],
  'well': ['well', 'wellhead', 'xmas tree', 'production well', 'injection well'],
  'flowline': ['flowline', 'flow line', 'gathering', 'production line'],
  'metering': ['metering', 'measurement', 'fiscal', 'custody transfer', 'allocation'],
  'storage': ['storage', 'tank', 'tankage', 'vessel', 'sphere'],
  'electrical': ['electrical', 'substation', 'transformer', 'switchgear', 'power'],
  'instrumentation': ['instrument', 'control', 'dcs', 'plc', 'scada', 'automation'],
  'fire': ['fire', 'deluge', 'f&g', 'fire and gas', 'firefighting', 'safety'],
  'hvac': ['hvac', 'heating', 'cooling', 'ventilation', 'air conditioning'],
  'brownfield': ['brownfield', 'modification', 'tie-in', 'retrofit', 'upgrade'],
  'greenfield': ['greenfield', 'new', 'construction', 'new build'],
  'offshore': ['offshore', 'platform', 'fpso', 'subsea', 'marine'],
  'onshore': ['onshore', 'land', 'field', 'facility'],
};

// Tokenize and normalize text for matching
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

// Calculate match score between scope and template
function calculateMatchScore(
  scopeTokens: string[], 
  templateName: string, 
  templateDescription: string | null
): { score: number; matchedKeywords: string[] } {
  const templateText = `${templateName} ${templateDescription || ''}`.toLowerCase();
  const templateTokens = tokenize(templateText);
  const matchedKeywords: string[] = [];
  let score = 0;

  // Direct token matching
  for (const token of scopeTokens) {
    if (templateTokens.some(t => t.includes(token) || token.includes(t))) {
      score += 2;
      matchedKeywords.push(token);
    }
  }

  // Keyword category matching
  for (const [category, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    const scopeHasCategory = scopeTokens.some(token => 
      keywords.some(kw => kw.includes(token) || token.includes(kw.split(' ')[0]))
    );
    const templateHasCategory = templateTokens.some(token =>
      keywords.some(kw => kw.includes(token) || token.includes(kw.split(' ')[0]))
    );

    if (scopeHasCategory && templateHasCategory) {
      score += 5;
      if (!matchedKeywords.includes(category)) {
        matchedKeywords.push(category);
      }
    }
  }

  return { score, matchedKeywords };
}

export function useTemplateRecommendation(scopeText: string, templates: PACTemplate[] | undefined) {
  const recommendations = useMemo(() => {
    if (!templates || templates.length === 0 || !scopeText.trim()) {
      return templates?.map(t => ({ 
        template: t, 
        score: 0, 
        matchedKeywords: [] 
      })) || [];
    }

    const scopeTokens = tokenize(scopeText);
    
    const matches: TemplateMatch[] = templates.map(template => {
      const { score, matchedKeywords } = calculateMatchScore(
        scopeTokens,
        template.name,
        template.description
      );
      
      return {
        template,
        score,
        matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
      };
    });

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }, [scopeText, templates]);

  // Get top recommendations (score > 0)
  const topRecommendations = useMemo(() => {
    return recommendations.filter(r => r.score > 0).slice(0, 3);
  }, [recommendations]);

  // Get other templates (not in top recommendations)
  const otherTemplates = useMemo(() => {
    const topIds = new Set(topRecommendations.map(r => r.template.id));
    return recommendations.filter(r => !topIds.has(r.template.id));
  }, [recommendations, topRecommendations]);

  return {
    allRecommendations: recommendations,
    topRecommendations,
    otherTemplates,
    hasRecommendations: topRecommendations.length > 0,
  };
}
