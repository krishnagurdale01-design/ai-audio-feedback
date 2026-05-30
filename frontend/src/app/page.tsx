"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  RefreshCw, 
  FileText, 
  Layers, 
  Cpu, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  HelpCircle,
  Database,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  UserCheck,
  Video,
  ExternalLink,
  Info
} from "lucide-react";

// Types corresponding to Backend schemas
interface TimestampEntry {
  timestamp: string;
  timestamp_seconds: number;
  raw_text: string;
}

interface RoutedEntry {
  timestamp: string;
  timestamp_seconds: number;
  raw_text: string;
  department: string;
  confidence: number;
  routing_reason: string;
}

interface RefinedTask {
  id: string;
  timestamp: string;
  timestamp_seconds: number;
  department: string;
  original_text: string;
  task_title: string;
  task_description: string;
  priority: "High" | "Medium" | "Low";
  priority_reason: string;
  kanban_status?: "Todo" | "In Progress" | "In Review" | "Done";
}

interface QAFlag {
  flag_id: string;
  flag_type: "contradiction" | "ambiguity" | "duplicate";
  severity: "warning" | "error";
  affected_task_ids: string[];
  message: string;
  suggestion: string;
}

interface AgentLog {
  agent_name: string;
  display_name: string;
  status: "pending" | "running" | "completed" | "error";
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  items_processed: number;
  summary: string;
}

const SAMPLE_FEEDBACK = `# Client Feedback — Episode 3 "The Awakening" — Review Session #2

Hey team, just watched the latest cut and I have some notes. Overall it's getting better but there are still some things that need fixing ASAP.

OK so right at 00:15 the opening title card feels super flat. Can we add some kind of particle effect or energy burst behind the logo? Like make it feel more EPIC. The sound on the title card also needs a deeper boom, right now it sounds like a weak thud.

At 0:45 the dialogue between Sarah and Mike is basically inaudible. I can barely hear what they're saying over the background music. Turn up the voices or turn down the score, I don't care which, just fix it. Also the color in this scene is way too warm, it should feel cold and isolated since they're having an argument.

The VFX shot at 01:15 where the building explodes looks really fake. The compositing is off and you can see the edge of the green screen on the left side. Also make the whole explosion BRIGHTER and more intense. We need this to be the hero shot of the episode.

At the 2-minute mark, the montage is dragging. It feels like it goes on forever. Can we tighten the cuts and maybe remove 2-3 of the slower shots? The pacing needs to be snappier.

Around 02:30 I actually think we need to slow things down. The audience needs a moment to breathe after the explosion. Add a longer pause here.

01:20 - I know I said make the explosion brighter but the scene right after should be really dark and moody. Like SUPER desaturated. Drop the exposure way down. Actually wait, can we keep some warmth in the shadows? I want it dark but not cold.

At 03:15, the sword fight scene needs way better sound design. I want to hear every clang, every swoosh. Right now it sounds like two plastic sticks hitting each other. Add some metallic foley and maybe a reverb tail on the big hits.

The transition at 03:45 is jarring. Can we add a smooth dissolve or maybe a whip pan transition instead of the hard cut? It's pulling me out of the story.

URGENT: At 04:00 the client's logo in the lower third is using the OLD branding. This needs to be updated to the new logo IMMEDIATELY. This is a showstopper.

Around 04:30 the color grade shifts randomly from scene to scene. One shot is super teal and orange, the next is almost black and white. We need consistency here. Pick a look and stick with it.

Oh and at 02:35 make the music LOUDER and more intense for the aftermath scene. But also at 02:30 I said we need quiet and breathing room so... figure it out I guess? Maybe start quiet and build?

The ending at 05:00 feels rushed. The last shot should hold for at least 3 more seconds before cutting to black. And add a subtle film grain effect over the final frame. Actually, over the whole last 30 seconds.

One more thing - at 01:15 can we also add some camera shake to the explosion? It'll make it feel more visceral and real. OH and the debris particles need to be going the RIGHT direction, they're currently flying toward the explosion which makes no sense.`;

export default function FeedbackManager() {
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState("idle");
  const [tasks, setTasks] = useState<RefinedTask[]>([]);
  const [flags, setFlags] = useState<QAFlag[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([
    { agent_name: "intake", display_name: "Intake & Timeline Agent", status: "pending", started_at: null, completed_at: null, duration_ms: null, items_processed: 0, summary: "Extracts timestamps & text segmentation" },
    { agent_name: "router", display_name: "Department Router Agent", status: "pending", started_at: null, completed_at: null, duration_ms: null, items_processed: 0, summary: "Classifies comments by post dept" },
    { agent_name: "refiner", display_name: "Task Refiner Agent", status: "pending", started_at: null, completed_at: null, duration_ms: null, items_processed: 0, summary: "Rewrites comments into Kanban tasks" },
    { agent_name: "qa", display_name: "QA & Conflict Agent", status: "pending", started_at: null, completed_at: null, duration_ms: null, items_processed: 0, summary: "Scans for contradictions & duplicates" }
  ]);
  const [activeTab, setActiveTab] = useState<"kanban" | "list">("kanban");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<RefinedTask | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  // Prefill with some instruction helper on mount
  useEffect(() => {
    setFeedback(SAMPLE_FEEDBACK);
  }, []);

  // Department columns for Kanban View
  const DEPARTMENTS = ["VFX", "Audio", "Color Grading", "Editing"];

  // Helper for Priority styling
  const getPriorityColor = (priority: "High" | "Medium" | "Low") => {
    switch (priority) {
      case "High":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "Medium":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "Low":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    }
  };

  // Helper for Department styling
  const getDeptColor = (dept: string) => {
    switch (dept) {
      case "VFX":
        return "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
      case "Audio":
        return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
      case "Color Grading":
        return "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400";
      case "Editing":
        return "bg-sky-500/10 border-sky-500/30 text-sky-400";
      default:
        return "bg-zinc-500/10 border-zinc-500/30 text-zinc-400";
    }
  };

  const handleLoadSample = () => {
    setFeedback(SAMPLE_FEEDBACK);
    setStatus("idle");
    setProgress(0);
    setCurrentAgent("idle");
    setTasks([]);
    setFlags([]);
    setAgentLogs([
      { agent_name: "intake", display_name: "Intake & Timeline Agent", status: "pending", started_at: null, completed_at: null, duration_ms: null, items_processed: 0, summary: "Extracts timestamps & text segmentation" },
      { agent_name: "router", display_name: "Department Router Agent", status: "pending", started_at: null, completed_at: null, duration_ms: null, items_processed: 0, summary: "Classifies comments by post dept" },
      { agent_name: "refiner", display_name: "Task Refiner Agent", status: "pending", started_at: null, completed_at: null, duration_ms: null, items_processed: 0, summary: "Rewrites comments into Kanban tasks" },
      { agent_name: "qa", display_name: "QA & Conflict Agent", status: "pending", started_at: null, completed_at: null, duration_ms: null, items_processed: 0, summary: "Scans for contradictions & duplicates" }
    ]);
  };

  const handleStartPipeline = () => {
    if (!feedback.trim()) return;

    setStatus("running");
    setProgress(0);
    setCurrentAgent("intake");
    setTasks([]);
    setFlags([]);

    // Open WebSocket Connection to Backend
    const ws = new WebSocket("ws://localhost:8000/ws/process");
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "process",
        feedback: feedback
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "state_update") {
        const state = message.data;
        setProgress(state.progress);
        setCurrentAgent(state.current_agent);
        if (state.agent_logs) {
          setAgentLogs(state.agent_logs);
        }
      } else if (message.type === "complete") {
        const payload = message.data;
        setStatus("completed");
        setProgress(1);
        setCurrentAgent("done");
        
        // Initialise all tasks with standard Kanban status
        const initialTasks = (payload.tasks || []).map((t: RefinedTask) => ({
          ...t,
          kanban_status: "Todo"
        }));
        
        setTasks(initialTasks);
        setFlags(payload.flags || []);
        if (payload.agent_logs) {
          setAgentLogs(payload.agent_logs);
        }
        ws.close();
      } else if (message.type === "error") {
        setStatus("error");
        setCurrentAgent("error");
        ws.close();
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setCurrentAgent("error");
    };

    ws.onclose = () => {
      // ws finished
    };
  };

  const handleTaskStatusChange = (taskId: string, newStatus: "Todo" | "In Progress" | "In Review" | "Done") => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, kanban_status: newStatus } : t));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, kanban_status: newStatus } : null);
    }
  };

  // Filter & Search Logic
  const filteredTasks = tasks.filter(task => {
    const matchesDept = selectedDeptFilter === "All" || task.department === selectedDeptFilter;
    const matchesSearch = task.task_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.task_description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  // Check if a task has associated QA flags
  const getTaskFlags = (taskId: string) => {
    return flags.filter(flag => flag.affected_task_ids.includes(taskId));
  };

  return (
    <div className="flex flex-col h-screen bg-[#070709] text-zinc-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0c0c0f] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-lg shadow-lg">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              CineFlow Studio
            </h1>
            <p className="text-xs text-zinc-500 font-medium">Agentic Video Feedback Manager Prototype</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-zinc-400">Pipeline Backend Live</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Raw Input */}
        <section className="w-1/4 border-r border-zinc-800 bg-[#09090b] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-bold tracking-wider uppercase text-zinc-400">Client Feedback</span>
            </div>
            <button
              onClick={handleLoadSample}
              disabled={status === "running"}
              className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-zinc-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Sample
            </button>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={status === "running"}
              placeholder="Paste chaotic, multi-department, timestamped client feedback here..."
              className="flex-1 w-full p-4 rounded-xl border border-zinc-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 bg-[#0d0d11] text-zinc-300 text-sm placeholder-zinc-600 focus:outline-none resize-none font-mono leading-relaxed"
            />

            <button
              onClick={handleStartPipeline}
              disabled={status === "running" || !feedback.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {status === "running" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running AI Agents...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Deconstruct Feedback
                </>
              )}
            </button>
          </div>
        </section>

        {/* Middle Panel: AI Process Visualiser */}
        <section className="w-1/4 border-r border-zinc-800 bg-[#09090b]/80 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold tracking-wider uppercase text-zinc-400">Agent Pipelines</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-6">
            
            {/* Overall Progress */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-400 uppercase">Process Sequence</span>
                <span className="font-semibold text-violet-400">{(progress * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Timeline Steps */}
            <div className="flex flex-col relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
              {agentLogs.map((log, index) => {
                const isCurrent = currentAgent === log.agent_name;
                const isCompleted = log.status === "completed";
                const isRunning = log.status === "running";

                return (
                  <div key={log.agent_name} className={`flex gap-4 p-3.5 rounded-xl border mb-4 transition-all duration-300 ${
                    isCurrent 
                      ? "border-violet-500/40 bg-violet-950/10 shadow-lg" 
                      : isCompleted 
                        ? "border-zinc-800 bg-zinc-900/10" 
                        : "border-transparent bg-transparent"
                  }`}>
                    
                    {/* Circle Node indicator */}
                    <div className="z-10 shrink-0">
                      {isCompleted ? (
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      ) : isRunning ? (
                        <div className="w-10 h-10 rounded-full bg-violet-500/15 border border-violet-500/50 flex items-center justify-center text-violet-400 shadow-md animate-pulse">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 font-bold text-sm">
                          {index + 1}
                        </div>
                      )}
                    </div>

                    {/* Node contents */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold truncate ${isCurrent ? "text-zinc-50" : "text-zinc-300"}`}>
                          {log.display_name}
                        </h4>
                        {log.duration_ms !== null && (
                          <span className="text-[10px] text-zinc-500 font-semibold font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                            {log.duration_ms}ms
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        {log.summary || `Waiting for pipeline...`}
                      </p>

                      {isCompleted && log.items_processed > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-medium bg-emerald-950/20 border border-emerald-900/40 px-2 py-1 rounded-md w-fit">
                          <Sparkles className="w-3 h-3" />
                          Processed {log.items_processed} entries
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* QA and Conflicts Alert block if any flags exist */}
            {flags.length > 0 && (
              <div className="mt-2 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">QA Pipeline Warnings ({flags.length})</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                  {flags.map((flag) => (
                    <div key={flag.flag_id} className="p-2.5 rounded-lg border border-amber-500/20 bg-zinc-950/50 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {flag.flag_type}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono font-semibold">{flag.flag_id}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-medium">{flag.message}</p>
                      <div className="mt-1 text-[11px] text-zinc-400 bg-zinc-900/80 p-2 rounded border border-zinc-800">
                        <span className="font-bold text-amber-500/90">Suggestion:</span> {flag.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Kanban Production Board */}
        <section className="flex-1 bg-[#050507] flex flex-col overflow-hidden">
          
          {/* Sub Header & filters */}
          <div className="p-4 border-b border-zinc-800 bg-[#09090b] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setActiveTab("kanban")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
                    activeTab === "kanban" 
                      ? "bg-zinc-800 text-zinc-50 shadow" 
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Department Kanban
                </button>
                <button
                  onClick={() => setActiveTab("list")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
                    activeTab === "list" 
                      ? "bg-zinc-800 text-zinc-50 shadow" 
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  List view
                </button>
              </div>

              {/* Department Selector */}
              <div className="flex gap-1.5">
                {["All", ...DEPARTMENTS].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDeptFilter(dept)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all duration-200 ${
                      selectedDeptFilter === dept
                        ? "border-zinc-500 bg-zinc-800 text-zinc-100 shadow"
                        : "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search refined tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-52 rounded-lg border border-zinc-800 focus:border-zinc-600 bg-[#0d0d11] text-xs placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Core Content */}
          <div className="flex-1 overflow-hidden flex relative">
            
            {/* If state is idle/empty */}
            {status === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#050507]">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-md font-bold text-zinc-300">Ready to Process Feedback</h3>
                <p className="text-xs text-zinc-500 max-w-sm text-center mt-1.5 leading-relaxed">
                  Enter client comments in the left panel and click "Deconstruct Feedback" to witness the 4 AI agents refine, route, and QA the timecode logs.
                </p>
              </div>
            )}

            {/* If running with no results */}
            {status === "running" && tasks.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[#050507]">
                <div className="w-16 h-16 rounded-full border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 shadow-lg animate-spin">
                  <RefreshCw className="w-7 h-7" />
                </div>
                <h3 className="text-md font-bold text-zinc-300 bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent animate-pulse">
                  Agent Pipeline orchestrating...
                </h3>
                <p className="text-xs text-zinc-500 max-w-xs text-center mt-1.5 leading-relaxed">
                  The Intake Agent is currently chunking the timeline.
                </p>
              </div>
            )}

            {/* Kanban Board Layout */}
            {status === "completed" && activeTab === "kanban" && (
              <div className="flex-1 overflow-x-auto p-4 flex gap-4 min-w-0">
                {DEPARTMENTS.map((dept) => {
                  const deptTasks = filteredTasks.filter(t => t.department === dept);
                  
                  return (
                    <div key={dept} className="flex-1 min-w-[270px] max-w-[340px] flex flex-col bg-zinc-950/40 rounded-xl border border-zinc-800 overflow-hidden">
                      <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            dept === "VFX" ? "bg-indigo-500" :
                            dept === "Audio" ? "bg-cyan-500" :
                            dept === "Color Grading" ? "bg-fuchsia-500" : "bg-sky-500"
                          }`}></span>
                          <span className="text-xs font-bold text-zinc-300">{dept}</span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                          {deptTasks.length}
                        </span>
                      </div>

                      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
                        {deptTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-800/80 rounded-xl text-center flex-1">
                            <span className="text-[10px] font-semibold text-zinc-600">No active tasks</span>
                          </div>
                        ) : (
                          deptTasks.map((task) => {
                            const taskFlags = getTaskFlags(task.id);
                            return (
                              <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="group p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-zinc-700 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-2.5 relative overflow-hidden"
                              >
                                {/* Timecode block */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-zinc-500" />
                                    <span className="text-[10px] font-mono font-bold text-zinc-400">{task.timestamp}</span>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                </div>

                                <h4 className="text-xs font-bold text-zinc-200 group-hover:text-white leading-snug line-clamp-2">
                                  {task.task_title}
                                </h4>

                                <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-zinc-800/60 text-[10px]">
                                  <span className="text-zinc-500 font-semibold font-mono">{task.id}</span>
                                  
                                  {/* Conflict flags warnings on the card */}
                                  {taskFlags.length > 0 && (
                                    <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold text-[9px]">
                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                      {taskFlags.length} Conflict{taskFlags.length > 1 ? "s" : ""}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View Layout */}
            {status === "completed" && activeTab === "list" && (
              <div className="flex-1 overflow-y-auto p-4">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Task ID</th>
                      <th className="py-3 px-4">Timecode</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(task => (
                      <tr 
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="border-b border-zinc-800/60 hover:bg-zinc-900/20 cursor-pointer text-xs transition-colors duration-150"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-400">{task.id}</td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300">{task.timestamp}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDeptColor(task.department)}`}>
                            {task.department}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-200">{task.task_title}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                            {task.kanban_status || "Todo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Task Detail Modal Panel */}
            {selectedTask && (
              <div className="absolute inset-y-0 right-0 w-[420px] bg-[#0c0c10] border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden z-20 animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-500 font-mono">{selectedTask.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDeptColor(selectedTask.department)}`}>
                      {selectedTask.department}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedTask(null)}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-2 py-1 rounded border border-zinc-800"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5">
                  <div>
                    <h3 className="text-md font-bold text-zinc-100 leading-snug">
                      {selectedTask.task_title}
                    </h3>
                    <div className="flex gap-2.5 mt-3">
                      <div className="flex items-center gap-1.5 text-zinc-400 bg-zinc-900/60 border border-zinc-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        Timecode: <span className="font-mono text-zinc-200">{selectedTask.timestamp}</span>
                      </div>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold ${getPriorityColor(selectedTask.priority)}`}>
                        Priority: {selectedTask.priority}
                      </div>
                    </div>
                  </div>

                  {/* Task Status Control */}
                  <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Production Status</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["Todo", "In Progress", "In Review", "Done"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleTaskStatusChange(selectedTask.id, status)}
                          className={`py-1.5 rounded text-[10px] font-bold border transition-all duration-150 ${
                            selectedTask.kanban_status === status
                              ? "border-violet-500/50 bg-violet-600 text-white shadow"
                              : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-300"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actionable Kanban Jira Description */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Refined Task Specification</span>
                    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0d0d11] text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                      {selectedTask.task_description}
                    </div>
                  </div>

                  {/* Priority Reasoning */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Priority Logic</span>
                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 text-xs text-zinc-400 leading-relaxed font-medium">
                      {selectedTask.priority_reason}
                    </div>
                  </div>

                  {/* Original Client Wording */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Original Client Feedback</span>
                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 text-xs text-zinc-500 leading-relaxed italic">
                      "{selectedTask.original_text}"
                    </div>
                  </div>

                  {/* Conflict flags alert if relevant */}
                  {getTaskFlags(selectedTask.id).length > 0 && (
                    <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        Pipeline Conflict Alert
                      </div>
                      {getTaskFlags(selectedTask.id).map(flag => (
                        <div key={flag.flag_id} className="text-xs text-zinc-300 leading-relaxed mt-1">
                          <p className="font-semibold">{flag.message}</p>
                          <p className="mt-2 text-zinc-400 bg-zinc-900/60 p-2.5 rounded border border-zinc-800 leading-normal">
                            <span className="font-bold text-amber-400">Resolution Suggestion:</span> {flag.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>

        </section>

      </div>
    </div>
  );
}
