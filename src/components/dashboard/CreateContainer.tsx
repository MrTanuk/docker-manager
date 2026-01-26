import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Cpu, HardDrive, Play, Lock, FolderOpen, Globe } from "lucide-react"; // Import Globe

interface CreateContainerProps {
  onCreated: () => void;
}

export function CreateContainer({ onCreated }: CreateContainerProps) {
  const [name, setName] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [cpu, setCpu] = useState(0.5);
  const [memory, setMemory] = useState(512);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logPath, setLogPath] = useState("");
  const [port, setPort] = useState("8080"); // Nuevo estado para puerto

  useEffect(() => {
    invoke<string[]>("get_images")
      .then((data) => {
        setImages(data);
        if (data.length > 0) setSelectedImage(data[0]);
      })
      .catch((err) => console.error("Error Rust:", err));
  }, []);

  const handleSubmit = async () => {
    if (!name || !selectedImage) return;
    setLoading(true);
    try {
      await invoke("create_container", {
        config: {
          name: name,
          image: selectedImage,
          cpu_limit: cpu,
          memory_limit: memory,
          read_only_root: readOnly,
          host_log_path: logPath,
          host_port: port, // Enviamos el puerto
        },
      });
      setName("");
      onCreated();
    } catch (error) {
      alert("Error: " + error);
    } finally {
      setLoading(false);
    }
  };

  const inputStyles = "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-zinc-600";
  const labelStyles = "block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-2";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg overflow-hidden h-fit">
      <div className="p-5 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Box className="w-5 h-5 text-blue-500" /> Nuevo Contenedor
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Configura aislamiento y recursos.</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Imagen y Nombre */}
        <div className="space-y-4">
             <div>
              <label className={labelStyles}>Imagen Base</label>
              <div className="relative">
                <select className={`${inputStyles} appearance-none cursor-pointer`} value={selectedImage} onChange={(e) => setSelectedImage(e.target.value)}>
                  {images.length === 0 && <option>Cargando...</option>}
                  {images.map((img) => <option key={img} value={img}>{img}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-xs">▼</div>
              </div>
            </div>
            <div>
              <label className={labelStyles}>Nombre</label>
              <input type="text" placeholder="ej: laboratorio-1" className={inputStyles} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
        </div>

        <div className="h-px bg-zinc-800" />

        {/* Recursos */}
        <div className="grid grid-cols-2 gap-3">
             <div>
                <div className="flex justify-between mb-2">
                    <label className={labelStyles}><Cpu className="w-3 h-3" /> CPU</label>
                    <span className="text-xs font-mono text-emerald-400">{(cpu * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0.1" max="1" step="0.1" className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500" value={cpu} onChange={(e) => setCpu(parseFloat(e.target.value))} />
            </div>
            <div>
              <label className={labelStyles}><HardDrive className="w-3 h-3" /> RAM (MB)</label>
              <input type="number" className={inputStyles} value={memory} onChange={(e) => setMemory(parseInt(e.target.value))} />
            </div>
        </div>

        {/* Read Only Toggle */}
        <div className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer" onClick={() => setReadOnly(!readOnly)}>
          <span className="text-xs font-medium flex items-center gap-2"><Lock className={`w-3 h-3 ${readOnly ? "text-orange-500" : "text-zinc-500"}`} /> Read-Only FS</span>
          <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${readOnly ? "bg-orange-600" : "bg-zinc-700"}`}>
            <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${readOnly ? "translate-x-3" : ""}`} />
          </div>
        </div>

        {/* Logs y Puerto */}
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className={labelStyles}><Globe className="w-3 h-3" /> Puerto Host</label>
                <input type="text" placeholder="8080" className={inputStyles} value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
            <div>
                <label className={labelStyles}><FolderOpen className="w-3 h-3" /> Ruta Logs (Host)</label>
                <input type="text" disabled={readOnly} placeholder="/home/user/..." className={`${inputStyles} ${readOnly ? "opacity-50" : ""}`} value={logPath} onChange={(e) => setLogPath(e.target.value)} />
            </div>
        </div>

        <button onClick={handleSubmit} disabled={loading || !name} className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${loading || !name ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg"}`}>
          <Play className="w-4 h-4" /> {loading ? "Creando..." : "Desplegar"}
        </button>
      </div>
    </div>
  );
}
