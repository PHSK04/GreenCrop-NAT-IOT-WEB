import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, Lock, User, ArrowLeft, Leaf, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import loginBg from "@/assets/images/login_bg.png";
import { ModeToggle } from "@/components/mode-toggle";

import { SocialAuth } from "./SocialAuth";

// Schema for Step 1: User Info
const registerSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Invalid email address" }),
    phone: z.string().min(10, { message: "Invalid phone number" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterProps {
    onSwitchToLogin: () => void;
}

export function Register({ onSwitchToLogin }: RegisterProps) {
    const [isLoading, setIsLoading] = useState(false);
    const gridPatternUrl = `${import.meta.env.BASE_URL}grid-pattern.svg`;
    
    // Form setup...
    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        },
    });

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    async function handleRegister(data: RegisterFormValues) {
        setIsLoading(true);
        try {
            // Direct Registration call
            const regRes = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    phone: data.phone
                })
            });

            if (!regRes.ok) throw new Error("Registration failed");

            const result = await regRes.json();
            
            toast.success("Account Created!", { 
                description: "You have successfully registered." 
            });
            
            // Redirect to login
            setTimeout(() => {
                onSwitchToLogin();
            }, 1000);

        } catch (error: any) {
             console.error(error);
             toast.error("Registration Error", { description: error.message || "Failed to create account" });
        } finally {
            setIsLoading(false);
        }
    }

    // handleSocialLogin removed (delegated to SocialAuth)

    return (
        <div className="w-full min-h-screen flex overflow-hidden bg-background font-sans relative">
            
            {/* Left Side */}
            <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden bg-slate-900 justify-center items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 z-10" />
                <div
                    className="absolute inset-0 opacity-20 z-0 pointer-events-none bg-repeat"
                    style={{ backgroundImage: `url(${gridPatternUrl})` }}
                />
                <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center opacity-40"
                    style={{ backgroundImage: `url(${loginBg})` }}
                />
                <div className="relative z-20 text-center max-w-lg p-8">
                     <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-full mb-6 border border-emerald-500/20 animate-pulse">
                        <Leaf className="w-12 h-12 text-emerald-400" />
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-6">Join the Revolution</h1>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        Secure, Verified, and Ready for Smart Farming.
                    </p>
                </div>
            </div>

            {/* Right Side */}
            <div className="w-full lg:w-[40%] flex flex-col justify-center items-center p-8 lg:p-10 bg-background relative overflow-y-auto">
                 <div className="absolute top-6 right-6 z-20">
                    <ModeToggle />
                 </div>

                 <Button
                    variant="ghost" 
                    className="absolute top-6 left-6 gap-2 text-sm text-muted-foreground hover:text-foreground"
                    onClick={onSwitchToLogin}
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </Button>

                <div className="w-full max-w-md space-y-8 mt-10 lg:mt-0">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                            Create Account
                        </h2>
                        <p className="text-muted-foreground text-base leading-relaxed">
                            Register to access the Smart Farm Control Center
                        </p>
                    </div>

                    <div className="space-y-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4" autoComplete="off">
                                {/* ... Form Fields ... */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-foreground">Full Name</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="John Doe"
                                                        className="h-11 pl-10"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        autoCapitalize="words"
                                                        spellCheck={false}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-foreground">Email</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="user@smartiot.com"
                                                        className="h-11 pl-10"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        autoCapitalize="none"
                                                        spellCheck={false}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-foreground">Phone Number</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="0812345678"
                                                        className="h-11 pl-10"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        autoCapitalize="none"
                                                        spellCheck={false}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-foreground">Password</FormLabel>
                                            <FormControl>
                                                 <div className="relative">
                                                    <Lock className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        className="h-11 pl-10"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        autoCapitalize="none"
                                                        spellCheck={false}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-semibold text-foreground">Confirm Password</FormLabel>
                                            <FormControl>
                                                 <div className="relative">
                                                    <Lock className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="password"
                                                        placeholder="••••••••"
                                                        className="h-11 pl-10"
                                                        autoComplete="off"
                                                        autoCorrect="off"
                                                        autoCapitalize="none"
                                                        spellCheck={false}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button 
                                    type="submit" 
                                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold mt-4" 
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        "Register"
                                    )}
                                </Button>
                            </form>
                        </Form>

                        <SocialAuth actionText="register" />
                    </div>
                    
                    <div className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <button 
                            onClick={onSwitchToLogin}
                            className="font-medium text-emerald-600 hover:text-emerald-500 underline underline-offset-4"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
