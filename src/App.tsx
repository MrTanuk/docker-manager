import { useState } from "react";
import { CreateContainer } from "@/components/dashboard/CreateContainer";
import { ContainerList } from "@/components/dashboard/ContainerList";
import { Inspector } from "@/components/Inspector";
import { Server, Box } from "lucide-react";

// ... imports igual que antes

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="h-screen bg-black text-zinc-100 flex flex-col overflow-hidden font-sans text-sm">
      <header className="h-12 flex-none border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 z-20">
        <div className="flex items-center gap-2 font-bold text-base tracking-tight">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <Server size={14} className="text-black" />
          </div>
          <span className="text-white">
            Docker<span className="text-zinc-500">Manager</span>
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
          v2.0
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden relative">
        {/* SIDEBAR COMPACTA */}
        <div className="col-span-4 border-r border-zinc-800 bg-black h-full overflow-y-auto custom-scrollbar relative z-10">
          <div className="p-3 space-y-4 pb-10">
            <CreateContainer onCreated={() => setRefreshKey((k) => k + 1)} />

            <div>
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">
                Deployments
              </h3>
              <ContainerList
                refreshTrigger={refreshKey}
                onSelect={(id) => setSelectedId(id)}
                selectedId={selectedId}
              />
            </div>
          </div>
        </div>

        {/* INSPECTOR & EMPTY STATE */}
        <div className="col-span-8 bg-black relative flex flex-col h-full overflow-hidden">
          {/* Grid de fondo más sutil */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          
          <div className="relative h-full z-0 p-4 overflow-hidden">
            {/* 2. LÓGICA CONDICIONAL */}
            {selectedId ? (
              <Inspector
                id={selectedId}
                onClose={() => setSelectedId(null)}
                onIdChange={(newId) => setSelectedId(newId)}
              />
            ) : (
              /* ESTADO VACÍO (EMPTY STATE) */
              <div className="h-full flex flex-col items-center justify-center select-none pointer-events-none">
                <div className="animate-pulse flex flex-col items-center gap-4 text-zinc-700">
                  <Box className="w-24 h-24 opacity-20" strokeWidth={1} />
                  <p className="text-sm font-bold tracking-[0.2em] uppercase opacity-50 text-zinc-500">
                    Seleccione un contenedor
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
