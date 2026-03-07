// // // login2 page//////////////////////////////////////////////////////
// // import { useState } from "react";
// // import { useForm } from "react-hook-form";
// // import { z } from "zod";
// // import { zodResolver } from "@hookform/resolvers/zod";
// // import { Loader2, Lock, Mail, Sprout, Sun, Cloud, Leaf } from "lucide-react";

// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import {
// //     Form,
// //     FormControl,
// //     FormField,
// //     FormItem,
// //     FormLabel,
// //     FormMessage,
// // } from "@/components/ui/form"
// // import { toast } from "sonner"

// // const loginSchema = z.object({
// //     email: z.string().email({ message: "Invalid email address" }),
// //     password: z.string().min(6, { message: "Password must be at least 6 characters" }),
// // });

// // type LoginFormValues = z.infer<typeof loginSchema>;

// // interface LoginProps {
// //     onLogin: () => void;
// // }

// // export function Login({ onLogin }: LoginProps) {
// //     const [isLoading, setIsLoading] = useState(false);

// //     const form = useForm<LoginFormValues>({
// //         resolver: zodResolver(loginSchema),
// //         defaultValues: {
// //             email: "admin@smartiot.com",
// //             password: "password123",
// //         },
// //     });

// //     async function onSubmit(data: LoginFormValues) {
// //         setIsLoading(true);

// //         // Simulate API call
// //         setTimeout(() => {
// //             setIsLoading(false);

// //             if (data.email === "admin@smartiot.com" && data.password === "password123") {
// //                 toast.success("Welcome back, Farmer!", {
// //                     description: "Ready to check your crops?",
// //                 });
// //                 onLogin();
// //             } else {
// //                 toast.error("Oops! Wrong credentials", {
// //                     description: "Please check your email and password."
// //                 });
// //             }
// //         }, 1000);
// //     }

// //     return (
// //         <div className="w-full lg:grid lg:grid-cols-2 min-h-screen bg-slate-950 text-slate-100">
// //             {/* Left Side - Visual Showcase */}
// //             <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-green-500 to-emerald-700 text-white p-12 relative overflow-hidden">
// //                 {/* Decorative Elements */}
// //                 <div className="absolute top-10 left-10 opacity-20 animate-pulse">
// //                     <Cloud size={120} />
// //                 </div>
// //                 <div className="absolute bottom-20 right-10 opacity-20 animate-bounce" style={{ animationDuration: '3s' }}>
// //                     <Sun size={100} />
// //                 </div>
// //                 <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-slate-900/50 backdrop-blur-md/10 rounded-full blur-3xl pointer-events-none" />

// //                 <div className="z-10 text-center space-y-6">
// //                     <div className="relative inline-block">
// //                         <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md/20 blur-xl rounded-full" />
// //                         <Sprout size={80} className="relative z-10 text-yellow-300 drop-shadow-lg" />
// //                     </div>
// //                     <div>
// //                         <h1 className="text-5xl font-extrabold tracking-tight mb-2">Smart Farm IoT</h1>
// //                         <p className="text-xl text-green-100 font-medium">Cultivating the Future of Agriculture</p>
// //                     </div>
// //                     <div className="flex gap-4 justify-center mt-8">
// //                         <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
// //                             <Leaf className="w-6 h-6 text-green-200" />
// //                             <span className="text-xs font-semibold">Sustainable</span>
// //                         </div>
// //                         <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
// //                             <Sun className="w-6 h-6 text-yellow-200" />
// //                             <span className="text-xs font-semibold">Efficient</span>
// //                         </div>
// //                         <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
// //                             <Cloud className="w-6 h-6 text-blue-200" />
// //                             <span className="text-xs font-semibold">Smart</span>
// //                         </div>
// //                     </div>
// //                 </div>
// //             </div>

// //             {/* Right Side - Login Form */}
// //             <div className="flex items-center justify-center p-8 lg:p-12 relative">
// //                 {/* Mobile Header (Visible only on small screens) */}
// //                 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600 lg:hidden" />

// //                 <div className="w-full max-w-md space-y-8">
// //                     <div className="text-center lg:text-left space-y-2">
// //                         <div className="lg:hidden flex justify-center mb-4">
// //                             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
// //                                 <Sprout className="w-8 h-8 text-green-600" />
// //                             </div>
// //                         </div>
// //                         <h2 className="text-3xl font-bold tracking-tight text-slate-100">Welcome Back</h2>
// //                         <p className="text-slate-400">Sign in to manage your smart farm dashboard</p>
// //                     </div>

// //                     <Form {...form}>
// //                         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
// //                             <FormField
// //                                 control={form.control}
// //                                 name="email"
// //                                 render={({ field }) => (
// //                                     <FormItem>
// //                                         <FormLabel>Email</FormLabel>
// //                                         <FormControl>
// //                                             <div className="relative">
// //                                                 <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
// //                                                 <Input
// //                                                     placeholder="farmer@smartiot.com"
// //                                                     className="pl-10 h-11 bg-slate-800/30 border-slate-800 focus:border-green-500 transition-colors"
// //                                                     {...field}
// //                                                 />
// //                                             </div>
// //                                         </FormControl>
// //                                         <FormMessage />
// //                                     </FormItem>
// //                                 )}
// //                             />
// //                             <FormField
// //                                 control={form.control}
// //                                 name="password"
// //                                 render={({ field }) => (
// //                                     <FormItem>
// //                                         <div className="flex items-center justify-between">
// //                                             <FormLabel>Password</FormLabel>
// //                                             <a href="#" className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline dark:text-green-400">
// //                                                 Forgot password?
// //                                             </a>
// //                                         </div>
// //                                         <FormControl>
// //                                             <div className="relative">
// //                                                 <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
// //                                                 <Input
// //                                                     type="password"
// //                                                     placeholder="••••••••"
// //                                                     className="pl-10 h-11 bg-slate-800/30 border-slate-800 focus:border-green-500 transition-colors"
// //                                                     {...field}
// //                                                 />
// //                                             </div>
// //                                         </FormControl>
// //                                         <FormMessage />
// //                                     </FormItem>
// //                                 )}
// //                             />

// //                             <Button
// //                                 type="submit"
// //                                 className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all hover:scale-[1.02]"
// //                                 disabled={isLoading}
// //                             >
// //                                 {isLoading ? (
// //                                     <>
// //                                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
// //                                         Cultivating Access...
// //                                     </>
// //                                 ) : (
// //                                     "Sign In to Farm"
// //                                 )}
// //                             </Button>
// //                         </form>
// //                     </Form>

// //                     <div className="relative">
// //                         <div className="absolute inset-0 flex items-center">
// //                             <span className="w-full border-t border-muted" />
// //                         </div>
// //                         <div className="relative flex justify-center text-xs uppercase">
// //                             <span className="bg-slate-950 px-2 text-slate-400">Or continue with</span>
// //                         </div>
// //                     </div>

// //                     <div className="grid grid-cols-2 gap-4">
// //                         <Button variant="outline" type="button" disabled className="h-10 rounded-xl">
// //                             Google
// //                         </Button>
// //                         <Button variant="outline" type="button" disabled className="h-10 rounded-xl">
// //                             Apple
// //                         </Button>
// //                     </div>

// //                     <p className="text-center text-sm text-slate-400 mt-8">
// //                         New to Smart Farm?{" "}
// //                         <a href="#" className="font-semibold text-green-600 hover:text-green-700 dark:text-green-400">
// //                             Create an account
// //                         </a>
// //                     </p>
// //                 </div>
// //             </div>
// //         </div>
// //     );
// // }

// login2ui
// import { useState, useEffect } from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Loader2, Lock, Mail, ShieldCheck, Sprout, CloudRain, Sun, Wind } from "lucide-react";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//     Form,
//     FormControl,
//     FormField,
//     FormItem,
//     FormLabel,
//     FormMessage,
// } from "@/components/ui/form"
// import { toast } from "sonner"
// import loginBg from "@/assets/images/login_bg.png";
// import { ModeToggle } from "@/components/mode-toggle";

// // --- Icons for Social Login ---
// const GoogleIcon = () => (
//    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M12.0003 20.45c4.6667 0 7.9733-3.2533 7.9733-8.16 0-.6933-.08-1.5467-.1866-2.08H12.0003v3.8933h4.64C16.3203 15.68 14.667 17.52 12.0003 17.52c-3.1467 0-5.7867-2.1867-6.72-5.12H1.9736v3.1733C3.9203 19.3333 7.6803 20.45 12.0003 20.45z" fill="#34A853"/><path d="M5.2803 12.4c-.24-.7467-.3733-1.5467-.3733-2.4s.1333-1.6533.3733-2.4V4.4267H1.9736C1.1736 6.0267.7203 7.92.7203 10s.4533 3.9733 1.2533 5.5733l3.3067-3.1733z" fill="#FBBC05"/><path d="M12.0003 6.48c2.16 0 3.8667.9067 5.0667 2.0533l2.88-2.88C18.187 3.84 15.3603 2.4 12.0003 2.4 7.6803 2.4 3.9203 3.52 1.9736 7.4267l3.3067 3.1733C6.2136 7.68 8.8536 5.4933 12.0003 5.4933c.48 0 .96.0533 1.4133.16.4533.1067.88.2933 1.28.5333l-1.92 1.92c-.2133.2133-.5067.32-.8.32-.5867 0-1.0667-.48-1.0667-1.0667 0-.5867.48-1.0667 1.0667-1.0667z" fill="#EA4335"/><path d="M12.0003 2.4c-4.32 0-8.08 1.12-10.0267 5.0267l3.3067 3.1733c.9333-2.9333 3.5733-5.12 6.72-5.12 2.6667 0 4.32 1.84 4.64 3.3867h4.64C19.9736 5.6533 16.667 2.4 12.0003 2.4z" fill="#EA4335"/></svg>
// );

// const MicrosoftIcon = () => (
//    <svg viewBox="0 0 23 23" className="w-5 h-5" aria-hidden="true"><path fill="#f3f3f3" d="M0 0h23v23H0z"/><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
// );

// const loginSchema = z.object({
//     email: z.string().email({ message: "Invalid email address" }),
//     password: z.string().min(6, { message: "Password must be at least 6 characters" }),
// });

// type LoginFormValues = z.infer<typeof loginSchema>;

// interface LoginProps {
//     onLogin: () => void;
// }

// export function Login({ onLogin }: LoginProps) {
//     const [isLoading, setIsLoading] = useState(false);
//     const [mounted, setMounted] = useState(false);

//     useEffect(() => {
//         setMounted(true);
//     }, []);

//     const form = useForm<LoginFormValues>({
//         resolver: zodResolver(loginSchema),
//         defaultValues: {
//             email: "admin@smartiot.com",
//             password: "password123",
//         },
//     });

//     // Simulate social login action
//     const handleSocialLogin = (provider: string) => {
//         setIsLoading(true);
//         // Simulate network delay
//         setTimeout(() => {
//             setIsLoading(false);
//             onLogin(); // Call the actual login function
//             toast.success(`Access Granted`, {
//                 description: `Authenticated via ${provider} Secure Protocol.`,
//                 icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />
//             });
//         }, 1200);
//     };

//     async function onSubmit(data: LoginFormValues) {
//         setIsLoading(true);

//         // Simulate API call
//         setTimeout(() => {
//             setIsLoading(false);

//             if (data.email === "admin@smartiot.com" && data.password === "password123") {
//                 toast.success("Welcome Back, Commander", {
//                     description: "Initializing Smart Farm Control Protocols...",
//                     icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
//                     duration: 2000
//                 });
//                 onLogin();
//             } else {
//                 toast.error("Access Denied", {
//                     description: "Invalid secure credentials provided.",
//                     icon: <Lock className="w-5 h-5 text-red-500" />
//                 });
//             }
//         }, 1500);
//     }

//     return (
//         <div className="w-full h-screen flex overflow-hidden bg-background font-sans relative transition-colors duration-500">
//             {/* Custom Animations Styles */}
//             <style>{`
//                 @keyframes float {
//                     0% { transform: translateY(0px); }
//                     50% { transform: translateY(-20px); }
//                     100% { transform: translateY(0px); }
//                 }
//                 @keyframes float-delay {
//                     0% { transform: translateY(0px); }
//                     50% { transform: translateY(-15px); }
//                     100% { transform: translateY(0px); }
//                 }
//                 @keyframes pulse-glow {
//                     0%, 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
//                     50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.5); }
//                 }
//                 @keyframes drift {
//                     0% { background-position: 0% 50%; }
//                     50% { background-position: 100% 50%; }
//                     100% { background-position: 0% 50%; }
//                 }
//                 .animate-float { animation: float 6s ease-in-out infinite; }
//                 .animate-float-delay { animation: float-delay 8s ease-in-out infinite; }
//                 .animate-pulse-glow { animation: pulse-glow 3s infinite; }
//                 .bg-size-200 { background-size: 200% 200%; }
//                 .animate-drift { animation: drift 15s ease infinite; }
//             `}</style>
            
//             {/* Left Side - Hero / Immersion */}
//             <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden bg-slate-100 dark:bg-slate-900 justify-center items-center transition-colors duration-500">
//                 <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/40 to-emerald-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/40 z-10 dark:mix-blend-multiply" />
//                 <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 dark:opacity-20 z-0 pointer-events-none" />

//                 {/* Animated Background Image */}
//                 <div 
//                     className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-[30s] ease-linear transform scale-105 hover:scale-110 opacity-20 dark:opacity-100"
//                     style={{ backgroundImage: `url(${loginBg})` }}
//                 />

//                 {/* Floating Elements Removed */}
//                 <div className="absolute z-10 w-full h-full pointer-events-none">
//                     {/* Atmosphere icons removed as requested */}
//                 </div>

//                 <div className="relative z-20 px-12 text-left max-w-xl backdrop-blur-md bg-white/40 dark:bg-slate-900/60 p-8 rounded-3xl border border-white/40 dark:border-white/10 shadow-2xl transition-all duration-500">
//                     <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-600/20 dark:border-emerald-400/30 bg-emerald-600/10 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide mb-6 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse-glow">
//                         <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
//                         SYSTEM ONLINE
//                     </div>
                    
//                     <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400 leading-tight tracking-tighter mb-6 filter drop-shadow-sm dark:drop-shadow-lg">
//                         Smart Farm <br />
//                         <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-700 dark:from-emerald-400 dark:to-green-600 bg-size-200 animate-drift">OS v2.0</span>
//                     </h1>
                    
//                     <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-10 font-normal dark:font-light max-w-md">
//                         The future of agriculture is data-driven. Authenticate to access real-time biometrics, automated irrigation, and drone fleet command.
//                     </p>
                    
//                     <div className="grid grid-cols-2 gap-6 border-t border-slate-200 dark:border-white/10 pt-8">
//                         <div className="group cursor-default">
//                             <h3 className="text-3xl font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">99.9%</h3>
//                             <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
//                                 <span className="w-1 h-1 bg-emerald-600 dark:bg-emerald-500 rounded-full" /> 
//                                 Uptime Guarantee
//                             </p>
//                         </div>
//                         <div className="group cursor-default">
//                             <h3 className="text-3xl font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">0ms</h3>
//                             <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
//                                 <span className="w-1 h-1 bg-blue-600 dark:bg-blue-500 rounded-full" /> 
//                                 Latency (EdgeNet)
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Right Side - Interactive Login Form */}
//             <div className="w-full lg:w-[40%] flex flex-col justify-center items-center p-8 bg-background relative overflow-hidden transition-colors duration-500">
                
//                 {/* Theme Toggle */}
//                 <div className="absolute top-6 right-6 z-20">
//                     <ModeToggle />
//                 </div>

//                 {/* Dynamic Background Glows */}
//                 <div className={`absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-[100px] transition-all duration-1000 ${isLoading ? 'scale-150 opacity-80 bg-emerald-500/20' : 'scale-100 opacity-50'}`} />
//                 <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-[100px] transition-all duration-1000 animate-pulse" />

//                 <div className={`w-full max-w-sm space-y-8 z-10 transition-all duration-700 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    
//                     <div className="text-center">
//                         <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-green-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] transform rotate-3 hover:rotate-6 transition-transform cursor-pointer">
//                             <Sprout className="w-8 h-8 text-white" />
//                         </div>
//                         <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Command Center</h2>
//                         <p className="text-muted-foreground text-sm">Verify identity to establish secure connection.</p>
//                     </div>

//                     <Form {...form}>
//                         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//                             <FormField
//                                 control={form.control}
//                                 name="email"
//                                 render={({ field }) => (
//                                     <FormItem className="space-y-1">
//                                         <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold ml-1">Identity</FormLabel>
//                                         <FormControl>
//                                             <div className="relative group">
//                                                 <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center pointer-events-none">
//                                                     <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors duration-300" />
//                                                 </div>
//                                                 <Input
//                                                     placeholder="admin@smartiot.com"
//                                                     className="pl-10 h-12 bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all rounded-xl"
//                                                     {...field}
//                                                 />
//                                                 <div className="absolute right-3 top-3.5 h-2 w-2 rounded-full bg-border group-focus-within:bg-emerald-500 transition-colors duration-300" />
//                                             </div>
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />
//                             <FormField
//                                 control={form.control}
//                                 name="password"
//                                 render={({ field }) => (
//                                     <FormItem className="space-y-1">
//                                          <div className="flex items-center justify-between ml-1">
//                                             <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Passcode</FormLabel>
//                                             <a href="#" className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors">
//                                                 Reset Credentials?
//                                             </a>
//                                         </div>
//                                         <FormControl>
//                                             <div className="relative group">
//                                                 <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center pointer-events-none">
//                                                     <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors duration-300" />
//                                                 </div>
//                                                 <Input
//                                                     type="password"
//                                                     placeholder="••••••••"
//                                                     className="pl-10 h-12 bg-secondary/50 border-input text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all rounded-xl tracking-widest"
//                                                     {...field}
//                                                 />
//                                             </div>
//                                         </FormControl>
//                                         <FormMessage />
//                                     </FormItem>
//                                 )}
//                             />

//                             <Button 
//                                 type="submit" 
//                                 className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 bg-size-200 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 hover:bg-[position:100%_center] active:scale-[0.98] border border-white/10 group overflow-hidden relative" 
//                                 disabled={isLoading}
//                             >
//                                 <span className="relative z-10 flex items-center justify-center gap-2">
//                                     {isLoading ? (
//                                         <>
//                                             <Loader2 className="h-5 w-5 animate-spin" />
//                                             OPENING LINK...
//                                         </>
//                                     ) : (
//                                         <>
//                                             AUTHENTICATE
//                                             <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
//                                         </>
//                                     )}
//                                 </span>
//                             </Button>
//                         </form>
//                     </Form>

//                     <div className="pt-6 text-center space-y-4">
//                         <div className="relative">
//                             <div className="absolute inset-0 flex items-center">
//                                 <span className="w-full border-t border-border" />
//                             </div>
//                             <div className="relative flex justify-center text-xs uppercase">
//                                 <span className="bg-background px-2 text-muted-foreground">Other Access Nodes</span>
//                             </div>
//                         </div>
//                         <div className="grid grid-cols-2 gap-4">
//                            <Button 
//                                 variant="outline" 
//                                 onClick={() => handleSocialLogin('Google Workspace')}
//                                 className="w-full border-input bg-secondary/50 hover:bg-secondary hover:text-foreground text-muted-foreground transition-all h-10 rounded-lg"
//                                 disabled={isLoading}
//                             >
//                                 <GoogleIcon />
//                                 <span className="ml-2">Workspace</span>
//                             </Button>
//                             <Button 
//                                 variant="outline" 
//                                 onClick={() => handleSocialLogin('Microsoft Azure')}
//                                 className="w-full border-input bg-secondary/50 hover:bg-secondary hover:text-foreground text-muted-foreground transition-all h-10 rounded-lg"
//                                 disabled={isLoading}
//                             >
//                                 <MicrosoftIcon />
//                                 <span className="ml-2">Azure AD</span>
//                             </Button>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="absolute bottom-6 w-full text-center text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
//                     Secured by Quantum-256 Encryption
//                 </div>
//             </div>
//         </div>
//     );
// }
