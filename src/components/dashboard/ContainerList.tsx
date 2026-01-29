import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Square,
  RotateCw,
  Trash2,
  ChevronRight,
  Box,
  Loader2,
} from "lucide-react";

interface ContainerListProps {
  refreshTrigger: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function ContainerList({
  refreshTrigger,
  onSelect,
  selectedId,
}: ContainerListProps) {
  const [containers, setContainers] = useState<any[]>([]);
  const [processing, setProcessing] = useState<{id: string, action: string} | null>(null);

  const fetchContainers = async () => {
    try {
      const data = await invoke<any[]>("get_containers");
      setContainers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 2000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleAction = async (
    e: React.MouseEvent,
    id: string,
    action: string,
  ) => {
    e.stopPropagation();
    
    setProcessing({ id, action });

    try {
      await invoke("perform_action", { id, action });
      await fetchContainers(); // Esperamos a que refresque la lista
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  if (containers.length === 0) {
    return (
      <div className="p-10 text-center text-zinc-600 text-sm flex flex-col items-center gap-3">
        <Box className="w-10 h-10 opacity-20" />
        <p>No hay contenedores activos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {containers.map((c) => {
        const isSelected = selectedId === c.id;
        // Helper para saber si ESTE botón específico está cargando
        const isActionLoading = (action: string) => 
            processing?.id === c.id && processing?.action === action;

        // Si hay CUALQUIER acción en curso en este contenedor, bloqueamos los otros botones
        const isBusy = processing?.id === c.id;

        return (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`
              group p-3 rounded-xl border cursor-pointer transition-all duration-200
              flex items-center justify-between
              ${
                isSelected
                  ? "bg-blue-600/10 border-blue-600/50 shadow-lg shadow-blue-900/20"
                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
              }
            `}
          >
            {/* Info Principal */}
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className={`
                w-2.5 h-2.5 rounded-full shrink-0
                ${c.status === "running" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"}
              `}
              />
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold truncate ${isSelected ? "text-blue-100" : "text-zinc-200"}`}
                >
                  {c.name}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono truncate">
                  {c.short_id} • {c.status}
                </p>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div
              className={`flex items-center gap-1 ${isSelected || isBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
            >
              {c.status === "running" ? (
                <>
                  <SmallButton
                    onClick={(e: React.MouseEvent) => handleAction(e, c.id, "restart")}
                    // 5. LÓGICA DE ICONO Y CARGA
                    isLoading={isActionLoading("restart")}
                    isDisabled={isBusy} 
                    icon={<RotateCw size={14} />}
                    color="text-yellow-400 hover:bg-yellow-400/10"
                    title="Reiniciar"
                  />
                  <SmallButton
                    onClick={(e: React.MouseEvent) => handleAction(e, c.id, "stop")}
                    isLoading={isActionLoading("stop")}
                    isDisabled={isBusy}
                    icon={<Square size={14} />}
                    color="text-red-400 hover:bg-red-400/10"
                    title="Detener"
                  />
                </>
              ) : (
                <>
                  <SmallButton
                    onClick={(e: React.MouseEvent) => handleAction(e, c.id, "start")}
                    isLoading={isActionLoading("start")}
                    isDisabled={isBusy}
                    icon={<Play size={14} />}
                    color="text-emerald-400 hover:bg-emerald-400/10"
                    title="Iniciar"
                  />
                  <SmallButton
                    onClick={(e: React.MouseEvent) => handleAction(e, c.id, "delete")}
                    isLoading={isActionLoading("delete")}
                    isDisabled={isBusy}
                    icon={<Trash2 size={14} />}
                    color="text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                    title="Eliminar"
                  />
                </>
              )}
              
              {/* Flecha de selección (ocultar si está ocupado para limpiar visualmente) */}
              {!isBusy && (
                  <ChevronRight
                    size={16}
                    className={`ml-1 ${isSelected ? "text-blue-500" : "text-zinc-600"}`}
                  />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 6. COMPONENTE ACTUALIZADO
function SmallButton({ onClick, icon, color, title, isLoading, isDisabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      title={isLoading ? "Procesando..." : title}
      className={`
        p-1.5 rounded-md transition-all 
        ${isDisabled && !isLoading ? "opacity-30 cursor-not-allowed" : color}
        ${isLoading ? "bg-zinc-800 text-zinc-400 cursor-wait" : ""}
      `}
    >
      {isLoading ? <Loader2 size={14} className="animate-spin" /> : icon}
    </button>
  );
}
