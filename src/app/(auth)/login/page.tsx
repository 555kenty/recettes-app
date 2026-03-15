'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError('Email ou mot de passe incorrect.');
    } else {
      router.push('/');
    }
  };

  const handleGoogle = () => signIn.social({ provider: 'google', callbackURL: '/' });
  const handleGithub = () => signIn.social({ provider: 'github', callbackURL: '/' });

  const fields = [
    { label: 'Email', value: email, setter: setEmail, type: 'email', placeholder: 'chef@example.com' },
    { label: 'Mot de passe', value: password, setter: setPassword, type: showPassword ? 'text' : 'password', placeholder: '••••••••' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900 mb-1.5">Bon retour !</h1>
        <p className="text-stone-500 text-sm">Connecte-toi pour retrouver tes recettes.</p>
      </div>

      {/* Erreur */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-5 text-red-700 text-sm"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="chef@example.com"
            required
            className="input-base"
          />
        </motion.div>

        {/* Mot de passe */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">Mot de passe</label>
            <button type="button" className="text-xs text-brand-500 hover:text-brand-600 transition-colors">
              Mot de passe oublié ?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input-base pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Se connecter'}
          </button>
        </motion.div>
      </form>

      {/* Séparateur */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-canvas-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-canvas-50 px-3 text-xs text-stone-400 font-medium uppercase tracking-wider">ou continuer avec</span>
        </div>
      </div>

      {/* OAuth */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleGoogle}
          className="flex items-center justify-center gap-2.5 px-4 py-3 bg-white border border-canvas-200 rounded-xl hover:border-stone-300 hover:bg-canvas-50 transition-all text-sm font-medium text-stone-700 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
        <button
          onClick={handleGithub}
          className="flex items-center justify-center gap-2.5 px-4 py-3 bg-white border border-canvas-200 rounded-xl hover:border-stone-300 hover:bg-canvas-50 transition-all text-sm font-medium text-stone-700 shadow-sm"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub
        </button>
      </div>

      <p className="text-center text-sm text-stone-500 mt-6">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-brand-500 font-semibold hover:text-brand-600 transition-colors">
          S&apos;inscrire gratuitement
        </Link>
      </p>
    </motion.div>
  );
}
