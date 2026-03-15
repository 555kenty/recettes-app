export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel gauche — éditorial */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden bg-stone-950">
        {/* Photo food en background */}
        <img
          src="https://www.themealdb.com/images/media/meals/qptpvt1487339892.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        {/* Grain overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-950/60 via-transparent to-stone-950/80" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-none stroke-white stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">
            Cuisine<span className="text-brand-200 font-bold">Connect</span>
          </span>
        </div>

        {/* Citation éditoriale */}
        <div className="relative z-10">
          <blockquote className="text-white">
            <p className="font-serif text-2xl italic leading-relaxed text-white/90 mb-4">
              "La cuisine, c'est l'art de transformer des ingrédients simples en souvenirs inoubliables."
            </p>
            <footer className="text-stone-400 text-sm">
              — Julia Child
            </footer>
          </blockquote>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['A','M','K','S'].map((l, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-stone-950 flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: ['#C2410C','#7C3AED','#0F766E','#B45309'][i] }}
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-stone-400 text-sm">
              <span className="text-white font-medium">598 recettes</span> du monde entier
            </p>
          </div>
        </div>
      </div>

      {/* Panel droit — formulaire */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6 sm:p-10 bg-canvas-50">
        {/* Logo mobile */}
        <div className="lg:hidden mb-8 flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-stone-900">
            Cuisine<span className="text-brand-500 font-bold">Connect</span>
          </span>
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
