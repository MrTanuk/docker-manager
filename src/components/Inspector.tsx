import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Cpu, HardDrive, Network, Box, Shield, Zap, 
  FileText, Folder, RefreshCw, X, Layers, ArrowRightLeft, CheckCircle, 
  Globe, Server, MessageSquare, Lock, Terminal
} from "lucide-react";
import { 
  AreaChart, Area, ResponsiveContainer, YAxis, 
  Tooltip, CartesianGrid, ReferenceLine 
} from 'recharts';
import { listen } from "@tauri-apps/api/event";

const InfoChip = ({ icon: Icon, label, value, color = "text-zinc-400" }: any) => (
  <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-lg flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-md bg-zinc-900 ${color}`}><Icon size={16} /></div>
      <span className="text-xs font-medium text-zinc-400">{label}</span>
    </div>
    <span className="text-sm font-mono font-bold text-zinc-200">{value || "N/A"}</span>
  </div>
);

export function Inspector({ id, onClose }: { id: string | null, onClose: () => void }) {
  const [details, setDetails] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isStressing, setIsStressing] = useState(false);
  const [audit, setAudit] = useState<any>(null);
  const [namespaceData, setNamespaceData] = useState<any>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [terminalPort, setTerminalPort] = useState<number | null>(null);
  const [openingTerminal, setOpeningTerminal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setStats([]);
    setDetails(null);
    setAudit(null);
    setNamespaceData(null);
    setFiles([]);
    
    invoke("get_container_details", { id }).then(setDetails).catch(console.error);
    invoke("audit_container", { id }).then(setAudit).catch(console.error);
    invoke("get_namespace_data", { id }).then(setNamespaceData).catch(console.error);
    invoke("start_monitor", { containerId: id }).catch(console.error);

    const unlisten = listen(`monitor-stats-${id}`, (e: any) => {
      setStats(prev => [...prev, e.payload].slice(-40));
    });

    return () => { unlisten.then(f => f()); };
  }, [id]);

  const handleStress = async () => {
    if (!id) return;
    setIsStressing(true);
    try {
      await invoke("inject_stress", { id, duration: 30 }); 
      setTimeout(() => setIsStressing(false), 30000); 
    } catch (error) {
      console.error(error);
      setIsStressing(false);
    }
  };

  const fetchFiles = async () => {
    if (!id) return;
    setLoadingFiles(true);
    try {
      const data = await invoke<string[]>("list_container_files", { id, path: "/app/logs" });
      setFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFiles(false);
    }
  };

  if (!id) return null;
  if (!details) return <div className="p-10 text-zinc-500">Cargando inspección...</div>;

  const memoryLimitMB = details.memory_limit_bytes > 0 ? details.memory_limit_bytes / 1024 / 1024 : 0;
  const cpuLimitPercent = details.cpu_limit_nano > 0 ? (details.cpu_limit_nano / 1_000_000_000) * 100 : 100;

  const handleOpenTerminal = async () => {
      if (!id) return;
      setOpeningTerminal(true);
      try {
          const port = await invoke<number>("open_dashboard_terminal", { id });
          setTerminalPort(port);
      } catch (error) {
          console.error(error);
          alert("Error: " + error);
      } finally {
          setOpeningTerminal(false);
      }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900/80 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors z-50"><X size={18} /></button>

      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 pr-14">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          {details.name}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${details.state === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
            {details.state.toUpperCase()}
          </span>
        </h2>
        <div className="flex gap-6 mt-6">
          {['overview', 'cgroups', 'namespaces', 'storage'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-bold transition-all border-b-2 capitalize ${activeTab === tab ? "border-blue-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-400"}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* --- OVERVIEW --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-2 gap-4">
               <InfoChip icon={Box} label="Image" value={details.image} color="text-orange-400" />
               <InfoChip icon={Network} label="IP" value={details.ip_address} color="text-blue-400" />
               <InfoChip icon={Cpu} label="CPU Limit" value={details.cpu_limit_nano > 0 ? `${details.cpu_limit_nano / 1e9} Cores` : "∞"} />
               <InfoChip icon={HardDrive} label="RAM Limit" value={memoryLimitMB > 0 ? `${memoryLimitMB.toFixed(0)} MB` : "∞"} />
            </div>
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
               <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2"><Shield size={16}/> Configuración de Seguridad</h3>
               <div className="flex gap-4">
                  <div className={`flex-1 p-3 rounded border ${audit?.fs_readonly ? "bg-emerald-900/20 border-emerald-800" : "bg-red-900/20 border-red-800"}`}>
                    <span className="text-xs text-zinc-400">Read-Only RootFS</span>
                    <p className={`font-bold ${audit?.fs_readonly ? "text-emerald-400" : "text-red-400"}`}>{audit?.fs_readonly ? "ACTIVADO" : "DESACTIVADO"}</p>
                  </div>
                  <div className={`flex-1 p-3 rounded border ${details.cpu_limit_nano > 0 ? "bg-emerald-900/20 border-emerald-800" : "bg-yellow-900/20 border-yellow-800"}`}>
                    <span className="text-xs text-zinc-400">CPU CGroup</span>
                    <p className={`font-bold ${details.cpu_limit_nano > 0 ? "text-emerald-400" : "text-yellow-400"}`}>{details.cpu_limit_nano > 0 ? "LIMITADO" : "SIN LÍMITE"}</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* --- CGROUPS --- */}
        {activeTab === 'cgroups' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
             <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl">
                <h3 className="text-blue-400 font-bold text-sm mb-1 flex gap-2"><Layers size={16}/> Demostración de Control de Recursos (CGroups)</h3>
                <p className="text-xs text-zinc-300">
                  Al pulsar "Inyectar Estrés", el contenedor intentará usar el 100% de la CPU y 2GB de RAM. 
                  Si los CGroups funcionan, las gráficas <b>chocarán contra la línea roja</b> y no la superarán.
                </p>
             </div>
             <div className="flex justify-end">
                <button onClick={handleStress} disabled={isStressing} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isStressing ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20"}`}>
                   <Zap size={16} /> {isStressing ? "Estresando..." : "Inyectar Carga Masiva (Stress-ng)"}
                </button>
             </div>
             <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-bold text-zinc-300">CPU Usage</p>
                    <span className="text-xs font-mono px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-red-400">Límite: {cpuLimitPercent.toFixed(1)}%</span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={stats}>
                      <defs><linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <YAxis domain={[0, Math.max(cpuLimitPercent * 1.2, 100)]} stroke="transparent" tick={{fontSize:10}} />
                      {details.cpu_limit_nano > 0 && <ReferenceLine y={cpuLimitPercent} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Límite', fill: '#ef4444', fontSize: 10 }} />}
                      <Tooltip contentStyle={{background: '#18181b', border: '1px solid #27272a'}} />
                      <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#gCpu)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
             <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm font-bold text-zinc-300">Memoria RAM</p>
                    <span className="text-xs font-mono px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-red-400">Límite: {memoryLimitMB > 0 ? memoryLimitMB.toFixed(0) : "System"} MB</span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={stats}>
                       <defs><linearGradient id="gRam" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity={0.3}/><stop offset="100%" stopColor="#a855f7" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <YAxis domain={[0, memoryLimitMB > 0 ? memoryLimitMB * 1.2 : 'auto']} stroke="transparent" tick={{fontSize:10}} />
                      {memoryLimitMB > 0 && <ReferenceLine y={memoryLimitMB} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Límite', fill: '#ef4444', fontSize: 10 }} />}
                      <Tooltip contentStyle={{background: '#18181b', border: '1px solid #27272a'}} />
                      <Area type="monotone" dataKey="memory_mb" stroke="#a855f7" fill="url(#gRam)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {/* --- NAMESPACES (AISLAMIENTO COMPLETO) --- */}
{activeTab === 'namespaces' && (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
        {/* ... (Tarjeta de título y explicación existente) ... */}
        
        <div className="bg-purple-600/10 border border-purple-500/20 p-4 rounded-xl">
             {/* ... Títulos anteriores ... */}
             
             <div className="flex flex-wrap gap-3 mt-4">
                {/* BOTÓN WEB (Existente) */}
                <a href="http://localhost:8080" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-600/20">
                   <Globe size={14} /> ABRIR WEB (Server)
                </a>

                {/* BOTÓN TERMINAL (NUEVO) */}
                <button 
                    onClick={handleOpenTerminal}
                    disabled={openingTerminal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition border border-zinc-600"
                >
                   <Terminal size={14} /> 
                   {openingTerminal ? "Conectando..." : "ABRIR SHELL (TTY)"}
                </button>
             </div>
        </div>

                {namespaceData ? (
                    <div className="grid grid-cols-2 gap-4">
                        
                        {/* 1. PID Namespace */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                            <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold text-sm">
                                <Layers size={16} /> PID Namespace
                            </div>
                            <div className="flex justify-between items-center bg-zinc-900 p-2 rounded-lg mb-2">
                                <span className="text-xs text-zinc-500">Host PID</span>
                                <span className="text-mono font-bold text-zinc-300">{namespaceData.pid.host}</span>
                            </div>
                            <div className="flex justify-between items-center bg-blue-900/20 border border-blue-500/20 p-2 rounded-lg">
                                <span className="text-xs text-blue-300">Container PID</span>
                                <span className="text-mono font-bold text-blue-200">{namespaceData.pid.container}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                El proceso cree ser el PID 1 (Init), ignorando los otros procesos del sistema.
                            </p>
                        </div>

                        {/* 2. UTS Namespace (Hostname) */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative overflow-hidden group hover:border-orange-500/50 transition-colors">
                            <div className="flex items-center gap-2 mb-3 text-orange-400 font-bold text-sm">
                                <Server size={16} /> UTS Namespace
                            </div>
                            <div className="flex justify-between items-center bg-zinc-900 p-2 rounded-lg mb-2">
                                <span className="text-xs text-zinc-500">Host Name</span>
                                <span className="text-mono font-bold text-zinc-300 truncate max-w-[100px]">{namespaceData.uts.host}</span>
                            </div>
                            <div className="flex justify-between items-center bg-orange-900/20 border border-orange-500/20 p-2 rounded-lg">
                                <span className="text-xs text-orange-300">Cont. Name</span>
                                <span className="text-mono font-bold text-orange-200 truncate max-w-[100px]">{namespaceData.uts.container}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                Identificadores de sistema (Hostname/Dominio) totalmente independientes.
                            </p>
                        </div>

                        {/* 3. Network Namespace */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                            <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold text-sm">
                                <Globe size={16} /> Network Namespace
                            </div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-900/20 rounded text-emerald-400"><Network size={18}/></div>
                                <div>
                                    <p className="text-xs text-zinc-400">IP Interna</p>
                                    <p className="font-mono font-bold text-white">{namespaceData.network.container_ip}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                Stack de red virtualizado (Interfaces, IP, Tablas de ruteo propias).
                            </p>
                        </div>

                        {/* 4. IPC & Mount (Information) */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 relative overflow-hidden group hover:border-pink-500/50 transition-colors">
                            <div className="flex items-center gap-2 mb-3 text-pink-400 font-bold text-sm">
                                <Lock size={16} /> IPC & Mount
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <MessageSquare size={12} className="text-zinc-500"/>
                                    <span>Memoria compartida aislada</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <HardDrive size={12} className="text-zinc-500"/>
                                    <span>Puntos de montaje privados</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-3 border-t border-zinc-800 pt-2">
                                Verificado implícitamente por el aislamiento de PID y Filesystem.
                            </p>
                        </div>

                    </div>
                ) : (
                    <div className="text-center py-10 text-zinc-500">Analizando Namespaces del Kernel...</div>
                )}
            </div>
        )}

        {/* --- STORAGE --- */}
        {activeTab === 'storage' && (
           <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {details.binds && details.binds.length > 0 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
                   <h4 className="text-emerald-400 font-bold text-sm flex items-center gap-2 mb-2">
                      <CheckCircle size={16}/> Carpeta Vinculada (Bind Mount)
                   </h4>
                   <p className="text-xs text-zinc-400 mb-2">
                      La carpeta de tu PC está sincronizada con <b>/app/logs</b> dentro del contenedor.
                   </p>
                   <div className="text-xs font-mono bg-black/30 p-2 rounded border border-emerald-500/10 text-zinc-300 break-all">
                      {details.binds.map((b: string) => b.split(':')[0]).join(', ')} 
                   </div>
                </div>
              ) : (
                <div className="bg-zinc-800/20 border border-zinc-800 p-4 rounded-xl text-center">
                   <p className="text-xs text-zinc-500">No hay carpetas compartidas en este contenedor.</p>
                </div>
              )}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                        <Folder size={14} className="text-blue-400"/> /app/logs (Vista Interna)
                    </span>
                    <button onClick={fetchFiles} disabled={loadingFiles} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition">
                        <RefreshCw size={14} className={loadingFiles ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="max-h-60 overflow-y-auto p-2">
                    {files.map((file, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded cursor-default">
                            <FileText size={14} className="text-zinc-600" />
                            <span className="text-sm text-zinc-300">{file}</span>
                        </div>
                    ))}
                    {files.length === 0 && <p className="text-center text-xs text-zinc-600 py-4">Carpeta vacía o sin leer</p>}
                </div>
              </div>
           </div>
        )}

      </div>

      {/* --- MODAL DE TERMINAL (ESTO ES LO QUE FALTABA) --- */}
      {terminalPort && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-10">
            <div className="bg-zinc-900 w-full h-full max-w-5xl rounded-xl border border-zinc-700 shadow-2xl flex flex-col overflow-hidden">
                <div className="h-10 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 text-sm font-mono text-zinc-400">
                        <Terminal size={14} className="text-green-500" />
                        <span>root@{details?.name?.substring(0,12) || "container"}:/app#</span>
                    </div>
                    <button onClick={() => setTerminalPort(null)} className="hover:text-white text-zinc-500 hover:bg-zinc-800 p-1 rounded transition">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 bg-black relative">
                    <iframe 
                        src={`http://localhost:${terminalPort}`}
                        className="w-full h-full border-none"
                        title="Terminal"
                        allow="clipboard-read; clipboard-write"
                    />
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
