"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

type FormData = {
  client_name: string;
  company_name: string;
  email: string;
  phone_number: string;
  project_type: string;
  video_length: string;
  vfx_complexity: string;
  dubbing_languages: string[];
  deadline: string;
  additional_services: string[];
  project_description: string;
};

const PROJECT_TYPES = ["Corporate Video", "Advertisement", "YouTube Video", "Documentary", "Animation", "Short Film", "Feature Film", "Social Media Content"];
const VIDEO_LENGTHS = ["Under 1 minute", "1-5 minutes", "5-15 minutes", "15-30 minutes", "30+ minutes"];
const VFX_COMPLEXITY = ["None", "Basic", "Intermediate", "Advanced", "Hollywood-Level"];
const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Other"];
const DEADLINES = ["Normal", "Urgent", "Express (24-48 hours)"];
const SERVICES = ["Script Writing", "Voice Over", "Motion Graphics", "Drone Footage", "Color Grading", "Sound Design", "Subtitles"];

export default function EstimatorPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      dubbing_languages: [],
      additional_services: []
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://localhost:8000/api/quotations/", data);
      setResult(response.data);
    } catch (err) {
      setError("Failed to generate quotation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Project <span className="text-gradient">Estimator</span></h1>
        <p className="text-slate-600 dark:text-slate-400">Fill out the details below to receive an instant AI-powered quotation range.</p>
      </div>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-8 rounded-3xl"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
              {error && (
                <div className="bg-red-100 text-red-700 p-4 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> {error}
                </div>
              )}
              
              {/* Client Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Client Name *</label>
                  <input {...register("client_name", { required: true })} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name</label>
                  <input {...register("company_name")} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input type="email" {...register("email", { required: true })} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <input type="tel" {...register("phone_number")} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent" />
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* Project Details */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Project Type *</label>
                  <select {...register("project_type", { required: true })} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent">
                    <option value="">Select Type</option>
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Video Length *</label>
                  <select {...register("video_length", { required: true })} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent">
                    <option value="">Select Length</option>
                    {VIDEO_LENGTHS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">VFX Complexity *</label>
                  <select {...register("vfx_complexity", { required: true })} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent">
                    <option value="">Select Complexity</option>
                    {VFX_COMPLEXITY.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Deadline *</label>
                  <select {...register("deadline", { required: true })} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent">
                    <option value="">Select Deadline</option>
                    {DEADLINES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Multi Selects */}
              <div>
                <label className="block text-sm font-medium mb-3">Dubbing Languages</label>
                <div className="flex flex-wrap gap-3">
                  {LANGUAGES.map(lang => (
                    <label key={lang} className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <input type="checkbox" value={lang} {...register("dubbing_languages")} className="accent-purple-600" />
                      {lang}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Additional Services</label>
                <div className="flex flex-wrap gap-3">
                  {SERVICES.map(service => (
                    <label key={service} className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      <input type="checkbox" value={service} {...register("additional_services")} className="accent-purple-600" />
                      {service}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Project Description</label>
                <textarea {...register("project_description")} rows={4} className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent placeholder-slate-400" placeholder="Tell us more about your vision..."></textarea>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-70"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating Estimate...</> : "Get AI Quotation"}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-8 md:p-12 rounded-3xl text-center flex flex-col items-center gap-6"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold">Your Estimate is Ready</h2>
            
            <div className="w-full bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 uppercase tracking-wide font-semibold mb-2">Estimated Cost Range</div>
              <div className="text-4xl md:text-5xl font-extrabold text-gradient">
                ₹{result.estimated_cost_min?.toLocaleString()} - ₹{result.estimated_cost_max?.toLocaleString()}
              </div>
              <div className="mt-4 text-slate-600 dark:text-slate-400">
                Estimated Timeline: <span className="font-semibold text-slate-900 dark:text-slate-100">{result.estimated_timeline}</span>
              </div>
            </div>

            {result.cost_breakdown && (
              <div className="w-full text-left mt-4">
                <h3 className="font-bold text-xl mb-4">Cost Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(result.cost_breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 glass rounded-lg">
                      <span className="font-medium">{key}</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">₹{(value as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.ai_notes && (
              <div className="w-full text-left mt-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-indigo-500" /> AI Insights</h3>
                <p className="text-indigo-900 dark:text-indigo-200">{result.ai_notes}</p>
              </div>
            )}

            <div className="mt-8 flex gap-4 w-full">
              <button onClick={() => setResult(null)} className="flex-1 glass py-4 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                New Estimate
              </button>
              <button className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-xl font-semibold transition-colors shadow-lg">
                Request Final Quote
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
