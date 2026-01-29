import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { 
  Cpu, HardDrive, Network, Box, Shield, Zap, 
  FileText, Folder, RefreshCw, X, Layers, CheckCircle, 
  Globe, Server, MessageSquare, Lock, Terminal, 
  Settings, Save, Plus, Trash2, Loader2
} from "lucide-react";
import { 
  AreaChart, Area, ResponsiveContainer, YAxis, 
  Tooltip, CartesianGrid, ReferenceLine 
} from 'recharts';

const InfoChip = ({ icon: Icon, label, value, color = "text-zinc-400" }: any) => (
  <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-lg flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-md bg-zinc-900 ${color}`}><Icon size={16} /></div>
      <span className="text-xs font-medium text-zinc-400">{label}</span>
    </div>
    <span className="text-sm font-mono font-bold text-zinc-200">{value || "N/A"}</span>
  </div>
);

interface InspectorProps {
    id: string | null;
    onClose: () => void;
    onIdChange: (newId: string) => void;
}

export function Inspector({ id, onClose, onIdChange }: InspectorProps) {
  // Estados de datos
  const [details, setDetails] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [audit, setAudit] = useState<any>(null);
  const [namespaceData, setNamespaceData] = useState<any>(null);
  const [files, setFiles] = useState<string[]>([]);
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState("overview");
  const [isStressing, setIsStressing] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // Estados de Configuración (Env Vars)
  const [editingEnv, setEditingEnv] = useState<{key: string, value: string}[]>([]);
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  // FIX INPUTS: Usamos esto para saber si ya cargamos las variables la primera vez
  const envLoadedRef = useRef(false);

  // Estados de Terminal
  const [terminalPort, setTerminalPort] = useState<number | null>(null);
  const [openingTerminal, setOpeningTerminal] = useState(false);

  // ---------------------------------------------------------------------------
  // EFECTO PRINCIPAL: CARGA Y POLLING OPTIMIZADO
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!id) return;

    // 1. Limpieza inicial
    setStats([]);
    setDetails(null);
    setAudit(null);
    setNamespaceData(null);
    setFiles([]);
    envLoadedRef.current = false; // Resetear flag de carga de envs
    
    // Iniciar monitor de gráficas
    invoke("start_monitor", { containerId: id }).catch(console.error);

    // 2. Carga PESADA (Solo una vez al abrir o cambiar ID)
    // Esto evita el uso excesivo de CPU (las olas de 11%)
    const loadHeavyData = async () => {
        try {
            // Obtenemos detalles para la primera carga
            const data = await invoke<any>("get_container_details", { id });
            setDetails(data);
            
            // Cargar Env Vars en el formulario solo esta vez
            if (data.env) {
                const parsed = data.env.map((s: string) => {
                    const parts = s.split('=');
                    return { key: parts[0], value: parts.slice(1).join('=') };
                });
                setEditingEnv(parsed);
                envLoadedRef.current = true; // Marcamos como cargado
            }

            // Auditoría y Namespaces (Costoso en CPU, solo 1 vez)
            if (data.state === 'running') {
                invoke("audit_container", { id }).then(setAudit).catch(() => setAudit(null));
                invoke("get_namespace_data", { id }).then(setNamespaceData).catch(() => setNamespaceData(null));
            }
        } catch (e) {
            console.error(e);
        }
    };
    
    // 3. Carga LIGERA (Polling cada 2s)
    // Solo verifica el estado "Running/Exited" usando inspect (muy barato en CPU)
    const pollStatus = async () => {
        try {
            const data = await invoke<any>("get_container_details", { id });
            // Solo actualizamos 'details' para cambiar el estado visual
            // NO actualizamos editingEnv aquí para no borrar lo que escribes
            setDetails((prev: any) => {
                // Truco para evitar re-renderizados innecesarios si nada cambia
                if (prev && prev.state === data.state && prev.name === data.name) return prev;
                return data;
            });
        } catch (e) { console.error(e); }
    };

    // Ejecutar carga pesada
    loadHeavyData();
    // Ejecutar carga de archivos
    fetchFiles(id);

    // Configurar intervalo ligero
    const intervalId = setInterval(pollStatus, 2000);

    // Listener de eventos para gráficas
    const unlistenPromise = listen(`monitor-stats-${id}`, (e: any) => {
      setStats(prev => [...prev, e.payload].slice(-20));
    });

    return () => { 
        clearInterval(intervalId);
        unlistenPromise.then(f => f()); 

        invoke("stop_monitor", { containerId: id }).catch(console.error);
    };
  }, [id]);

  // ---------------------------------------------------------------------------
  // ACCIONES
  // ---------------------------------------------------------------------------
  
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

  const fetchFiles = async (targetId = id) => {
    if (!targetId) return;
    setLoadingFiles(true);
    try {
      const data = await invoke<string[]>("list_container_files", { id: targetId, path: "/app/logs" });
      setFiles(data);
    } catch (e) {
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

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

  const handleCloseTerminal = async () => {
    setTerminalPort(null);
    if (id) {
        await invoke("close_dashboard_terminal", { id });
    }
  };

  const handleUpdateEnv = async () => {
      if (!id) return;
      setIsSavingEnv(true);
      const newEnvVec = editingEnv
        .filter(e => e.key.trim() !== "")
        .map(e => `${e.key.trim()}=${e.value}`);
      
      try {
          const newId = await invoke<string>("update_container_env", { id, newEnv: newEnvVec });
          onIdChange(newId);
          alert("Contenedor actualizado y reiniciado correctamente.");
      } catch (e) {
          alert("Error actualizando: " + e);
      } finally {
          setIsSavingEnv(false);
      }
  };

  // Helpers de formulario Env
  const addEnvLine = () => setEditingEnv([...editingEnv, { key: "", value: "" }]);
  const removeEnvLine = (idx: number) => setEditingEnv(editingEnv.filter((_, i) => i !== idx));
  const updateEnvLine = (idx: number, field: 'key'|'value', val: string) => {
      const copy = [...editingEnv];
      copy[idx][field] = val;
      setEditingEnv(copy);
  };

  if (!id) return null;
  if (!details) return <div className="p-10 text-zinc-500 flex items-center gap-2"><Loader2 className="animate-spin"/> Cargando inspección...</div>;

  const memoryLimitMB = details.memory_limit_bytes > 0 ? details.memory_limit_bytes / 1024 / 1024 : 0;
  const cpuLimitPercent = details.cpu_limit_nano > 0 ? (details.cpu_limit_nano / 1_000_000_000) * 100 : 100;

  return (
    <div className="h-full flex flex-col bg-zinc-900/80 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors z-50"><X size={18} /></button>

      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 pr-14">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          {details.name}
          <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${details.state === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
            {details.state === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>}
            {details.state.toUpperCase()}
          </span>
        </h2>
        <div className="flex gap-6 mt-6">
          {['overview', 'config', 'cgroups', 'namespaces', 'storage'].map(tab => (
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
                <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                    <Globe size={16}/> Puertos Expuestos
                </h3>
                {details.ports && details.ports.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {details.ports.map((p: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-blue-900/20 text-blue-400 border border-blue-500/20 rounded text-mono text-sm font-bold">
                                {p}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-zinc-500 text-xs italic">No hay puertos mapeados al host.</p>
                )}
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
               <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2"><Shield size={16}/> Configuración de Seguridad</h3>
               <div className="flex gap-4">
                  <div className={`flex-1 p-3 rounded border ${audit?.fs_readonly ? "bg-emerald-900/20 border-emerald-800" : "bg-red-900/20 border-red-800"}`}>
                    <span className="text-xs text-zinc-400">Read-Only RootFS</span>
                    <p className={`font-bold ${audit ? (audit.fs_readonly ? "text-emerald-400" : "text-red-400") : "text-zinc-500"}`}>
                       {audit ? (audit.fs_readonly ? "ACTIVADO" : "DESACTIVADO") : "..."}
                    </p>
                  </div>
                  <div className={`flex-1 p-3 rounded border ${details.cpu_limit_nano > 0 ? "bg-emerald-900/20 border-emerald-800" : "bg-yellow-900/20 border-yellow-800"}`}>
                    <span className="text-xs text-zinc-400">CPU CGroup</span>
                    <p className={`font-bold ${details.cpu_limit_nano > 0 ? "text-emerald-400" : "text-yellow-400"}`}>{details.cpu_limit_nano > 0 ? "LIMITADO" : "SIN LÍMITE"}</p>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* --- CONFIG (ENV VARS) --- */}
        {activeTab === 'config' && (
            <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-300 flex gap-2"><Settings size={16}/> Variables de Entorno</h3>
                    <button onClick={addEnvLine} className="text-xs bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700 flex gap-1 items-center border border-zinc-700 transition">
                        <Plus size={12}/> Añadir
                    </button>
                </div>
                
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                    {editingEnv.map((env, i) => (
                        <div key={i} className="flex gap-2 group">
                            <input 
                              value={env.key} 
                              onChange={(e)=>updateEnvLine(i, 'key', e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-blue-300 w-1/3 focus:border-blue-500 outline-none" 
                              placeholder="CLAVE"
                            />
                            <div className="flex items-center text-zinc-600">=</div>
                            <input 
                              value={env.value} 
                              onChange={(e)=>updateEnvLine(i, 'value', e.target.value)}
                              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-zinc-300 flex-1 focus:border-blue-500 outline-none" 
                              placeholder="VALOR"
                            />
                            <button onClick={() => removeEnvLine(i)} className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                        </div>
                    ))}
                    {editingEnv.length === 0 && <p className="text-center text-xs text-zinc-600 py-4">No hay variables definidas.</p>}
                </div>

                <div className="bg-yellow-900/10 border border-yellow-900/30 p-3 rounded-lg text-xs text-yellow-500 flex gap-3 items-start">
                    <Zap size={16} className="shrink-0 mt-0.5" />
                    <p>Al guardar cambios, el contenedor será <b>eliminado y recreado</b>. Se mantendrán los volúmenes montados, pero se perderán los datos en la capa efímera del contenedor.</p>
                </div>

                <button 
                  onClick={handleUpdateEnv} 
                  disabled={isSavingEnv}
                  className={`w-full py-3 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-all ${isSavingEnv ? "bg-zinc-800 text-zinc-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg"}`}
                >
                    {isSavingEnv ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                    {isSavingEnv ? "Reconstruyendo Contenedor..." : "Aplicar Cambios y Reiniciar"}
                </button>
            </div>
        )}

        {/* --- CGROUPS --- */}
        {activeTab === 'cgroups' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
             <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl">
                <h3 className="text-blue-400 font-bold text-sm mb-1 flex gap-2"><Layers size={16}/> Monitor de Recursos</h3>
                <p className="text-xs text-zinc-300">
                  Visualiza cómo los <b>CGroups</b> del Kernel limitan el consumo. Usa el botón de estrés para intentar romper el límite.
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

        {/* --- NAMESPACES --- */}
        {activeTab === 'namespaces' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-purple-600/10 border border-purple-500/20 p-4 rounded-xl flex justify-between items-center">
                     <div>
                        <h3 className="text-purple-400 font-bold text-sm mb-1 flex gap-2"><Layers size={16}/> Aislamiento (Namespaces)</h3>
                        <p className="text-xs text-zinc-300">
                            Verifica que el contenedor tiene su propia identidad (PID, UTS, Red).
                        </p>
                     </div>
                     <div className="flex gap-3">
                        <a href="http://localhost:8080" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-600/20">
                           <Globe size={14} /> WEB INTERNA
                        </a>
                        <button 
                            onClick={handleOpenTerminal}
                            disabled={openingTerminal}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition border border-zinc-600"
                        >
                           {openingTerminal ? <Loader2 size={14} className="animate-spin"/> : <Terminal size={14} />} 
                           {openingTerminal ? "Conectando..." : "ABRIR SHELL"}
                        </button>
                     </div>
                </div>

                {namespaceData ? (
                    <div className="grid grid-cols-2 gap-4">
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
                        </div>

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
                        </div>

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
                        </div>

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
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 text-zinc-500">
                        {details.state === 'running' 
                            ? (audit ? "Cargando..." : "Detalles cargados. Auditoría detenida.") 
                            : "Contenedor Detenido"}
                    </div>
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
                      La carpeta del Host está sincronizada con <b>/app/logs</b> dentro del contenedor.
                   </p>
                   <div className="text-xs font-mono bg-black/30 p-2 rounded border border-emerald-500/10 text-zinc-300 break-all">
                      {details.binds.map((b: string) => b.split(':')[0]).join(', ')} 
                   </div>
                </div>
              ) : (
                <div className="bg-zinc-800/20 border border-zinc-800 p-4 rounded-xl text-center">
                   <p className="text-xs text-zinc-500">No hay volúmenes montados.</p>
                </div>
              )}
              
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                        <Folder size={14} className="text-blue-400"/> 
                        Explorador (/app/logs)
                    </span>
                    <button onClick={() => fetchFiles(id)} disabled={loadingFiles} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition">
                        <RefreshCw size={14} className={loadingFiles ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                    {files.length > 0 ? files.map((file, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded cursor-default border-b border-zinc-900 last:border-0">
                            <FileText size={14} className="text-zinc-600" />
                            <span className="text-sm text-zinc-300">{file}</span>
                        </div>
                    )) : (
                        <p className="text-center text-xs text-zinc-600 py-4">Carpeta vacía</p>
                    )}
                </div>
              </div>
           </div>
        )}

      </div>

      {/* --- MODAL DE TERMINAL --- */}
      {terminalPort && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-10">
            <div className="bg-zinc-900 w-full h-full max-w-5xl rounded-xl border border-zinc-700 shadow-2xl flex flex-col overflow-hidden">
                <div className="h-10 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2 text-sm font-mono text-zinc-400">
                        <Terminal size={14} className="text-green-500" />
                        <span>root@{details?.name?.substring(0,12) || "container"}:/app#</span>
                    </div>
                    {/* Botón X llama al cierre seguro (mata proceso zombi) */}
                    <button onClick={handleCloseTerminal} className="hover:text-white text-zinc-500 hover:bg-zinc-800 p-1 rounded transition">
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
