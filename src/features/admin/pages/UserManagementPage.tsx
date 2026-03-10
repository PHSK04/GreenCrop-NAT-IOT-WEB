import { useState, useEffect } from "react";
import { authService, User } from "@/features/auth/services/authService";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, User as UserIcon, Loader2, Trash2, ShieldCheck, MoreHorizontal, Eye, EyeOff, Briefcase, Mail, MapPin, PenLine, KeyRound, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  
  // Security Check State
  const [isSecurityCheckOpen, setIsSecurityCheckOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleViewDetails = (user: User) => {
    setViewingUser(user);
    setIsViewOpen(true);
  };
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await authService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;
    try {
        await authService.deleteUser(user.id);
        setUsers(users.filter(u => u.id !== user.id));
        toast.success("User deleted successfully");
    } catch (error) {
        toast.error("Failed to delete user");
    }
  };

  const handleUpdateRole = async (user: User, newRole: 'admin' | 'user') => {
    try {
        await authService.updateUserRole(user.id, newRole);
        setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        toast.success(`User role updated to ${newRole}`);
    } catch (error) {
        toast.error("Failed to update role");
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditLocation(user.location || "");
    setEditBio(user.bio || "");
    setEditTitle(user.title || "");
    setEditNotes(user.notes || "");
    setEditPassword(user.plain_password || ""); // Show current password
    setShowPassword(false); // Reset password visibility
    setIsDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
        const updateData: any = { 
            name: editName, 
            email: editEmail,
            location: editLocation,
            bio: editBio,
            title: editTitle,
            notes: editNotes
        };
        
        // Only include password if it's been changed
        if (editPassword.trim() !== "") {
            updateData.password = editPassword;
        }
        
        await authService.updateUser(editingUser.id, updateData);
        setUsers(users.map(u => u.id === editingUser.id ? { 
            ...u, 
            name: editName, 
            email: editEmail,
            location: editLocation,
            bio: editBio,
            title: editTitle,
            notes: editNotes
        } : u));
        toast.success("User updated successfully");
        setIsDialogOpen(false);
        setEditPassword(""); // Clear password field
        setShowPassword(false); // Reset password visibility
    } catch (error) {
        toast.error("Failed to update user");
    }
  };

  const handleVerifyAdminPassword = async () => {
    setIsVerifying(true);
    try {
        // Assume current admin email is 'admin@smartiot.com' or get from context/local storage
        // A better way is to get the current user from session or context, 
        // but for now let's assume the current user is checking against their own email.
        // We'll use the email from localStorage 'smart_iot_session'
        const session = localStorage.getItem('smart_iot_session');
        const currentUser = session ? JSON.parse(session) : null;
        
        if (!currentUser) {
            toast.error("Session expired, please login again");
            return;
        }

        const isValid = await authService.verifyPassword(currentUser.email, adminPasswordInput);
        
        if (isValid) {
            setShowPassword(true);
            setIsSecurityCheckOpen(false);
            setAdminPasswordInput("");
            toast.success("Identity verified");
        } else {
            toast.error("Incorrect password");
        }
    } catch (err) {
        toast.error("Verification failed");
    } finally {
        setIsVerifying(false);
    }
  };

  const handlePasswordToggle = () => {
    setShowPassword((v) => !v);
  };

  return (
    <div className="p-8 space-y-8 text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-2">View and manage authorized personnel.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={loadUsers} variant="outline" size="sm">
                Refresh List
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-emerald-500/20 bg-white/75 backdrop-blur dark:bg-slate-900/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-white/75 backdrop-blur dark:bg-slate-900/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</div>
            </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white/75 shadow-sm backdrop-blur-sm dark:bg-slate-900/70">
        <Table>
          <TableHeader className="bg-slate-100/70 dark:bg-slate-800/45">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>User / Location</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role / Title</TableHead>
              <TableHead>Registered Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading users...
                        </div>
                    </TableCell>
                </TableRow>
            ) : users.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No users found.
                    </TableCell>
                </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">{user.id.toString().substring(0, 8)}...</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.location || "No Location"}</span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                        <Badge variant={user.role === 'admin' ? "default" : "secondary"} className={`w-fit ${user.role === 'admin' ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20" : ""}`}>
                            {user.role}
                        </Badge>
                        {user.title && <span className="text-xs text-muted-foreground">{user.title}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                        className="h-8 border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                      >
                        <UserIcon className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditClick(user)}
                        className="h-8 border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                      >
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
                            Copy Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleUpdateRole(user, user.role === 'admin' ? 'user' : 'admin')}>
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => handleDeleteUser(user)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-white text-slate-900 border-slate-200">
             <DialogHeader className="border-b border-slate-200 pb-3">
                 <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">Edit User Profile</DialogTitle>
             </DialogHeader>
             <div className="grid gap-4 py-4">
                 <div className="space-y-1">
                     <Label htmlFor="name" className="text-slate-800 font-semibold">Name</Label>
                     <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-500"
                     />
                     <p className="text-xs text-slate-600">
                         <span className="inline-flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" /> Full name</span>
                     </p>
                 </div>

                 <div className="space-y-1">
                     <Label htmlFor="title" className="text-slate-800 font-semibold">Title/Role</Label>
                     <Input
                        id="title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="e.g. Farm Manager, Technician"
                        className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-500"
                     />
                     <p className="text-xs text-slate-600">
                         <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Job title shown on profile</span>
                     </p>
                 </div>

                 <div className="space-y-1">
                     <Label htmlFor="email" className="text-slate-800 font-semibold">Email</Label>
                     <Input
                        id="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-500"
                     />
                     <p className="text-xs text-slate-600">
                         <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Login email address</span>
                     </p>
                 </div>

                 <div className="space-y-1">
                     <Label htmlFor="location" className="text-slate-800 font-semibold">Location</Label>
                     <Input
                        id="location"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="e.g. Bangkok, Thailand"
                        className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-500"
                     />
                     <p className="text-xs text-slate-600">
                         <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> City or region</span>
                     </p>
                 </div>

                 <div className="space-y-1">
                     <Label htmlFor="bio" className="text-slate-800 font-semibold">Bio</Label>
                     <Input
                        id="bio"
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Short description about the user"
                        className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-500"
                     />
                     <p className="text-xs text-slate-600">
                         <span className="inline-flex items-center gap-1"><PenLine className="h-3.5 w-3.5" /> Brief profile summary</span>
                     </p>
                 </div>

                 <div className="space-y-1">
                     <Label htmlFor="password" className="text-slate-800 font-semibold">New Password</Label>
                     <div className="relative">
                         <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Current password (editable)"
                            className="pr-10 bg-white text-slate-900 border-slate-300 placeholder:text-slate-500"
                         />
                         <Button
                             type="button"
                             variant="ghost"
                             size="sm"
                             className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                             onClick={handlePasswordToggle}
                         >
                             {showPassword ? (
                                 <EyeOff className="h-4 w-4 text-slate-600" />
                             ) : (
                                 <Eye className="h-4 w-4 text-slate-600" />
                             )}
                         </Button>
                     </div>
                     <p className="text-xs text-slate-600">
                         <span className="inline-flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Click the eye icon to show or hide</span>
                     </p>
                     {!editPassword && (
                        <p className="text-xs text-amber-600">
                            No old password stored for this user (social login/migrated account).
                        </p>
                     )}
                 </div>

                 <div className="space-y-1">
                     <Label htmlFor="notes" className="text-slate-800 font-semibold">Admin Notes</Label>
                     <Textarea
                        id="notes"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Internal notes about this user (only visible to admins)"
                        rows={3}
                        className="bg-white text-slate-900 border-slate-300 placeholder:text-slate-500"
                     />
                     <p className="text-xs text-slate-600">
                         <span className="inline-flex items-center gap-1"><NotebookPen className="h-3.5 w-3.5" /> Private admin-only notes</span>
                     </p>
                 </div>
             </div>
             <DialogFooter className="border-t border-slate-200 pt-3">
                 <Button type="submit" onClick={handleSaveEdit}>Save changes</Button>
             </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Security Check Dialog */}
      <Dialog open={isSecurityCheckOpen} onOpenChange={setIsSecurityCheckOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Security Verification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                    Please enter your admin password to view this user's sensitive information.
                </p>
                <div className="space-y-2">
                    <Label htmlFor="admin-pass">Admin Password</Label>
                    <Input 
                        id="admin-pass" 
                        type="password" 
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="Enter your password"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleVerifyAdminPassword();
                        }}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsSecurityCheckOpen(false)}>Cancel</Button>
                <Button onClick={handleVerifyAdminPassword} disabled={isVerifying}>
                    {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Verify Identity
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900 border-slate-200 [&>button]:text-slate-500 [&>button]:hover:text-slate-700">
            <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-slate-900">User Profile</DialogTitle>
            </DialogHeader>
            {viewingUser && (
                <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-100 rounded-xl border border-slate-200">
                        <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center overflow-hidden mb-4 border-2 border-slate-200 shadow-sm">
                            {viewingUser.avatar ? (
                                <img src={viewingUser.avatar} alt={viewingUser.name} className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-10 w-10 text-slate-500" />
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">{viewingUser.name}</h3>
                        <p className="text-emerald-600 font-medium">{viewingUser.title || viewingUser.role}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <Users className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Email</p>
                                <p className="text-sm font-medium break-all text-slate-900">{viewingUser.email}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                            <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Location</p>
                                <p className="text-sm font-medium text-slate-900">{viewingUser.location || "Not specified"}</p>
                            </div>
                        </div>

                        {viewingUser.bio && (
                            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-sm italic text-slate-700">
                                "{viewingUser.bio}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
