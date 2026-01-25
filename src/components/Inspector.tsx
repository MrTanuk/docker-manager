import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Activity, Cpu, HardDrive, Network, Box, Fingerprint, Shield, Clock, Zap, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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

export function Inspector({ id }: { id: string | null }) {
  const [details, setDetails] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isStressing, setIsStressing] = useState(false);
  const [audit, setAudit] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setStats([]);
    setDetails(null);
    setAudit(null);
    
    // Cargar datos
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
      // El backend controla el tiempo, pero visualmente bloqueamos el botón un rato
      setTimeout(() => setIsStressing(false), 15000); 
    } catch (error) {
      console.error(error);
      setIsStressing(false);
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

  return (
    <div className="h-full flex flex-col bg-zinc-900/80 rounded-2xl border border-zinc-800 backdrop-blur-xl shadow-2xl">
      
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
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
          <div className="text-right">
             <p className="text-xs text-zinc-500 mb-1">Host PID (Namespace)</p>
             <div className="bg-zinc-900 px-3 py-1 rounded border border-zinc-800 inline-block">
                <p className="text-lg font-mono text-blue-400 tracking-wider">{details.pid_host}</p>
             </div>
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
            
            {/* Auditoría de Seguridad Visual */}
            <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800">
               <h3 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
                 <Shield size={16} className="text-emerald-500"/> Auditoría de Seguridad & Namespaces
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
                 
                 <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded border border-zinc-800">
                    <div className="flex items-center gap-3">
                       {details.pid_host > 0 
                         ? <CheckCircle className="text-emerald-500" size={18} /> 
                         : <XCircle className="text-red-500" size={18} />}
                       <div>
                          <p className="text-sm font-medium text-zinc-200">PID Namespace Isolation</p>
                          <p className="text-xs text-zinc-500">Proceso aislado del Host Kernel</p>
                       </div>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">AISLADO</span>
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

        {/* RECURSOS & STRESS TEST */}
        {activeTab === 'resources' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             
             {/* Botón de Pánico (Stress Test) */}
             <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                <div>
                   <h4 className="font-bold text-red-400 flex items-center gap-2">
                      <Zap size={16} /> Prueba de Carga (Stress Test)
                   </h4>
                   <p className="text-xs text-zinc-400 mt-1">Inyecta carga masiva para probar los límites CGroups.</p>
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
                   {isStressing ? "ATAQUE EN PROGRESO..." : "INYECTAR ESTRÉS"}
                </button>
             </div>

             <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <p className="text-sm text-zinc-400 mb-4 flex items-center gap-2"><Activity size={14} /> Historial CPU</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={stats}>
                      <defs><linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: '#71717a'}} stroke="transparent" />
                      <Tooltip contentStyle={{background: '#18181b', border: '1px solid #27272a', borderRadius: '8px'}} />
                      <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fill="url(#gCpu)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                <p className="text-sm text-zinc-400 mb-4 flex items-center gap-2"><HardDrive size={14} /> Historial RAM (MB)</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={stats}>
                      <defs><linearGradient id="gRam" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity={0.3}/><stop offset="100%" stopColor="#a855f7" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <YAxis tick={{fontSize: 10, fill: '#71717a'}} stroke="transparent" />
                      <Tooltip contentStyle={{background: '#18181b', border: '1px solid #27272a', borderRadius: '8px'}} />
                      <Area type="monotone" dataKey="memory_mb" stroke="#a855f7" strokeWidth={2} fill="url(#gRam)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {/* ALMACENAMIENTO */}
        {activeTab === 'storage' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Persistencia de Datos (Bind Mounts)</h3>
            
            {details.binds.length === 0 ? (
              <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-500 text-sm bg-zinc-900/20">
                <HardDrive className="mx-auto w-8 h-8 opacity-20 mb-2"/>
                No hay volúmenes montados. <br/>Los datos se perderán al eliminar el contenedor.
              </div>
            ) : (
              details.binds.map((bind: string, i: number) => {
                const [host, container] = bind.split(":");
                return (
                  <div key={i} className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500 mt-1">
                       <HardDrive size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm mb-1">Enlace Activo Host-Contenedor</h4>
                      
                      <div className="grid grid-cols-1 gap-2 mt-3">
                         <div className="bg-black/40 p-2 rounded border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">Host (Tu PC)</p>
                            <p className="text-xs text-emerald-400 font-mono break-all">{host}</p>
                         </div>
                         <div className="bg-black/40 p-2 rounded border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold">Contenedor</p>
                            <p className="text-xs text-blue-400 font-mono">{container}</p>
                         </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-400 bg-zinc-900 w-fit px-2 py-1 rounded-full border border-zinc-800">
                         <Clock size={10} className="animate-spin-slow" />
                         Sync automático activado
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
