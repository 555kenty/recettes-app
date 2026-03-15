export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-canvas-50">
      <div className="bg-white border-b border-canvas-200 h-14" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <div className="h-8 w-48 bg-canvas-200 rounded-full animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-canvas-200 animate-pulse shadow-card">
              <div className="aspect-[4/3] bg-canvas-100" />
              <div className="p-4 space-y-2.5">
                <div className="h-3 bg-canvas-100 rounded-full w-1/3" />
                <div className="h-4 bg-canvas-100 rounded-full w-5/6" />
                <div className="h-3 bg-canvas-100 rounded-full w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
