import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  FileText,
  Search,
  ChevronRight,
  Calendar,
  User,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { P2AHandoverPoint } from '../hooks/useP2AHandoverPoints';
import { AddRegisterSheet } from './AddRegisterSheet';
import { cn } from '@/lib/utils';

interface VCRRegistersTabProps {
  handoverPoint: P2AHandoverPoint;
}

export interface OperationalRegister {
  id: string;
  title: string;
  registerNumber: string;
  category: 'safety' | 'environmental' | 'operational' | 'maintenance' | 'quality';
  status: 'draft' | 'active' | 'under_review' | 'archived';
  owner: string;
  lastUpdated: string;
}

const CATEGORY_CONFIG: Record<OperationalRegister['category'], { label: string; className: string }> = {
  safety: { label: 'Safety', className: 'bg-red-50 text-red-600 border-red-300' },
  environmental: { label: 'Environmental', className: 'bg-green-50 text-green-600 border-green-300' },
  operational: { label: 'Operational', className: 'bg-blue-50 text-blue-600 border-blue-300' },
  maintenance: { label: 'Maintenance', className: 'bg-amber-50 text-amber-600 border-amber-300' },
  quality: { label: 'Quality', className: 'bg-purple-50 text-purple-600 border-purple-300' },
};

const STATUS_CONFIG: Record<OperationalRegister['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-300' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-600 border-emerald-300' },
  under_review: { label: 'Under Review', className: 'bg-blue-50 text-blue-600 border-blue-300' },
  archived: { label: 'Archived', className: 'bg-gray-50 text-gray-500 border-gray-300' },
};

export const VCRRegistersTab: React.FC<VCRRegistersTabProps> = ({ handoverPoint }) => {
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [registers, setRegisters] = useState<OperationalRegister[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRegisters = registers.filter(r =>
    searchQuery === '' ||
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.registerNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setRegisters(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-primary">{registers.length}</div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-emerald-500">
                {registers.filter(r => r.status === 'active').length}
              </div>
              <div className="text-[10px] text-muted-foreground">Active</div>
            </CardContent>
          </Card>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddSheetOpen(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Register
        </Button>
      </div>

      {/* Search */}
      {registers.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search registers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Empty State */}
      {registers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-medium text-lg">No Operational Registers</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
              Add operational registers for this handover point to track safety, environmental, and operational documentation.
            </p>
            <Button
              onClick={() => setAddSheetOpen(true)}
              className="mt-4 gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Register
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-2">
            {filteredRegisters.map((register) => (
              <RegisterCard
                key={register.id}
                register={register}
                onDelete={handleDelete}
              />
            ))}
            {filteredRegisters.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No registers match your search</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Add Register Sheet */}
      <AddRegisterSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        handoverPoint={handoverPoint}
        onRegisterCreated={(newRegister) => {
          setRegisters(prev => [...prev, newRegister]);
          setAddSheetOpen(false);
        }}
      />
    </div>
  );
};

// Register Card
const RegisterCard: React.FC<{
  register: OperationalRegister;
  onDelete: (id: string) => void;
}> = ({ register, onDelete }) => {
  const categoryInfo = CATEGORY_CONFIG[register.category];
  const statusInfo = STATUS_CONFIG[register.status];
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm group relative">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <h4 className="font-medium text-sm truncate">{register.title}</h4>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                {register.registerNumber}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
                <Badge variant="outline" className={cn('text-[10px]', categoryInfo.className)}>
                  {categoryInfo.label}
                </Badge>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <User className="w-3 h-3" />
                  {register.owner}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {register.lastUpdated}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <Badge variant="outline" className={cn('whitespace-nowrap text-[10px]', statusInfo.className)}>
                {statusInfo.label}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Register</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">"{register.title}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(register.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
