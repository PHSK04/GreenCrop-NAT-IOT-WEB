import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Mail, Sprout, Sun, Cloud, Leaf } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { toast } from "sonner"

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginProps {
    onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "admin@smartiot.com",
            password: "password123",
        },
    });

    async function onSubmit(data: LoginFormValues) {
        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);

            if (data.email === "admin@smartiot.com" && data.password === "password123") {
                toast.success("Welcome back, Farmer!", {
                    description: "Ready to check your crops?",
                });
                onLogin();
            } else {
                toast.error("Oops! Wrong credentials", {
                    description: "Please check your email and password."
                });
            }
        }, 1000);
    }

    return (
        <div className="w-full lg:grid lg:grid-cols-2 min-h-screen bg-slate-950 text-slate-100">
            {/* Left Side - Visual Showcase */}
            <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-green-500 to-emerald-700 text-white p-12 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-10 left-10 opacity-20 animate-pulse">
                    <Cloud size={120} />
                </div>
                <div className="absolute bottom-20 right-10 opacity-20 animate-bounce" style={{ animationDuration: '3s' }}>
                    <Sun size={100} />
                </div>
                <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-slate-900/50 backdrop-blur-md/10 rounded-full blur-3xl pointer-events-none" />

                <div className="z-10 text-center space-y-6">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md/20 blur-xl rounded-full" />
                        <Sprout size={80} className="relative z-10 text-yellow-300 drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-extrabold tracking-tight mb-2">Smart Farm IoT</h1>
                        <p className="text-xl text-green-100 font-medium">Cultivating the Future of Agriculture</p>
                    </div>
                    <div className="flex gap-4 justify-center mt-8">
                        <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
                            <Leaf className="w-6 h-6 text-green-200" />
                            <span className="text-xs font-semibold">Sustainable</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
                            <Sun className="w-6 h-6 text-yellow-200" />
                            <span className="text-xs font-semibold">Efficient</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
                            <Cloud className="w-6 h-6 text-blue-200" />
                            <span className="text-xs font-semibold">Smart</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex items-center justify-center p-8 lg:p-12 relative">
                {/* Mobile Header (Visible only on small screens) */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600 lg:hidden" />

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left space-y-2">
                        <div className="lg:hidden flex justify-center mb-4">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <Sprout className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-100">Welcome Back</h2>
                        <p className="text-slate-400">Sign in to manage your smart farm dashboard</p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input
                                                    placeholder="farmer@smartiot.com"
                                                    className="pl-10 h-11 bg-slate-800/30 border-slate-800 focus:border-green-500 transition-colors"
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
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Password</FormLabel>
                                            <a href="#" className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline dark:text-green-400">
                                                Forgot password?
                                            </a>
                                        </div>
                                        <FormControl>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    className="pl-10 h-11 bg-slate-800/30 border-slate-800 focus:border-green-500 transition-colors"
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
                                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all hover:scale-[1.02]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Cultivating Access...
                                    </>
                                ) : (
                                    "Sign In to Farm"
                                )}
                            </Button>
                        </form>
                    </Form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-muted" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-950 px-2 text-slate-400">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" type="button" disabled className="h-10 rounded-xl">
                            Google
                        </Button>
                        <Button variant="outline" type="button" disabled className="h-10 rounded-xl">
                            Apple
                        </Button>
                    </div>

                    <p className="text-center text-sm text-slate-400 mt-8">
                        New to Smart Farm?{" "}
                        <a href="#" className="font-semibold text-green-600 hover:text-green-700 dark:text-green-400">
                            Create an account
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
