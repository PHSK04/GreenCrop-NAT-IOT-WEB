// login 1 Ul
//  import { useState, useEffect } from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Loader2, Lock, Mail, CheckCircle2, ArrowRight } from "lucide-react";

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
// import { Separator } from "@/components/ui/separator";
// import loginBg from "@/assets/images/login_bg.png"; // Keeping the same background image

// // --- Icons for Social Login (Inline SVGs for crisp professional look) ---
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
    
//     // Simulate social login action
//     const handleSocialLogin = (provider: string) => {
//         setIsLoading(true);
//         // Simulate network delay
//         setTimeout(() => {
//             setIsLoading(false);
//             onLogin(); // Call the actual login function
//             toast.success(`Signed in with ${provider}`, {
//                 description: "Redirecting to dashboard...",
//             });
//         }, 1200);
//     };

//     const form = useForm<LoginFormValues>({
//         resolver: zodResolver(loginSchema),
//         defaultValues: {
//             email: "admin@smartiot.com",
//             password: "password123",
//         },
//     });

//     async function onSubmit(data: LoginFormValues) {
//         setIsLoading(true);
//         setTimeout(() => {
//             setIsLoading(false);
//             if (data.email === "admin@smartiot.com" && data.password === "password123") {
//                 onLogin();
//                 toast.success("Welcome back", {
//                     description: "You have successfully logged in.",
//                 });
//             } else {
//                 toast.error("Authentication Failed", {
//                     description: "Please check your email and password."
//                 });
//             }
//         }, 1500);
//     }

//     return (
//         <div className="w-full h-screen flex overflow-hidden bg-white dark:bg-slate-950 font-sans">
            
//             {/* Left Side - Professional Image & Branding */}
//             <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-slate-900">
//                  {/* Image with overlay */}
//                 <div 
//                     className="absolute inset-0 w-full h-full bg-cover bg-center"
//                     style={{ backgroundImage: `url(${loginBg})` }}
//                 />
//                 <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
//                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

//                 <div className="relative z-10 flex flex-col justify-end h-full p-16 max-w-2xl">
//                     <div className="mb-6">
//                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium mb-6">
//                             Smart Agriculture Solutions
//                         </div>
//                         <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
//                             Manage your farm with <br/> precision and confidence.
//                         </h1>
//                         <p className="text-slate-300 text-lg leading-relaxed max-w-lg">
//                             Monitor crops, control automated systems, and analyze yield data in one unified enterprise platform.
//                         </p>
//                     </div>
                    
//                     {/* Trust Indicators */}
//                     <div className="flex gap-8 pt-8 border-t border-white/10">
//                         <div>
//                              <p className="text-3xl font-bold text-white">2k+</p>
//                              <p className="text-sm text-slate-400">Connected Devices</p>
//                         </div>
//                         <div>
//                              <p className="text-3xl font-bold text-white">99.9%</p>
//                              <p className="text-sm text-slate-400">Uptime Reliability</p>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Right Side - Professional Login Form */}
//             <div className="w-full lg:w-[45%] flex flex-col justify-center items-center p-8 lg:p-12 xl:p-24 bg-white dark:bg-slate-950">
//                 <div className="w-full max-w-[400px] space-y-8">
                    
//                     <div className="space-y-2">
//                         <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sign in</h2>
//                         <p className="text-slate-500 dark:text-slate-400 text-sm">
//                             Welcome back! Please enter your details.
//                         </p>
//                     </div>

//                     <div className="space-y-4">
//                         <Form {...form}>
//                             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//                                 <FormField
//                                     control={form.control}
//                                     name="email"
//                                     render={({ field }) => (
//                                         <FormItem>
//                                             <FormLabel className="text-slate-700 dark:text-slate-300">Email</FormLabel>
//                                             <FormControl>
//                                                 <Input 
//                                                     placeholder="Enter your email" 
//                                                     className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all pl-4"
//                                                     {...field} 
//                                                 />
//                                             </FormControl>
//                                             <FormMessage />
//                                         </FormItem>
//                                     )}
//                                 />
//                                 <FormField
//                                     control={form.control}
//                                     name="password"
//                                     render={({ field }) => (
//                                         <FormItem>
//                                             <FormLabel className="text-slate-700 dark:text-slate-300">Password</FormLabel>
//                                             <FormControl>
//                                                 <Input 
//                                                     type="password" 
//                                                     placeholder="••••••••" 
//                                                     className="h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all pl-4"
//                                                     {...field} 
//                                                 />
//                                             </FormControl>
//                                             <FormMessage />
//                                         </FormItem>
//                                     )}
//                                 />
                                
//                                 <div className="flex items-center justify-between pb-2">
//                                      <div className="flex items-center gap-2">
//                                          <input type="checkbox" id="remember" className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4" />
//                                          <label htmlFor="remember" className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer">Remember for 30 days</label>
//                                      </div>
//                                      <a href="#" className="text-sm font-medium text-slate-900 dark:text-white hover:underline">Forgot password?</a>
//                                 </div>

//                                 <Button 
//                                     type="submit" 
//                                     className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-all font-medium rounded-lg"
//                                     disabled={isLoading}
//                                 >
//                                     {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
//                                     Sign In
//                                 </Button>
//                             </form>
//                         </Form>

//                         <div className="relative">
//                             <div className="absolute inset-0 flex items-center">
//                                 <span className="w-full border-t border-slate-200 dark:border-slate-800" />
//                             </div>
//                             <div className="relative flex justify-center text-xs uppercase">
//                                 <span className="bg-white dark:bg-slate-950 px-2 text-slate-500">Or continue with</span>
//                             </div>
//                         </div>

//                         <div className="grid grid-cols-2 gap-3">
//                             <Button 
//                                 variant="outline" 
//                                 onClick={() => handleSocialLogin('Google')}
//                                 className="w-full h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-200 font-medium"
//                                 disabled={isLoading}
//                             >
//                                 <GoogleIcon />
//                                 <span className="ml-2">Google</span>
//                             </Button>
//                             <Button 
//                                 variant="outline" 
//                                 onClick={() => handleSocialLogin('Microsoft')}
//                                 className="w-full h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-200 font-medium"
//                                 disabled={isLoading}
//                             >
//                                 <MicrosoftIcon />
//                                 <span className="ml-2">Microsoft</span>
//                             </Button>
//                         </div>
//                     </div>

//                     <p className="text-center text-sm text-slate-500 dark:text-slate-400">
//                         Don't have an account?{" "}
//                         <a href="#" className="font-semibold text-slate-900 dark:text-white hover:underline">Sign up</a>
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// }
// login 1 page

// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Loader2, Lock, Mail, Sprout, Sun, Cloud, Leaf } from "lucide-react";

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

//     const form = useForm<LoginFormValues>({
//         resolver: zodResolver(loginSchema),
//         defaultValues: {
//             email: "admin@smartiot.com",
//             password: "password123",
//         },
//     });

//     async function onSubmit(data: LoginFormValues) {
//         setIsLoading(true);

//         // Simulate API call
//         setTimeout(() => {
//             setIsLoading(false);

//             if (data.email === "admin@smartiot.com" && data.password === "password123") {
//                 toast.success("Welcome back, Farmer!", {
//                     description: "Ready to check your crops?",
//                 });
//                 onLogin();
//             } else {
//                 toast.error("Oops! Wrong credentials", {
//                     description: "Please check your email and password."
//                 });
//             }
//         }, 1000);
//     }

//     return (
//         <div className="w-full lg:grid lg:grid-cols-2 min-h-screen bg-slate-950 text-slate-100">
//             {/* Left Side - Visual Showcase */}
//             <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-green-500 to-emerald-700 text-white p-12 relative overflow-hidden">
//                 {/* Decorative Elements */}
//                 <div className="absolute top-10 left-10 opacity-20 animate-pulse">
//                     <Cloud size={120} />
//                 </div>
//                 <div className="absolute bottom-20 right-10 opacity-20 animate-bounce" style={{ animationDuration: '3s' }}>
//                     <Sun size={100} />
//                 </div>
//                 <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-slate-900/50 backdrop-blur-md/10 rounded-full blur-3xl pointer-events-none" />

//                 <div className="z-10 text-center space-y-6">
//                     <div className="relative inline-block">
//                         <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md/20 blur-xl rounded-full" />
//                         <Sprout size={80} className="relative z-10 text-yellow-300 drop-shadow-lg" />
//                     </div>
//                     <div>
//                         <h1 className="text-5xl font-extrabold tracking-tight mb-2">Smart Farm IoT</h1>
//                         <p className="text-xl text-green-100 font-medium">Cultivating the Future of Agriculture</p>
//                     </div>
//                     <div className="flex gap-4 justify-center mt-8">
//                         <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
//                             <Leaf className="w-6 h-6 text-green-200" />
//                             <span className="text-xs font-semibold">Sustainable</span>
//                         </div>
//                         <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
//                             <Sun className="w-6 h-6 text-yellow-200" />
//                             <span className="text-xs font-semibold">Efficient</span>
//                         </div>
//                         <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/50 backdrop-blur-md/10 rounded-2xl backdrop-blur-sm border border-white/20">
//                             <Cloud className="w-6 h-6 text-blue-200" />
//                             <span className="text-xs font-semibold">Smart</span>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Right Side - Login Form */}
//             <div className="flex items-center justify-center p-8 lg:p-12 relative">
//                 {/* Mobile Header (Visible only on small screens) */}
//                 <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600 lg:hidden" />

//                 <div className="w-full max-w-md space-y-8">
//                     <div className="text-center lg:text-left space-y-2">
//                         <div className="lg:hidden flex justify-center mb-4">
//                             <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//                                 <Sprout className="w-8 h-8 text-green-600" />
//                             </div>
//                         </div>
//                         <h2 className="text-3xl font-bold tracking-tight text-slate-100">Welcome Back</h2>
//                         <p className="text-slate-400">Sign in to manage your smart farm dashboard</p>
//                     </div>

//                     <Form {...form}>
//                         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//                             <FormField
//                                 control={form.control}
//                                 name="email"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormLabel>Email</FormLabel>
//                                         <FormControl>
//                                             <div className="relative">
//                                                 <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
//                                                 <Input
//                                                     placeholder="farmer@smartiot.com"
//                                                     className="pl-10 h-11 bg-slate-800/30 border-slate-800 focus:border-green-500 transition-colors"
//                                                     {...field}
//                                                 />
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
//                                     <FormItem>
//                                         <div className="flex items-center justify-between">
//                                             <FormLabel>Password</FormLabel>
//                                             <a href="#" className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline dark:text-green-400">
//                                                 Forgot password?
//                                             </a>
//                                         </div>
//                                         <FormControl>
//                                             <div className="relative">
//                                                 <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
//                                                 <Input
//                                                     type="password"
//                                                     placeholder="••••••••"
//                                                     className="pl-10 h-11 bg-slate-800/30 border-slate-800 focus:border-green-500 transition-colors"
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
//                                 className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all hover:scale-[1.02]"
//                                 disabled={isLoading}
//                             >
//                                 {isLoading ? (
//                                     <>
//                                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                                         Cultivating Access...
//                                     </>
//                                 ) : (
//                                     "Sign In to Farm"
//                                 )}
//                             </Button>
//                         </form>
//                     </Form>

//                     <div className="relative">
//                         <div className="absolute inset-0 flex items-center">
//                             <span className="w-full border-t border-muted" />
//                         </div>
//                         <div className="relative flex justify-center text-xs uppercase">
//                             <span className="bg-slate-950 px-2 text-slate-400">Or continue with</span>
//                         </div>
//                     </div>

//                     <div className="grid grid-cols-2 gap-4">
//                         <Button variant="outline" type="button" disabled className="h-10 rounded-xl">
//                             Google
//                         </Button>
//                         <Button variant="outline" type="button" disabled className="h-10 rounded-xl">
//                             Apple
//                         </Button>
//                     </div>

//                     <p className="text-center text-sm text-slate-400 mt-8">
//                         New to Smart Farm?{" "}
//                         <a href="#" className="font-semibold text-green-600 hover:text-green-700 dark:text-green-400">
//                             Create an account
//                         </a>
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// }
