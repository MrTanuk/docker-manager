import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ShieldAlert, Terminal, X, Check, AlertTriangle } from "lucide-react";

export function MonitorModal({ id, name, onClose }: { id: string, name: string, onClose: () => void }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    invoke("start_monitor", { containerId: id }).catch(console.error);
    const unlisten = listen(`monitor-stats-${id}`, (e: any) => {
      setData(prev => [...prev, { ...e.payload, time: "" }].slice(-30));
    });
    return () => { unlisten.then(f => f()); };
  }, [id]);

  const last = data[data.length - 1] || { cpu: 0, memory_mb: 0 };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-800 w-[700px] rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Activity className="text-blue-500" /> {name}
          </h2>
          <button onClick={onClose} className="hover:text-white text-neutral-500"><X /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-center">
            <span className="text-neutral-400 text-sm">CPU Usage</span>
            <div className={`text-3xl font-mono font-bold mt-1 ${last.cpu > 49 ? "text-red-500" : "text-white"}`}>{last.cpu}%</div>
          </div>
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 text-center">
            <span className="text-neutral-400 text-sm">RAM Usage</span>
            <div className="text-3xl font-mono font-bold mt-1 text-white">{last.memory_mb} MB</div>
          </div>
        </div>

        <div className="h-64 w-full bg-neutral-950/50 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{backgroundColor: '#111', borderColor: '#333'}} />
              <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Area type="monotone" dataKey="memory_percent" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function SecurityTestModal({ id, name, onClose }: { id: string, name: string, onClose: () => void }) {
  const [logs, setLogs] = useState<string[]>(["Iniciando test...", `Target: ${name}`]);
  
  useEffect(() => {
    const run = async () => {
      setLogs(p => [...p, "> Intentando escribir en /hacker_file.txt..."]);
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await invoke<string>("test_filesystem", { id });
        if (res === "SUCCESS_WRITE") {
          setLogs(p => [...p, "❌ FALLO: Archivo creado.", "⚠️ SISTEMA VULNERABLE"]);
        } else {
          setLogs(p => [...p, `🛡️ BLOQUEADO POR KERNEL: ${res}`, "✅ SISTEMA SEGURO (Read-Only)"]);
        }
      } catch (e) { setLogs(p => [...p, "Error: " + e]); }
    };
    run();
  }, [id]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-800 w-[600px] rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-neutral-950 p-4 border-b border-neutral-800 flex justify-between">
          <h3 className="text-orange-500 font-bold flex gap-2"><ShieldAlert /> Pentest</h3>
          <button onClick={onClose}><X className="text-neutral-500 hover:text-white" /></button>
        </div>
        <div className="bg-black p-6 font-mono text-sm h-64 overflow-y-auto space-y-2">
          {logs.map((l, i) => (
            <div key={i} className={l.includes("✅") ? "text-emerald-500" : l.includes("❌") ? "text-red-500" : "text-neutral-400"}>
              <span className="opacity-30 mr-2">$</span>{l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
