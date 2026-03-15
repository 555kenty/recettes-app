import { Loader2 } from 'lucide-react';

export default function ImportUrlLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
    </div>
  );
}
