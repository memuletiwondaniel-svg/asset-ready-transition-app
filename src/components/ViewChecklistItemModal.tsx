import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Eye, FileText } from 'lucide-react';
import { ChecklistItem } from '@/hooks/useChecklistItems';
import { useChecklistCategories } from '@/hooks/useChecklistCategories';
import { useChecklistTopics } from '@/hooks/useChecklistTopics';
import { useRoles } from '@/hooks/useRoles';
import { useDisciplines } from '@/hooks/useDisciplines';
import { useCommissions } from '@/hooks/useCommissions';

interface ViewChecklistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ChecklistItem | null;
}

interface TA2Approver {
  id: string;
  discipline: string;
  commission: string;
  position: string;
}

const ViewChecklistItemModal: React.FC<ViewChecklistItemModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [formData, setFormData] = useState({
    description: '',
    evidenceGuidance: '',
    category: '',
    approvers: [] as string[],
    responsible: [] as string[],
    topic: ''
  });

  const [ta2Approvers, setTA2Approvers] = useState<TA2Approver[]>([]);
  const [ta2Responsible, setTA2Responsible] = useState<TA2Approver[]>([]);
  const [engrManagerApprovers, setEngrManagerApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [engrManagerResponsible, setEngrManagerResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [hseLeadApprovers, setHSELeadApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [hseLeadResponsible, setHSELeadResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [directorApprovers, setDirectorApprovers] = useState<Array<{id: string; commission: string; position: string}>>([]);
  const [directorResponsible, setDirectorResponsible] = useState<Array<{id: string; commission: string; position: string}>>([]);

  // Hooks for data fetching
  const { data: categories = [] } = useChecklistCategories();
  const { data: topics = [] } = useChecklistTopics();
  const { roles } = useRoles();
  const { disciplines } = useDisciplines();
  const { commissions } = useCommissions();

  // Get distinct colors for different approver types
  const getApproverColor = (type: string, position?: string) => {
    if (type === 'regular') {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    } else if (type === 'project') {
      if (position === 'Construction Lead') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (position === 'Commissioning Lead') return 'bg-teal-50 text-teal-700 border-teal-200';
      if (position === 'Proj Manager') return 'bg-green-50 text-green-700 border-green-200';
      if (position === 'Proj Engr') return 'bg-lime-50 text-lime-700 border-lime-200';
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (type === 'asset') {
      if (position === 'ORA Engineer') return 'bg-amber-50 text-amber-700 border-amber-200';
      if (position === 'Ops Coach') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      if (position === 'Site Engineer') return 'bg-orange-50 text-orange-700 border-orange-200';
      if (position === 'Dep. Plant Director') return 'bg-red-50 text-red-700 border-red-200';
      if (position === 'Ops Team Lead') return 'bg-pink-50 text-pink-700 border-pink-200';
      return 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (type === 'ta2') {
      // Different colors for different TA2 disciplines
      if (position?.includes('Process')) return 'bg-blue-50 text-blue-700 border-blue-200';
      if (position?.includes('Elect')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      if (position?.includes('Tech Safety')) return 'bg-violet-50 text-violet-700 border-violet-200';
      if (position?.includes('Civil')) return 'bg-purple-50 text-purple-700 border-purple-200';
      if (position?.includes('Instrument')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
      if (position?.includes('Mechanical')) return 'bg-rose-50 text-rose-700 border-rose-200';
      return 'bg-blue-50 text-blue-700 border-blue-200'; // default TA2 color
    } else if (type === 'engrManager') {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    } else if (type === 'hse') {
      if (position === 'HSE Manager') return 'bg-violet-50 text-violet-700 border-violet-200';
      if (position === 'HSE Director') return 'bg-purple-50 text-purple-700 border-purple-200';
      if (position === 'ER Lead') return 'bg-pink-50 text-pink-700 border-pink-200';
      return 'bg-violet-50 text-violet-700 border-violet-200';
    } else if (type === 'hseLead') {
      // Different colors for different HSE Lead commissions
      if (position?.includes('P&E')) return 'bg-pink-50 text-pink-700 border-pink-200';
      if (position?.includes('Asset')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
      return 'bg-pink-50 text-pink-700 border-pink-200'; // default HSE Lead color
    } else if (type === 'director') {
      // Different colors for different Director commissions
      if (position?.includes('P&E')) return 'bg-sky-50 text-sky-700 border-sky-200';
      if (position?.includes('Asset')) return 'bg-blue-50 text-blue-700 border-blue-200';
      if (position?.includes('HSE')) return 'bg-teal-50 text-teal-700 border-teal-200';
      if (position === 'Plant Director') return 'bg-slate-50 text-slate-700 border-slate-200';
      return 'bg-sky-50 text-sky-700 border-sky-200'; // default Director color
    }
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getResponsibleColor = (type: string, position?: string) => {
    if (type === 'regular') {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    } else if (type === 'project') {
      if (position === 'Construction Lead') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      if (position === 'Commissioning Lead') return 'bg-teal-100 text-teal-800 border-teal-300';
      if (position === 'Proj Manager') return 'bg-green-100 text-green-800 border-green-300';
      if (position === 'Proj Engr') return 'bg-lime-100 text-lime-800 border-lime-300';
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (type === 'asset') {
      if (position === 'ORA Engineer') return 'bg-amber-100 text-amber-800 border-amber-300';
      if (position === 'Ops Coach') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      if (position === 'Site Engineer') return 'bg-orange-100 text-orange-800 border-orange-300';
      if (position === 'Dep. Plant Director') return 'bg-red-100 text-red-800 border-red-300';
      if (position === 'Ops Team Lead') return 'bg-pink-100 text-pink-800 border-pink-300';
      return 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (type === 'ta2') {
      // Distinct colors for different TA2 disciplines
      if (position?.includes('Process')) return 'bg-blue-100 text-blue-800 border-blue-300';
      if (position?.includes('Elect')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      if (position?.includes('Tech Safety')) return 'bg-violet-100 text-violet-800 border-violet-300';
      if (position?.includes('Civil')) return 'bg-purple-100 text-purple-800 border-purple-300';
      if (position?.includes('Instrument')) return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300';
      if (position?.includes('Mechanical')) return 'bg-rose-100 text-rose-800 border-rose-300';
      return 'bg-blue-100 text-blue-800 border-blue-300'; // default TA2 color
    } else if (type === 'engrManager') {
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    } else if (type === 'hse') {
      if (position === 'HSE Manager') return 'bg-violet-100 text-violet-800 border-violet-300';
      if (position === 'HSE Director') return 'bg-purple-100 text-purple-800 border-purple-300';
      if (position === 'ER Lead') return 'bg-pink-100 text-pink-800 border-pink-300';
      return 'bg-violet-100 text-violet-800 border-violet-300';
    } else if (type === 'hseLead') {
      // Distinct colors for different HSE Lead commissions
      if (position?.includes('P&E')) return 'bg-violet-100 text-violet-800 border-violet-300';
      if (position?.includes('Asset')) return 'bg-purple-100 text-purple-800 border-purple-300';
      return 'bg-pink-100 text-pink-800 border-pink-300'; // default HSE Lead color
    } else if (type === 'director') {
      // Distinct colors for different Director commissions
      if (position?.includes('P&E')) return 'bg-slate-100 text-slate-800 border-slate-300';
      if (position?.includes('Asset')) return 'bg-zinc-100 text-zinc-800 border-zinc-300';
      if (position?.includes('HSE')) return 'bg-stone-100 text-stone-800 border-stone-300';
      if (position === 'Plant Director') return 'bg-slate-200 text-slate-900 border-slate-400';
      return 'bg-neutral-100 text-neutral-800 border-neutral-300'; // default Director color
    }
    return 'bg-orange-100 text-orange-800 border-orange-300';
  };

  useEffect(() => {
    if (item) {
      setFormData({
        description: item.description || '',
        evidenceGuidance: item.required_evidence || '',
        category: item.category || '',
        topic: item.topic || '',
        approvers: [],
        responsible: [],
      });

      // Parse existing approvers and responsible parties
      if (item.Approver) {
        const approvers = item.Approver.split(', ');
        const regularApprovers: string[] = [];
        const ta2Apps: TA2Approver[] = [];
        const engrApps: Array<{id: string; commission: string; position: string}> = [];
        const hseLeadApps: Array<{id: string; commission: string; position: string}> = [];
        const directorApps: Array<{id: string; commission: string; position: string}> = [];

        approvers.forEach((approver, index) => {
          if (approver.startsWith('TA2 ')) {
            const match = approver.match(/TA2 ([^(]+)(?:\s*\(([^)]+)\))?/);
            if (match) {
              const [, discipline, commission] = match;
              ta2Apps.push({
                id: `ta2-${index}`,
                discipline: discipline.trim(),
                commission: commission?.trim() || '',
                position: approver
              });
            }
          } else if (approver.includes('Engr. Manager')) {
            const match = approver.match(/Engr\. Manager\s*\(([^)]+)\)/);
            if (match) {
              const [, commission] = match;
              engrApps.push({
                id: `engr-${index}`,
                commission: commission.trim(),
                position: approver
              });
            }
          } else if (approver.includes('HSE Lead')) {
            const match = approver.match(/HSE Lead\s*\(([^)]+)\)/);
            if (match) {
              const [, commission] = match;
              hseLeadApps.push({
                id: `hse-${index}`,
                commission: commission.trim(),
                position: approver
              });
            }
          } else if (approver.includes('Director')) {
            const match = approver.match(/(.*Director.*?)(?:\s*\(([^)]+)\))?$/);
            if (match) {
              const [, title, commission] = match;
              directorApps.push({
                id: `dir-${index}`,
                commission: commission?.trim() || '',
                position: approver
              });
            }
          } else {
            regularApprovers.push(approver);
          }
        });

        setFormData(prev => ({ ...prev, approvers: regularApprovers }));
        setTA2Approvers(ta2Apps);
        setEngrManagerApprovers(engrApps);
        setHSELeadApprovers(hseLeadApps);
        setDirectorApprovers(directorApps);
      }

      // Parse responsible parties
      if (item.responsible) {
        const responsible = item.responsible.split(', ');
        const regularResponsible: string[] = [];
        const ta2Resp: TA2Approver[] = [];
        const engrResp: Array<{id: string; commission: string; position: string}> = [];
        const hseLeadResp: Array<{id: string; commission: string; position: string}> = [];
        const directorResp: Array<{id: string; commission: string; position: string}> = [];

        responsible.forEach((resp, index) => {
          if (resp.startsWith('TA2 ')) {
            const match = resp.match(/TA2 ([^(]+)(?:\s*\(([^)]+)\))?/);
            if (match) {
              const [, discipline, commission] = match;
              ta2Resp.push({
                id: `ta2-resp-${index}`,
                discipline: discipline.trim(),
                commission: commission?.trim() || '',
                position: resp
              });
            }
          } else if (resp.includes('Engr. Manager')) {
            const match = resp.match(/Engr\. Manager\s*\(([^)]+)\)/);
            if (match) {
              const [, commission] = match;
              engrResp.push({
                id: `engr-resp-${index}`,
                commission: commission.trim(),
                position: resp
              });
            }
          } else if (resp.includes('HSE Lead')) {
            const match = resp.match(/HSE Lead\s*\(([^)]+)\)/);
            if (match) {
              const [, commission] = match;
              hseLeadResp.push({
                id: `hse-resp-${index}`,
                commission: commission.trim(),
                position: resp
              });
            }
          } else if (resp.includes('Director')) {
            const match = resp.match(/(.*Director.*?)(?:\s*\(([^)]+)\))?$/);
            if (match) {
              const [, title, commission] = match;
              directorResp.push({
                id: `dir-resp-${index}`,
                commission: commission?.trim() || '',
                position: resp
              });
            }
          } else {
            regularResponsible.push(resp);
          }
        });

        setFormData(prev => ({ ...prev, responsible: regularResponsible }));
        setTA2Responsible(ta2Resp);
        setEngrManagerResponsible(engrResp);
        setHSELeadResponsible(hseLeadResp);
        setDirectorResponsible(directorResp);
      }
    }
  }, [item]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">View Checklist Item</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.unique_id?.replace(/^(.{2})(.{2}).*/, '$1-$2') || 'XX-YY'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Checklist Question */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              Checklist Question
            </Label>
            <div className="p-3 bg-muted/30 rounded-lg border">
              <p className="text-sm whitespace-pre-wrap">{formData.description}</p>
            </div>
          </div>

          {/* Evidence Guidance */}
          {formData.evidenceGuidance && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Evidence Guidance</Label>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap">{formData.evidenceGuidance}</p>
              </div>
            </div>
          )}

          {/* Category and Topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Category</Label>
              <div className="p-3 bg-muted/30 rounded-lg border">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {formData.category}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Topic</Label>
              <div className="p-3 bg-muted/30 rounded-lg border">
                {formData.topic ? (
                  <Badge variant="outline" className="bg-secondary/10 text-secondary-foreground border-secondary/30">
                    {formData.topic}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No topic assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Responsible Parties */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Responsible Parties</Label>
            
            {(formData.responsible.length > 0 || ta2Responsible.filter(ta2 => ta2.position).length > 0 || engrManagerResponsible.filter(engr => engr.position).length > 0 || hseLeadResponsible.filter(hse => hse.position).length > 0 || directorResponsible.filter(dir => dir.position).length > 0) ? (
              <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border">
                {/* Directors Section */}
                {directorResponsible.filter(dir => dir.position).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Director</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {directorResponsible.filter(dir => dir.position).map(dir => (
                        <Badge 
                          key={dir.id}
                          variant="secondary" 
                          className={`${getResponsibleColor('director', dir.position)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{dir.position}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Project Section */}
                {formData.responsible.filter(role => ['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr'].includes(role)).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Project</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {formData.responsible.filter(role => ['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr'].includes(role)).map((role, index) => (
                        <Badge 
                          key={`project-${role}-${index}`}
                          variant="secondary" 
                          className={`${getResponsibleColor('project', role)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{role}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Engineering Section */}
                {(engrManagerResponsible.filter(engr => engr.position).length > 0 || ta2Responsible.filter(ta2 => ta2.position).length > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Engineering</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {engrManagerResponsible.filter(engr => engr.position).map(engr => (
                        <Badge 
                          key={engr.id}
                          variant="secondary" 
                          className={`${getResponsibleColor('engrManager')} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{engr.position}</span>
                        </Badge>
                      ))}
                      {ta2Responsible.filter(ta2 => ta2.position).map(ta2 => (
                        <Badge 
                          key={ta2.id}
                          variant="secondary" 
                          className={`${getResponsibleColor('ta2', ta2.position)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{ta2.position}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asset Section */}
                {formData.responsible.filter(role => ['ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead'].includes(role)).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Asset</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {formData.responsible.filter(role => ['ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead'].includes(role)).map((role, index) => (
                        <Badge 
                          key={`asset-${role}-${index}`}
                          variant="secondary" 
                          className={`${getResponsibleColor('asset', role)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{role}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* HSE Section */}
                {(hseLeadResponsible.filter(hse => hse.position).length > 0 || formData.responsible.filter(role => ['HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).length > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-pink-700 uppercase tracking-wider">HSE</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {hseLeadResponsible.filter(hse => hse.position).map(hse => (
                        <Badge 
                          key={hse.id}
                          variant="secondary" 
                          className={`${getResponsibleColor('hseLead', hse.position)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{hse.position}</span>
                        </Badge>
                      ))}
                      {formData.responsible.filter(role => ['HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).map((role, index) => (
                        <Badge 
                          key={`hse-${role}-${index}`}
                          variant="secondary" 
                          className={`${getResponsibleColor('hse', role)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{role}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Other Roles Section */}
                {formData.responsible.filter(role => !['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr', 'ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead', 'HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Other Roles</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {formData.responsible.filter(role => !['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr', 'ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead', 'HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).map((resp, index) => (
                        <Badge 
                          key={`other-resp-${resp}-${index}`}
                          variant="secondary" 
                          className={`${getResponsibleColor('regular')} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{resp}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg border">
                <span className="text-sm text-muted-foreground italic">No responsible parties assigned</span>
              </div>
            )}
          </div>

          {/* Approvers */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Approvers</Label>
            
            {(formData.approvers.length > 0 || ta2Approvers.filter(ta2 => ta2.position).length > 0 || engrManagerApprovers.filter(engr => engr.position).length > 0 || hseLeadApprovers.filter(hse => hse.position).length > 0 || directorApprovers.filter(dir => dir.position).length > 0) ? (
              <div className="grid gap-4 p-4 bg-muted/30 rounded-lg border">
                {/* Engineering Section */}
                {(engrManagerApprovers.filter(engr => engr.position).length > 0 || ta2Approvers.filter(ta2 => ta2.position).length > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Engineering</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {engrManagerApprovers.filter(engr => engr.position).map(engr => (
                        <Badge 
                          key={engr.id}
                          variant="secondary" 
                          className={`${getApproverColor('engrManager')} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{engr.position}</span>
                        </Badge>
                      ))}
                      {ta2Approvers.filter(ta2 => ta2.position).map(ta2 => (
                        <Badge 
                          key={ta2.id}
                          variant="secondary" 
                          className={`${getApproverColor('ta2', ta2.position)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{ta2.position}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Section */}
                {formData.approvers.filter(role => ['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr'].includes(role)).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Project</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {formData.approvers.filter(role => ['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr'].includes(role)).map((role, index) => (
                        <Badge 
                          key={`project-app-${role}-${index}`}
                          variant="secondary" 
                          className={`${getApproverColor('project', role)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{role}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Asset Section */}
                {formData.approvers.filter(role => ['ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead'].includes(role)).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Asset</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {formData.approvers.filter(role => ['ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead'].includes(role)).map((role, index) => (
                        <Badge 
                          key={`asset-app-${role}-${index}`}
                          variant="secondary" 
                          className={`${getApproverColor('asset', role)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{role}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* HSE Section */}
                {(hseLeadApprovers.filter(hse => hse.position).length > 0 || formData.approvers.filter(role => ['HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).length > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-pink-700 uppercase tracking-wider">HSE</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {hseLeadApprovers.filter(hse => hse.position).map(hse => (
                        <Badge 
                          key={hse.id}
                          variant="secondary" 
                          className={`${getApproverColor('hseLead', hse.position)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{hse.position}</span>
                        </Badge>
                      ))}
                      {formData.approvers.filter(role => ['HSE Manager', 'HSE Director', 'ER Lead'].includes(role)).map((role, index) => (
                        <Badge 
                          key={`hse-app-${role}-${index}`}
                          variant="secondary" 
                          className={`${getApproverColor('hse', role)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{role}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Directors Section */}
                {(directorApprovers.filter(dir => dir.position).length > 0 || formData.approvers.filter(role => ['Plant Director'].includes(role)).length > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Director</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {directorApprovers.filter(dir => dir.position).map(dir => (
                        <Badge 
                          key={dir.id}
                          variant="secondary" 
                          className={`${getApproverColor('director', dir.position)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{dir.position}</span>
                        </Badge>
                      ))}
                      {formData.approvers.filter(role => ['Plant Director'].includes(role)).map((role, index) => (
                        <Badge 
                          key={`director-app-${role}-${index}`}
                          variant="secondary" 
                          className={`${getApproverColor('director', role)} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{role}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Other Roles Section */}
                {formData.approvers.filter(role => !['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr', 'ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead', 'HSE Manager', 'HSE Director', 'ER Lead', 'Plant Director'].includes(role)).length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Other Roles</Label>
                      <div className="h-px bg-border flex-1 ml-2"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {formData.approvers.filter(role => !['Construction Lead', 'Commissioning Lead', 'Proj Manager', 'Proj Engr', 'ORA Engineer', 'ORA Engr', 'Ops Coach', 'Site Engineer', 'Site Engr', 'Dep. Plant Director', 'Dep Plant Director', 'Ops Team Lead', 'HSE Manager', 'HSE Director', 'ER Lead', 'Plant Director'].includes(role)).map((approver, index) => (
                        <Badge 
                          key={`other-app-${approver}-${index}`}
                          variant="secondary" 
                          className={`${getApproverColor('regular')} w-full justify-center py-1.5 px-2 text-xs border truncate`}
                        >
                          <span className="font-medium truncate">{approver}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg border">
                <span className="text-sm text-muted-foreground italic">No approvers assigned</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewChecklistItemModal;
