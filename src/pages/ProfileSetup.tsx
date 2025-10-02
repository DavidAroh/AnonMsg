import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { validateHandle } from '../lib/utils';

export default function ProfileSetup() {
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    checkExistingProfile();
  }, [user]);

  const checkExistingProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('handle')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      navigate('/dashboard');
    }
  };

  const checkHandleAvailability = async (handleValue: string) => {
    const validation = validateHandle(handleValue);
    if (!validation.valid) {
      setAvailable(false);
      return;
    }

    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('handle')
        .eq('handle', handleValue.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      setAvailable(!data);
    } catch (err) {
      console.error('Error checking handle:', err);
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  const handleHandleChange = (value: string) => {
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setHandle(cleanValue);
    setAvailable(null);

    if (cleanValue.length >= 3) {
      const timeoutId = setTimeout(() => {
        checkHandleAvailability(cleanValue);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !available) return;

    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          handle: handle.toLowerCase(),
          display_name: displayName || handle,
          bio: bio || '',
        });

      if (insertError) throw insertError;

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const validation = validateHandle(handle);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">Claim Your Handle</h1>
          <p className="text-slate-400 mb-8">
            Choose a unique username for your anonymous message link
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-300 mb-2 text-sm font-medium">
                Your Handle
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">
                  anonmsg.link/
                </div>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => handleHandleChange(e.target.value)}
                  className="w-full pl-36 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="yourname"
                  required
                  minLength={3}
                  maxLength={30}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {checking && <Loader className="w-5 h-5 text-slate-400 animate-spin" />}
                  {!checking && available === true && (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  )}
                  {!checking && available === false && (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>
              </div>
              {!validation.valid && handle.length > 0 && (
                <p className="text-rose-400 text-sm mt-2">{validation.error}</p>
              )}
              {available === false && validation.valid && (
                <p className="text-rose-400 text-sm mt-2">This handle is already taken</p>
              )}
              {available === true && (
                <p className="text-emerald-400 text-sm mt-2">This handle is available!</p>
              )}
              <p className="text-slate-500 text-xs mt-2">
                3-30 characters, lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 text-sm font-medium">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors"
                placeholder="Your Name"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2 text-sm font-medium">
                Bio (Optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-400 transition-colors resize-none"
                placeholder="Tell people what kind of messages you want..."
                rows={3}
                maxLength={200}
              />
              <p className="text-slate-500 text-xs mt-1">{bio.length}/200</p>
            </div>

            <button
              type="submit"
              disabled={loading || !available || !validation.valid}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Profile...' : 'Claim Handle'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
