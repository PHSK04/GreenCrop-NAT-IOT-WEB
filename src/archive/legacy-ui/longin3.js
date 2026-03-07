// import { useState, useEffect, useRef } from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Loader2, Lock, Mail, ChevronRight, Fingerprint, Hexagon, Wind, Droplets, Sun } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// import { toast } from "sonner";
// import { ModeToggle } from "@/components/mode-toggle";

// const loginSchema = z.object({
//   email: z.string().email({ message: "Invalid identity credentials" }),
//   password: z.string().min(6, { message: "Passcode too short" }),
// });

// type LoginFormValues = z.infer<typeof loginSchema>;

// interface LoginProps {
//   onLogin: () => void;
// }

// export function Login({ onLogin }: LoginProps) {
//   const [isLoading, setIsLoading] = useState(false);
//   const [activeField, setActiveField] = useState<string | null>(null);
//   // Mouse effect removed for stability

//   const form = useForm<LoginFormValues>({
//     resolver: zodResolver(loginSchema),
//     defaultValues: { email: "admin@smartiot.com", password: "password123" },
//   });

//   async function onSubmit(data: LoginFormValues) {
//     setIsLoading(true);
//     setTimeout(() => {
//       setIsLoading(false);
//       onLogin(); 
//       toast.success("Biometric Verified", { description: "Welcome to the Neural Network." });
//     }, 1500);
//   }

//   return (
//     <div className="w-full h-screen bg-[#0a0a0a] text-white overflow-hidden flex items-center justify-center relative font-sans selection:bg-emerald-500/30">
      
//       {/* Background Grid & Particles */}
//       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
//       <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

//       {/* Floating Orbs */}
//       <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
//       <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow delay-1000"></div>

//       {/* Main Card Container with 3D Tilt */}
//       <div className="relative z-10 w-full max-w-5xl h-[80vh] flex shadow-2xl transition-transform duration-100 ease-out">
        
//         {/* Glassmorphism Card */}
//         <div className="w-full h-full bg-neutral-900/40 backdrop-blur-xl border border-white/5 rounded-[40px] flex overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            
//             {/* Left Side: Visuals */}
//             <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-white/5 to-transparent border-r border-white/5 text-left">
                
//                 {/* Brand */}
//                 <div className="flex items-center gap-3">
//                     <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
//                         <Hexagon className="w-6 h-6 text-white text-fill-transparent" />
//                     </div>
//                     <span className="text-xl font-bold tracking-tight text-white/90">Smart Farm OS</span>
//                 </div>

//                 {/* Center Graphic */}
//                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
//                     <div className="absolute inset-0 border border-emerald-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
//                     <div className="absolute inset-4 border border-blue-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
//                     <div className="absolute inset-0 flex items-center justify-center">
//                          <div className="relative">
//                             <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse"></div>
//                             <Fingerprint className="w-16 h-16 text-emerald-400 relative z-10" />
//                          </div>
//                     </div>
//                 </div>

//                 {/* Stats */}
//                 <div className="grid grid-cols-3 gap-4">
//                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
//                         <Wind className="w-5 h-5 text-blue-400 mb-2" />
//                         <div className="text-2xl font-bold text-white">24°</div>
//                         <div className="text-xs text-neutral-400">Air Quality</div>
//                     </div>
//                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
//                         <Droplets className="w-5 h-5 text-emerald-400 mb-2" />
//                         <div className="text-2xl font-bold text-white">68%</div>
//                         <div className="text-xs text-neutral-400">Humidity</div>
//                     </div>
//                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
//                         <Sun className="w-5 h-5 text-amber-400 mb-2" />
//                         <div className="text-2xl font-bold text-white">UV</div>
//                         <div className="text-xs text-neutral-400">Normal</div>
//                     </div>
//                 </div>
//             </div>

//             {/* Right Side: Login Form */}
//             <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center relative bg-black/20">
//                  <div className="absolute top-8 right-8">
//                      <ModeToggle />
//                  </div>

//                  <div className="max-w-md mx-auto w-full space-y-8">
//                     <div className="space-y-2">
//                         <h2 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400">Authenticate.</h2>
//                         <p className="text-neutral-500">Enter your secure credentials to proceed.</p>
//                     </div>

//                     <Form {...form}>
//                         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//                             <FormField
//                                 control={form.control}
//                                 name="email"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormControl>
//                                             <div 
//                                                 className={`relative group transition-all duration-300 rounded-2xl p-[1px] ${activeField === 'email' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-white/10'}`}
//                                             >
//                                                 <div className="bg-neutral-900 rounded-2xl relative flex items-center h-14 px-4 transition-colors">
//                                                     <Mail className={`w-5 h-5 transition-colors ${activeField === 'email' ? 'text-emerald-400' : 'text-neutral-500'}`} />
//                                                     <Input 
//                                                         {...field}
//                                                         onFocus={() => setActiveField('email')}
//                                                         onBlur={() => setActiveField(null)}
//                                                         placeholder="Identity ID"
//                                                         className="border-none bg-transparent h-full text-white placeholder:text-neutral-600 focus-visible:ring-0 px-4 text-base"
//                                                     />
//                                                 </div>
//                                             </div>
//                                         </FormControl>
//                                     </FormItem>
//                                 )}
//                             />

//                              <FormField
//                                 control={form.control}
//                                 name="password"
//                                 render={({ field }) => (
//                                     <FormItem>
//                                         <FormControl>
//                                             <div 
//                                                 className={`relative group transition-all duration-300 rounded-2xl p-[1px] ${activeField === 'password' ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-white/10'}`}
//                                             >
//                                                 <div className="bg-neutral-900 rounded-2xl relative flex items-center h-14 px-4 transition-colors">
//                                                     <Lock className={`w-5 h-5 transition-colors ${activeField === 'password' ? 'text-emerald-400' : 'text-neutral-500'}`} />
//                                                     <Input 
//                                                         {...field}
//                                                         type="password"
//                                                         onFocus={() => setActiveField('password')}
//                                                         onBlur={() => setActiveField(null)}
//                                                         placeholder="Passcode"
//                                                         className="border-none bg-transparent h-full text-white placeholder:text-neutral-600 focus-visible:ring-0 px-4 text-base"
//                                                     />
//                                                 </div>
//                                             </div>
//                                         </FormControl>
//                                     </FormItem>
//                                 )}
//                             />

//                             <div className="flex items-center justify-between text-sm">
//                                 <label className="flex items-center gap-2 text-neutral-400 cursor-pointer hover:text-white transition-colors">
//                                     <div className="w-4 h-4 rounded border border-neutral-600" />
//                                     Remember node
//                                 </label>
//                                 <a href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors">Recovery?</a>
//                             </div>

//                             <Button 
//                                 type="submit" 
//                                 disabled={isLoading}
//                                 className="w-full h-14 rounded-2xl bg-white text-black font-bold text-lg hover:bg-neutral-200 transition-all active:scale-[0.98] group"
//                             >
//                                 {isLoading ? (
//                                     <Loader2 className="w-6 h-6 animate-spin" />
//                                 ) : (
//                                     <span className="flex items-center justify-center gap-2">
//                                         Initialize Session <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
//                                     </span>
//                                 )}
//                             </Button>
//                         </form>
//                     </Form>

//                     <div className="pt-8 border-t border-white/10">
//                          <p className="text-center text-xs text-neutral-500 mb-4 uppercase tracking-widest">Or access via</p>
//                          <div className="grid grid-cols-2 gap-4">
//                             <button className="h-12 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
//                                 <span className="text-lg">G</span> Workspace
//                             </button>
//                              <button className="h-12 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
//                                 <span className="text-lg text-blue-400">⌘</span> Azure AD
//                             </button>
//                          </div>
//                     </div>
//                  </div>
//             </div>
//         </div>
//       </div>
//     </div>
//   );
// }
