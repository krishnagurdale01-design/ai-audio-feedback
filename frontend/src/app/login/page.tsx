"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

export default function LoginPage() {
  const { register, handleSubmit } = useForm();
  const [error, setError] = useState("");
  const router = useRouter();

  const onSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      formData.append("username", data.email);
      formData.append("password", data.password);
      
      const response = await axios.post("http://localhost:8000/api/auth/token", formData);
      localStorage.setItem("token", response.data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="flex justify-center items-center py-20">
      <div className="glass p-10 rounded-3xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {error && <div className="text-red-500 text-sm text-center bg-red-100 p-2 rounded-lg">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input type="email" {...register("email")} className="w-full pl-10 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" placeholder="admin@example.com" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input type="password" {...register("password")} className="w-full pl-10 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" placeholder="••••••••" />
            </div>
          </div>
          
          <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 rounded-xl transition-transform hover:scale-[1.02] shadow-lg mt-4">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
