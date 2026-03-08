export function SidePanel() {
  return (
    <div className="min-h-screen bg-surface-primary text-content-primary p-lg">
      <header className="mb-lg">
        <h1 className="text-xl font-semibold">Request Interceptor</h1>
      </header>
      <nav className="flex gap-sm mb-lg border-b border-border pb-sm">
        <button className="text-base text-primary font-semibold">Rules</button>
        <button className="text-base text-content-secondary">Collections</button>
        <button className="text-base text-content-secondary">Log</button>
        <button className="text-base text-content-secondary">Record</button>
      </nav>
      <p className="text-content-secondary text-base">
        Editor is loading...
      </p>
    </div>
  );
}
