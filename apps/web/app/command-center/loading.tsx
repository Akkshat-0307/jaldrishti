export default function CommandCenterLoading() {
  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none font-mono">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-xs text-cyan-300 font-bold uppercase tracking-wider">
          Initializing Command Center Workspace...
        </span>
      </div>
    </div>
  );
}
