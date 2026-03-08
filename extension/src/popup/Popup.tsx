export function Popup() {
  return (
    <div className="w-[400px] min-h-[200px] bg-surface-primary text-content-primary p-lg">
      <header className="flex items-center justify-between mb-lg">
        <h1 className="text-xl font-semibold">Request Interceptor</h1>
      </header>
      <p className="text-content-secondary text-base">
        Extension is loading...
      </p>
    </div>
  );
}
