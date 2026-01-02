import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Layers, Search } from "lucide-react";
import { useDisciplines } from "@/hooks/useDisciplines";

const DisciplinesManagement = () => {
  const { disciplines, isLoading, addDiscipline } = useDisciplines();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState("");
  const [newDisciplineDescription, setNewDisciplineDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDisciplines = disciplines.filter((discipline) =>
    discipline.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (discipline.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleAddDiscipline = () => {
    if (newDisciplineName.trim()) {
      addDiscipline(newDisciplineName.trim());
      setNewDisciplineName("");
      setNewDisciplineDescription("");
      setShowAddModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Disciplines</h2>
            <p className="text-sm text-muted-foreground">
              Manage disciplines for user assignments
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Discipline
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search disciplines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Disciplines Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Disciplines ({filteredDisciplines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisciplines.map((discipline) => (
                  <TableRow key={discipline.id}>
                    <TableCell className="font-medium">{discipline.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {discipline.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={discipline.is_active ? "default" : "secondary"}>
                        {discipline.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(discipline.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDisciplines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No disciplines found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Discipline Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Discipline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disciplineName">Name *</Label>
              <Input
                id="disciplineName"
                placeholder="Enter discipline name"
                value={newDisciplineName}
                onChange={(e) => setNewDisciplineName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disciplineDescription">Description (optional)</Label>
              <Textarea
                id="disciplineDescription"
                placeholder="Enter description"
                value={newDisciplineDescription}
                onChange={(e) => setNewDisciplineDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDiscipline} disabled={!newDisciplineName.trim()}>
              Add Discipline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DisciplinesManagement;
