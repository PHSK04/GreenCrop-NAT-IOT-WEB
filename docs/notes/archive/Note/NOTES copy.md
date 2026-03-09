# Developer Notes & Code Snippets

Use this file to store temporary code, ideas, or backup snippets.

## Login Page backup (Previous Version)

This version corresponds to "Login 2 UI" found in `src/components/pages/log in 1.js`.

```tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sprout,
  CloudRain,
  Sun,
  Wind,
} from "lucide-react";

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
import { toast } from "sonner";
import loginBg from "@/assets/images/login_bg.png";

// ... [Truncated for brevity, full code available in history]
```

## To-Do List

- [x] Refactor Login Page to Sci-Fi theme
- [ ] Add backend integration for real authentication

## Useful Snippets

### Quick Toast

```tsx
toast.success("Message", { description: "Details" });
``