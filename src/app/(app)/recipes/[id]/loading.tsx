export default function RecipeLoading() {
  return (
    <div className="min-h-screen bg-canvas-50 animate-pulse">
      <div className="h-[55vh] min-h-[320px] bg-stone-200" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-3 mb-6">
          {[80, 100, 90].map((w, i) => (
            <div key={i} className="h-8 bg-canvas-200 rounded-full" style={{ width: w }} />
          ))}
        </div>
        <div className="h-5 bg-canvas-200 rounded-full w-3/4 mb-3" />
        <div className="h-5 bg-canvas-200 rounded-full w-1/2 mb-10" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-canvas-200 rounded-full" />
            ))}
          </div>
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-canvas-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
