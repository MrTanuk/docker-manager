import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {  Cpu, HardDrive, Network, Box,  Shield, Zap, CheckCircle, AlertTriangle, FileText, Folder, RefreshCw, X } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, CartesianGrid } from 'recharts';
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
  
  // Estado para archivos
  const [files, setFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    if (!id) return;
    setStats([]);
    setDetails(null);
    setAudit(null);
    setFiles([]);
    
    invoke("get_container_details", { id }).then(setDetails).catch(console.error);
    invoke("audit_container", { id }).then(setAudit).catch(console.error);
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
      await invoke("inject_stress", { id, duration: 15 });
      setTimeout(() => setIsStressing(false), 15000); 
    } catch (error) {
      console.error(error);
      setIsStressing(false);
    }
  };

  const fetchFiles = async () => {
    if (!id) return;
    setLoadingFiles(true);
    try {
      // Listamos la carpeta donde montamos los logs (/app/logs por defecto en nuestra config)
      const data = await invoke<string[]>("list_container_files", { id, path: "/app/logs" });
      setFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFiles(false);
    }
  };

  if (!id) return (
    <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center animate-pulse">
         <Box size={40} className="opacity-20" />
      </div>
      <p className="text-sm">Selecciona un contenedor de la lista izquierda.</p>
    </div>
  );

  if (!details) return <div className="p-10 text-zinc-500">Cargando inspección...</div>;

  // Calculamos el límite de memoria en MB para la gráfica
  const memoryLimitMB = details.memory_limit_bytes > 0 
    ? details.memory_limit_bytes / 1024 / 1024 
    : 0; 

  return (
    <div className="h-full flex flex-col bg-zinc-900/80 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl relative">
      
      {/* BOTÓN CERRAR */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-zinc-950/50 hover:bg-red-500/20 hover:text-red-400 rounded-full text-zinc-500 transition-all z-50"
        title="Cerrar Inspector"
      >
        <X size={18} />
      </button>

      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 pr-14">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {details.name}
              <span className={`text-xs px-2 py-0.5 rounded-full border ${details.state === 'running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400'}`}>
                {details.state.toUpperCase()}
              </span>
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">ID: {details.id.substring(0, 12)}...</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-6 mt-8">
          {['overview', 'resources', 'storage'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold transition-all border-b-2 ${
                activeTab === tab 
                ? "border-blue-500 text-white" 
                : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* VISTA GENERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
               <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
                 <Shield size={16} className="text-emerald-500"/> Auditoría de Seguridad
               </h3>
               <div className="grid grid-cols-1 gap-3">
                 <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded border border-zinc-800">
                    <div className="flex items-center gap-3">
                       {audit?.fs_readonly 
                         ? <CheckCircle className="text-emerald-500" size={18} /> 
                         : <AlertTriangle className="text-orange-500" size={18} />}
                       <div>
                          <p className="text-sm font-medium text-zinc-200">Filesystem Read-Only</p>
                          <p className="text-xs text-zinc-500">Impide modificaciones persistentes (RootFS)</p>
                       </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${audit?.fs_readonly ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400"}`}>
                       {audit?.fs_readonly ? "SEGURO" : "ESCRITURA PERMITIDA"}
                    </span>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <InfoChip icon={Box} label="Image Driver" value={details.driver} color="text-orange-400" />
               <InfoChip icon={Network} label="IP Address" value={details.ip_address} color="text-blue-400" />
               <InfoChip icon={Cpu} label="CPU Limit" value={details.cpu_limit_nano > 0 ? `${details.cpu_limit_nano / 1e9} Cores` : "Sin Límite"} />
               <InfoChip icon={HardDrive} label="RAM Limit" value={details.memory_limit_bytes > 0 ? `${details.memory_limit_bytes / 1024 / 1024} MB` : "Sin Límite"} />
            </div>
          </div>
        )}

        {/* RECURSOS */}
        {activeTab === 'resources' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                <div>
                   <h4 className="font-bold text-red-400 flex items-center gap-2">
                      <Zap size={16} /> Stress Test (CPU)
                   </h4>
                   <p className="text-xs text-zinc-400 mt-1">Inyecta carga masiva para probar los límites.</p>
                </div>
                <button 
                  onClick={handleStress}
                  disabled={isStressing}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                     isStressing 
                     ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                     : "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20"
                  }`}
                >
                   {isStressing ? "EN PROGRESO..." : "INYECTAR"}
                </button>
             </div>

             {/* GRÁFICA DE CPU */}
             <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex justify-between items-end mb-2">
                    <p className="text-sm text-zinc-400">Historial CPU (%)</p>
                    <span className="text-xs font-mono text-zinc-500">
                        Límite: {details.cpu_limit_nano > 0 ? `${(details.cpu_limit_nano / 1000000000) * 100}%` : "100% (1 Core)"}
                    </span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={stats}>
                      <defs><linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <YAxis domain={[0, 100]} tickCount={6} tick={{fontSize: 10}} stroke="transparent" />
                      <Tooltip contentStyle={{background: '#18181b', border: '1px solid #27272a'}} />
                      <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#gCpu)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
             
             {/* GRÁFICA DE RAM */}
             <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex justify-between items-end mb-2">
                    <p className="text-sm text-zinc-400">Historial RAM (MB)</p>
                    <span className="text-xs font-mono text-zinc-500">
                        Límite: {memoryLimitMB > 0 ? `${memoryLimitMB.toFixed(0)} MB` : "Sin límite"}
                    </span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={stats}>
                       <defs><linearGradient id="gRam" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity={0.3}/><stop offset="100%" stopColor="#a855f7" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      {/* Aquí definimos el dominio del eje Y basado en el límite */}
                      <YAxis 
                        domain={[0, memoryLimitMB || 'auto']} 
                        tickCount={5}
                        tick={{fontSize: 10}} 
                        stroke="transparent" 
                      />
                      <Tooltip contentStyle={{background: '#18181b', border: '1px solid #27272a'}} />
                      <Area type="monotone" dataKey="memory_mb" stroke="#a855f7" fill="url(#gRam)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {/* ALMACENAMIENTO - ACTUALIZADO */}
        {activeTab === 'storage' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Info de montaje mejorada */}
            {details.binds.length > 0 ? (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
                 <h4 className="text-emerald-400 font-bold text-sm flex items-center gap-2 mb-2">
                    <CheckCircle size={16}/> Enlace Activo (Bind Mount)
                 </h4>
                 {/* Mostramos la ruta exacta para depuración */}
                 <div className="text-xs font-mono bg-black/30 p-2 rounded border border-emerald-500/10 text-zinc-300 break-all">
                    {details.binds.join('\n')}
                 </div>
                 <p className="text-xs text-zinc-400 mt-2">
                    Archivos en tu carpeta local aparecen automáticamente en <b>/app/logs</b> dentro del contenedor.
                 </p>
              </div>
            ) : (
              <div className="bg-zinc-800/50 p-4 rounded-xl text-center text-zinc-500 text-xs">
                 Sin volúmenes montados. Configura una ruta al crear el contenedor.
              </div>
            )}

            {/* Explorador de Archivos */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
               <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                     <Folder size={14} className="text-blue-400"/> /app/logs (Vista Contenedor)
                  </span>
                  <button onClick={fetchFiles} disabled={loadingFiles} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition">
                     <RefreshCw size={14} className={loadingFiles ? "animate-spin" : ""} />
                  </button>
               </div>
               
               <div className="max-h-60 overflow-y-auto p-2">
                  {loadingFiles ? (
                     <div className="text-center py-4 text-xs text-zinc-600">Escaneando directorio...</div>
                  ) : files.length === 0 ? (
                     <div className="text-center py-4 text-xs text-zinc-600">
                        <p>Directorio vacío o sin leer.</p>
                        <button onClick={fetchFiles} className="text-blue-500 mt-2 hover:underline">Leer archivos</button>
                     </div>
                  ) : (
                     <div className="space-y-1">
                        {files.map((file, i) => (
                           <div key={i} className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded cursor-default group">
                              <FileText size={14} className="text-zinc-600 group-hover:text-blue-400" />
                              <span className="text-sm text-zinc-300 group-hover:text-white">{file}</span>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
