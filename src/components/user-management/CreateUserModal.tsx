import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser?: (userData: any) => void;
  onUserCreated?: () => void;
}

const CreateUserModal = ({ isOpen, onClose, onCreateUser }: CreateUserModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    isFunctionalEmail: false,
    personalEmail: "",
    phone: "",
    company: "",
    otherCompany: "",
    role: "",
    otherRole: "",
    discipline: "",
    commission: "",
    privileges: [] as string[],
  });

  const [roleSearch, setRoleSearch] = useState("");

  const companies = [
    { value: "BGC", label: "BGC" },
    { value: "Kent", label: "Kent" },
    { value: "Others", label: "Others (specify)" },
  ];

  const roles = [
    "Project Manager",
    "Commissioning Lead",
    "Construction Lead", 
    "Technical Authority (TA2)",
    "Plant Director",
    "Deputy Plant Director",
    "Operations Coach",
    "Operation Readiness & Assurance Engineer",
    "Site Engineer",
    "Ops HSE Lead",
    "Project HSE Lead",
    "ER Lead",
    "Production Director",
    "HSE Director",
    "P&E Director",
    "Others (specify)"
  ];

  const disciplines = [
    { value: "Civil", label: "Civil" },
    { value: "Static", label: "Static" },
    { value: "PACO", label: "PACO" },
    { value: "Process", label: "Process" },
    { value: "Technical Safety", label: "Technical Safety" },
  ];

  const commissions = [
    { value: "Asset", label: "Asset" },
    { value: "Project and Engineering", label: "Project and Engineering" },
  ];

  const availablePrivileges = [
    "Complete assigned tasks or delegate",
    "Edit PSSR Checklist item Default approvers and PSSR Approvers",
    "Edit or Create New User",
    "Edit or Create New Project",
    "Edit or Create New PSSR Master Checklist",
  ];

  const filteredRoles = roles.filter(role =>
    role.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrivilegeToggle = (privilege: string) => {
    setFormData(prev => ({
      ...prev,
      privileges: prev.privileges.includes(privilege)
        ? prev.privileges.filter(p => p !== privilege)
        : [...prev.privileges, privilege]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const userData = {
      id: Date.now().toString(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      isFunctionalEmail: formData.isFunctionalEmail,
      personalEmail: formData.personalEmail,
      phone: formData.phone,
      company: formData.company === "Others" ? formData.otherCompany : formData.company,
      role: formData.role === "Others (specify)" ? formData.otherRole : formData.role,
      discipline: formData.discipline,
      commission: formData.commission,
      privileges: formData.privileges,
      status: formData.company === "BGC" || formData.company === "Kent" ? "active" : "pending",
      associatedProjects: [],
      pendingActions: 0,
      createdAt: new Date().toISOString(),
    };

    onCreateUser(userData);
    
    toast({
      title: "User Created",
      description: `${userData.firstName} ${userData.lastName} has been successfully created.`,
    });

    // Reset form
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      isFunctionalEmail: false,
      personalEmail: "",
      phone: "",
      company: "",
      otherCompany: "",
      role: "",
      otherRole: "",
      discipline: "",
      commission: "",
      privileges: [],
    });
    setRoleSearch("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="functionalEmail"
                    checked={formData.isFunctionalEmail}
                    onCheckedChange={(checked) => handleInputChange("isFunctionalEmail", checked)}
                  />
                  <Label htmlFor="functionalEmail">Mark as Functional Email</Label>
                </div>
              </div>

              {formData.isFunctionalEmail && (
                <div>
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={formData.personalEmail}
                    onChange={(e) => handleInputChange("personalEmail", e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Company & Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company & Role Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company">Company *</Label>
                <Select onValueChange={(value) => handleInputChange("company", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.value} value={company.value}>
                        {company.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.company === "Others" && (
                <div>
                  <Label htmlFor="otherCompany">Specify Company</Label>
                  <Input
                    id="otherCompany"
                    value={formData.otherCompany}
                    onChange={(e) => handleInputChange("otherCompany", e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="role">Role *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search roles..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    className="pl-10 mb-2"
                  />
                </div>
                <Select onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "Others (specify)" && (
                <div>
                  <Label htmlFor="otherRole">Specify Role</Label>
                  <Input
                    id="otherRole"
                    value={formData.otherRole}
                    onChange={(e) => handleInputChange("otherRole", e.target.value)}
                    placeholder="Enter role"
                  />
                </div>
              )}

              {formData.role === "Technical Authority (TA2)" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discipline">Discipline</Label>
                    <Select onValueChange={(value) => handleInputChange("discipline", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select discipline" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplines.map((discipline) => (
                          <SelectItem key={discipline.value} value={discipline.value}>
                            {discipline.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="commission">Commission</Label>
                    <Select onValueChange={(value) => handleInputChange("commission", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select commission" />
                      </SelectTrigger>
                      <SelectContent>
                        {commissions.map((commission) => (
                          <SelectItem key={commission.value} value={commission.value}>
                            {commission.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Privileges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privileges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availablePrivileges.map((privilege) => (
                  <div key={privilege} className="flex items-center space-x-2">
                    <Checkbox
                      id={privilege}
                      checked={formData.privileges.includes(privilege)}
                      onCheckedChange={() => handlePrivilegeToggle(privilege)}
                    />
                    <Label htmlFor={privilege} className="text-sm">
                      {privilege}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Create User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;