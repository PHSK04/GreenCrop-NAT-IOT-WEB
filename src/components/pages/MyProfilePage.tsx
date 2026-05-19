import { useState, useEffect } from "react";
import {
    User,
    MapPin,
    Mail,
    Sprout,
    Droplets,
    Award,
    Calendar,
    Leaf,
    Save,
    X,
    LogOut,
    Edit3,
    Waves,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/contexts/AuthContext";

interface MyProfilePageProps {
    onLogout: () => void;
    language?: string;
}

export function MyProfilePage({ onLogout, language = "TH" }: MyProfilePageProps) {
    const isTH = language === "TH";
    const { user, updateProfile } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || "/api";
    const [isEditing, setIsEditing] = useState(false);
    const defaultRole = user?.role === 'admin' ? "System Administrator" : isTH ? "ผู้ดูแลบ่อไข่ผำ" : "Wolffia Pond Operator";
    const defaultLocation = isTH ? "ระบบเพาะเลี้ยงไข่ผำ GreenCrop NAT" : "GreenCrop NAT Wolffia Cultivation System";
    const defaultBio = isTH
        ? "ดูแลระบบเพาะเลี้ยงไข่ผำแบบ IoT ติดตามคุณภาพน้ำ ระดับถัง ปั๊ม และข้อมูลผลผลิตรายวัน เพื่อให้บ่ออยู่ในสภาพเหมาะสมต่อการเจริญเติบโต"
        : "Managing an IoT-enabled Wolffia cultivation system with live water quality, tank level, pump status, and daily harvest monitoring.";
    
    const [profile, setProfile] = useState({
        name: user?.name || "Guest User",
        role: user?.title || defaultRole,
        location: user?.location || defaultLocation,
        email: user?.email || "guest@example.com",
        bio: user?.bio || defaultBio,
        avatar: user?.avatar || ""
    });

    // Sync user data when it changes AND fetch fresh data from server
    useEffect(() => {
        if (user) {
            // 1. Set initial state from Context (fast)
            setProfile({
                name: user.name,
                role: user.title || defaultRole,
                location: user.location || defaultLocation,
                email: user.email,
                bio: user.bio || defaultBio,
                avatar: user.avatar || ""
            });

            // 2. Fetch LATEST data from Server (slow but accurate)
            const fetchLatestProfile = async () => {
                try {
                    const rawSession = localStorage.getItem("smart_iot_session");
                    let token = "";
                    if (rawSession) {
                        try {
                            const parsed = JSON.parse(rawSession);
                            token = parsed?.token || parsed?.user?.token || "";
                        } catch {
                            token = "";
                        }
                    }

                    // Fetch all users and find current one (since we don't have /me endpoint yet)
                    // Or fetch by ID if supported. Let's try to find in list for now.
                    const response = await fetch(`${API_URL}/users`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    });
                    if (response.ok) {
                        const users = await response.json();
                        const currentUser = users.find((u: any) => u.id === user.id || u.email === user.email);
                        
                        if (currentUser) {
                            console.log("Fetched Fresh Profile:", currentUser);
                            setProfile(prev => ({
                                ...prev,
                                name: currentUser.name || prev.name,
                                role: currentUser.title || prev.role,
                                location: currentUser.location || defaultLocation,
                                bio: currentUser.bio || defaultBio,
                                avatar: currentUser.avatar || prev.avatar
                            }));
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch fresh profile:", error);
                }
            };
            
            fetchLatestProfile();
        }
    }, [user]);

    const [editForm, setEditForm] = useState(profile);

    // Update editForm when profile changes (e.g. after fetch)
    useEffect(() => {
        setEditForm(profile);
    }, [profile]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!user) return;
        
        try {
            await updateProfile({
                name: editForm.name,
                title: editForm.role, // Map UI 'Role' input to DB 'title'
                location: editForm.location,
                email: editForm.email,
                bio: editForm.bio,
                avatar: editForm.avatar
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save profile", error);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditForm({ ...editForm, avatar: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-background p-8 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

            <div className="max-w-5xl mx-auto space-y-8 relative z-10">
                {/* Profile Header */}
                <Card className="border-border bg-card shadow-2xl rounded-[2rem] overflow-hidden transition-all hover:shadow-emerald-900/10">
                    <div className="h-40 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600 relative overflow-hidden">
                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl"></div>
                        
                        <div className="absolute top-6 right-6 z-10">
                            <Button
                                variant="destructive"
                                onClick={onLogout}
                                className="rounded-full bg-red-500 hover:bg-red-600 border-none shadow-lg px-6 font-semibold"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                {isTH ? "ออกจากระบบ" : "Log Out"}
                            </Button>
                        </div>
                        
                        <div className="absolute -bottom-16 left-10 p-1.5 bg-card/60 backdrop-blur-sm rounded-full group transition-transform hover:scale-105">
                            <div className="w-36 h-36 bg-green-50 dark:bg-green-950/50 rounded-full flex items-center justify-center border-[6px] border-card overflow-hidden relative shadow-lg">
                                {isEditing ? (
                                    <>
                                        {editForm.avatar ? (
                                            <img src={editForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
                                        )}
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                                            <label htmlFor="avatar-upload" className="cursor-pointer text-white text-sm font-bold text-center p-2 flex flex-col items-center">
                                                <Edit3 className="w-6 h-6 mb-1" />
                                                {isTH ? "เปลี่ยน" : "Change"}
                                            </label>
                                            <input
                                                type="file"
                                                id="avatar-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleAvatarChange}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    profile.avatar ? (
                                        <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    <CardContent className="pt-20 px-10 pb-10">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 mr-8">
                                {isEditing ? (
                                    <div className="space-y-4 max-w-md">
                                        <Input
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="text-3xl font-bold h-12 bg-muted/50 border-transparent hover:border-border focus:border-primary transition-colors text-foreground"
                                            placeholder="Your Name"
                                        />
                                        <Input
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                            placeholder="Your Role"
                                            className="bg-muted/50 border-transparent hover:border-border focus:border-primary transition-colors text-foreground"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-4xl font-bold text-foreground mb-1 tracking-tight">{profile.name}</h1>
                                        <p className="text-muted-foreground font-medium text-xl">{profile.role}</p>
                                    </>
                                )}

                                <div className="flex flex-col gap-3 mt-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-muted rounded-full">
                                            <MapPin className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.location}
                                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                className="h-8 text-sm max-w-xs bg-muted/50 border-transparent text-foreground"
                                                placeholder="Location"
                                            />
                                        ) : (
                                            <span>{profile.location}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-muted rounded-full">
                                            <Mail className="w-4 h-4 text-blue-500" />
                                        </div>
                                        {isEditing ? (
                                            <Input
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="h-8 text-sm max-w-xs bg-muted/50 border-transparent text-foreground"
                                                placeholder="Email"
                                            />
                                        ) : (
                                            <span>{profile.email}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-muted rounded-full">
                                            <Calendar className="w-4 h-4 text-amber-500" />
                                        </div>
                                        <span>Joined January 2025</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                {isEditing ? (
                                    <>
                                        <Button variant="outline" onClick={handleCancel} className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30 px-6">
                                            <X className="w-4 h-4 mr-2" /> {isTH ? "ยกเลิก" : "Cancel"}
                                        </Button>
                                        <Button onClick={handleSave} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 px-6">
                                            <Save className="w-4 h-4 mr-2" /> {isTH ? "บันทึกการเปลี่ยนแปลง" : "Save Changes"}
                                        </Button>
                                    </>
                                ) : (
                                    <Button onClick={handleEdit} className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 px-6">
                                        {isTH ? "แก้ไขโปรไฟล์" : "Edit Profile"}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Badge variant="secondary" className="px-4 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 text-sm font-medium rounded-full">
                                <Sprout className="w-4 h-4 mr-1.5" /> {isTH ? "เพาะเลี้ยงไข่ผำ" : "Wolffia Cultivation"}
                            </Badge>
                            <Badge variant="secondary" className="px-4 py-1.5 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 text-sm font-medium rounded-full">
                                <Droplets className="w-4 h-4 mr-1.5" /> {isTH ? "ควบคุมคุณภาพน้ำ" : "Water Quality Control"}
                            </Badge>
                            <Badge variant="secondary" className="px-4 py-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 text-sm font-medium rounded-full">
                                <Award className="w-4 h-4 mr-1.5" /> {isTH ? "ติดตามผลผลิต 2025" : "Harvest Tracking 2025"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Bio & Details */}
                    <div className="md:col-span-2 space-y-8">
                        <Card className="rounded-[2rem] shadow-lg border-border bg-card hover:shadow-xl transition-shadow duration-300">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl flex items-center gap-3 text-foreground">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                        <Leaf className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    {isTH ? "เกี่ยวกับฟาร์ม" : "About Farm"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                {isEditing ? (
                                    <Textarea
                                        value={editForm.bio}
                                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                        className="min-h-[150px] leading-relaxed bg-muted/30 border-muted focus:border-primary text-foreground resize-none p-4 rounded-xl text-base"
                                        placeholder={isTH ? "เล่าเรื่องฟาร์มของคุณ..." : "Tell us about your farm..."}
                                    />
                                ) : (
                                    <p className="text-muted-foreground leading-relaxed text-base">
                                        {profile.bio}
                                    </p>
                                )}
                                <Separator className="bg-border" />
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                                        <h4 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider mb-2">{isTH ? "พื้นที่บ่อเลี้ยง" : "Cultivation Area"}</h4>
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">4</p>
                                            <span className="text-lg font-medium text-foreground">{isTH ? "บ่อ" : "ponds"}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <span className="block w-2 h-2 rounded-full bg-emerald-500"></span>
                                            {isTH ? "บ่อเพาะเลี้ยงพร้อมเก็บข้อมูล" : "Connected cultivation ponds"}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                                        <h4 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider mb-2">{isTH ? "พืชน้ำหลัก" : "Primary Aquatic Crop"}</h4>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate">{isTH ? "ไข่ผำ" : "Wolffia"}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <span className="block w-2 h-2 rounded-full bg-emerald-500"></span>
                                            {isTH ? "บันทึกผลผลิตรายวัน" : "Daily harvest logging"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2rem] shadow-lg border-border bg-card hover:shadow-xl transition-shadow duration-300">
                            <CardHeader>
                                <CardTitle className="text-xl text-foreground flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    {isTH ? "อุปกรณ์ระบบบ่อไข่ผำ" : "Wolffia System Equipment"}
                                </CardTitle>
                                <CardDescription className="text-muted-foreground pl-12">
                                    {isTH ? "สถานะอุปกรณ์น้ำ ปั๊ม และเซนเซอร์ที่เชื่อมต่อ" : "Connected water, pump, and sensor equipment status"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/60 transition-colors rounded-2xl border border-border/50 group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                                <Waves className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground text-lg">{isTH ? "ชุดปั๊มหมุนเวียนน้ำบ่อไข่ผำ" : "Wolffia Pond Circulation Pump"}</p>
                                                <p className="text-sm text-muted-foreground">ID: PUMP-01 • <span className="text-emerald-500">{isTH ? "ทำงานปกติ" : "Running normally"}</span></p>
                                            </div>
                                        </div>
                                        <Badge className="bg-emerald-500 dark:bg-emerald-600 text-white px-3 py-1 shadow-md shadow-emerald-500/20">{isTH ? "ทำงาน" : "Active"}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/60 transition-colors rounded-2xl border border-border/50 group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
                                                <Activity className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground text-lg">{isTH ? "โมดูลควบคุม ESP32 / MQTT" : "ESP32 / MQTT Control Module"}</p>
                                                <p className="text-sm text-muted-foreground">ID: MCU-ESP32 • <span className="text-amber-500">{isTH ? "รอข้อมูลรอบถัดไป" : "Waiting for next telemetry"}</span></p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 px-3 py-1">
                                            {isTH ? "รอข้อมูล" : "Waiting"}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Key Stats */}
                    <div className="space-y-8">
                        <Card className="rounded-[2rem] shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 overflow-hidden relative">
                            {/* Decorative blur */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-3xl"></div>
                            
                            <CardHeader className="text-center pb-2 relative z-10">
                                <CardTitle className="text-lg text-emerald-800 dark:text-emerald-300 font-semibold uppercase tracking-wide">
                                    {isTH ? "คะแนนสภาพบ่อ" : "Pond Health Score"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center relative z-10 pb-10">
                                <div className="relative inline-flex items-center justify-center w-40 h-40 mb-6 shrink-0 aspect-square">
                                     {/* SVG Donut Chart */}
                                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                        {/* Background Track */}
                                        <circle 
                                            cx="50" 
                                            cy="50" 
                                            r="40" 
                                            fill="transparent" 
                                            stroke="currentColor" 
                                            strokeWidth="8"
                                            className="text-slate-200 dark:text-slate-800"
                                        />
                                        {/* Progress Circle */}
                                        <circle 
                                            cx="50" 
                                            cy="50" 
                                            r="40" 
                                            fill="transparent" 
                                            stroke="currentColor" 
                                            strokeWidth="8"
                                            strokeDasharray="251.2"
                                            strokeDashoffset={251.2 * (1 - 0.94)}
                                            strokeLinecap="round"
                                            className="text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tighter">94%</span>
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 px-4 leading-relaxed">
                                    {isTH ? "สภาพน้ำของบ่อไข่ผำอยู่ใน" : "Wolffia pond water is in"} <br/>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{isTH ? "ช่วงเหมาะสม" : "Optimal Range"}</span>
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2rem] shadow-lg border-border bg-card">
                            <CardHeader>
                                <CardTitle className="text-lg text-foreground flex items-center justify-between">
                                    {isTH ? "เครือข่ายเซนเซอร์บ่อ" : "Pond Sensor Network"}
                                    <Badge variant="outline" className="font-normal text-xs">{isTH ? "สด" : "Live"}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground font-medium">pH Sensors</span>
                                            <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded text-xs">4 / 4</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 w-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground font-medium">{isTH ? "อุณหภูมิ / DO" : "Temp / DO"}</span>
                                            <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded text-xs">4 / 4</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 w-full rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground font-medium">EC Sensors</span>
                                            <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded text-xs">3 / 4</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-red-400 to-red-500 w-[80%] rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]" />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2 text-center">
                                         <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary w-full">
                                            {isTH ? "ดูสถานะเซนเซอร์ทั้งหมด" : "View Sensor Diagnostics"}
                                         </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
