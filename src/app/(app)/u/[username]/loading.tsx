export default function UserProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="h-4 w-16 bg-slate-200 rounded-full mb-6" />
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-7 w-40 bg-slate-200 rounded-full" />
              <div className="h-4 w-24 bg-slate-200 rounded-full" />
              <div className="flex gap-6">
                <div className="h-4 w-20 bg-slate-200 rounded-full" />
                <div className="h-4 w-20 bg-slate-200 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded-full w-5/6" />
                <div className="h-3 bg-slate-200 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
