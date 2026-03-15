import { Loader2 } from 'lucide-react';

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
  );
}
