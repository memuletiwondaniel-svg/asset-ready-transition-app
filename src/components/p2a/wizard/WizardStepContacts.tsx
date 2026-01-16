import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, Wrench, ArrowRight } from 'lucide-react';

export interface HandoverContact {
  name: string;
  role: string;
  email: string;
}

interface WizardStepContactsProps {
  deliveringParty: HandoverContact;
  receivingParty: HandoverContact;
  maintenanceParty: HandoverContact;
  onDeliveringPartyChange: (contact: HandoverContact) => void;
  onReceivingPartyChange: (contact: HandoverContact) => void;
  onMaintenancePartyChange: (contact: HandoverContact) => void;
}

interface ContactCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  contact: HandoverContact;
  onChange: (contact: HandoverContact) => void;
  iconBgColor: string;
}

const ContactCard: React.FC<ContactCardProps> = ({
  title,
  description,
  icon,
  contact,
  onChange,
  iconBgColor,
}) => (
  <Card>
    <CardHeader className="pb-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBgColor}`}>
          {icon}
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-sm">Contact Name</Label>
        <Input
          placeholder="Full name..."
          value={contact.name}
          onChange={(e) => onChange({ ...contact, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Role / Position</Label>
        <Input
          placeholder="e.g., Project Manager, OIM..."
          value={contact.role}
          onChange={(e) => onChange({ ...contact, role: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Email</Label>
        <Input
          type="email"
          placeholder="email@company.com"
          value={contact.email}
          onChange={(e) => onChange({ ...contact, email: e.target.value })}
        />
      </div>
    </CardContent>
  </Card>
);

export const WizardStepContacts: React.FC<WizardStepContactsProps> = ({
  deliveringParty,
  receivingParty,
  maintenanceParty,
  onDeliveringPartyChange,
  onReceivingPartyChange,
  onMaintenancePartyChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Visual Flow Indicator */}
      <div className="flex items-center justify-center gap-4 py-4 px-6 bg-muted/30 rounded-lg">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-1">
            <Briefcase className="h-5 w-5 text-blue-500" />
          </div>
          <span className="text-xs font-medium">Projects</span>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-1">
            <Users className="h-5 w-5 text-green-500" />
          </div>
          <span className="text-xs font-medium">Operations</span>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-1">
            <Wrench className="h-5 w-5 text-purple-500" />
          </div>
          <span className="text-xs font-medium">Maintenance</span>
        </div>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ContactCard
          title="Delivering Party"
          description="Project team representative"
          icon={<Briefcase className="h-4 w-4 text-blue-500" />}
          iconBgColor="bg-blue-500/10"
          contact={deliveringParty}
          onChange={onDeliveringPartyChange}
        />
        
        <ContactCard
          title="Receiving Party"
          description="Operations team representative"
          icon={<Users className="h-4 w-4 text-green-500" />}
          iconBgColor="bg-green-500/10"
          contact={receivingParty}
          onChange={onReceivingPartyChange}
        />
        
        <ContactCard
          title="Maintenance Party"
          description="Maintenance team representative"
          icon={<Wrench className="h-4 w-4 text-purple-500" />}
          iconBgColor="bg-purple-500/10"
          contact={maintenanceParty}
          onChange={onMaintenancePartyChange}
        />
      </div>

      <p className="text-sm text-muted-foreground text-center">
        These contacts will be notified about handover milestones and action items.
      </p>
    </div>
  );
};
