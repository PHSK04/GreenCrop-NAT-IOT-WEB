import { lazy, Suspense } from "react";
import { Box } from "lucide-react";
import "./machine-room-preview.css";

const HydroponicRoom = lazy(() => import("../../../development/hydroponic-rack-3d/prototype/HydroponicRoom.jsx"));

/** Visual preview only. The room does not send commands to the dashboard's devices. */
export function MachineRoomPreview({ language = "TH" }: { language?: string }) {
  const thai = language === "TH";
  return (
    <section className="dashboard-room-card flex h-full flex-col overflow-hidden rounded-[22px] border border-border/60 bg-card shadow-sm" aria-label={thai ? "ห้องจำลองเครื่องสามมิติ" : "3D machine room preview"}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Box className="h-4 w-4" /></span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{thai ? "ห้องจำลองเครื่อง Hydroponic" : "Hydroponic machine room"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{thai ? "หมุนดูเครื่อง ทดลองปุ่มและแอนิเมชันในห้อง 3D" : "Explore the machine and try its controls and animations in 3D."}</p>
          </div>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">{thai ? "จำลอง · ไม่สั่งอุปกรณ์จริง" : "Simulation · no device commands"}</span>
      </div>
      <Suspense fallback={<div className="grid min-h-[470px] place-items-center text-sm text-muted-foreground">{thai ? "กำลังโหลดห้อง 3D…" : "Loading the 3D room…"}</div>}>
        <HydroponicRoom className="dashboard-machine-room" />
      </Suspense>
    </section>
  );
}
