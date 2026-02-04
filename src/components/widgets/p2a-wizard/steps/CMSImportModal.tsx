import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Loader2 } from 'lucide-react';

interface CMSImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (config: CMSImportConfig) => void;
}

export interface CMSImportConfig {
  environment: string;
  projectId: string;
  apiEndpoint: string;
  apiKey: string;
}

export const CMSImportModal: React.FC<CMSImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<Partial<CMSImportConfig>>({
    environment: '',
    projectId: '',
    apiEndpoint: '',
    apiKey: '',
  });

  const handleImport = async () => {
    if (!config.environment || !config.projectId) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onImport(config as CMSImportConfig);
    setIsLoading(false);
    onOpenChange(false);
    setConfig({ environment: '', projectId: '', apiEndpoint: '', apiKey: '' });
  };

  const isValid = config.environment && config.projectId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Import from CMS</DialogTitle>
              <DialogDescription>
                Connect to Completions Management System
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm">Environment *</Label>
            <Select
              value={config.environment}
              onValueChange={(value) => setConfig(prev => ({ ...prev, environment: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select environment..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="development">Development</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">CMS Project ID *</Label>
            <Input
              value={config.projectId}
              onChange={(e) => setConfig(prev => ({ ...prev, projectId: e.target.value }))}
              placeholder="e.g., PRJ-12345"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">API Endpoint (Optional)</Label>
            <Input
              value={config.apiEndpoint}
              onChange={(e) => setConfig(prev => ({ ...prev, apiEndpoint: e.target.value }))}
              placeholder="https://cms.example.com/api/v1"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use default endpoint
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">API Key (Optional)</Label>
            <Input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter API key..."
            />
            <p className="text-xs text-muted-foreground">
              Required for private projects
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!isValid || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import Systems
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
