import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Image, Video, Shield, Clock, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) throw error;
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <header className="flex justify-between items-center mb-8 sm:mb-16">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
            <span className="text-xl sm:text-2xl font-bold text-white">AnonMsg</span>
          </div>
        </header>

        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                Receive Anonymous Messages with Media
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-8">
                Get honest feedback, secret compliments, and creative messages from anyone.
                Share your unique link and start receiving text, images, and videos anonymously.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12">
                <div className="bg-slate-800/50 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-slate-700">
                  <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 mb-2" />
                  <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">Text Messages</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">Receive anonymous text messages</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-slate-700">
                  <Image className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 mb-2" />
                  <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">Images</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">Get photos and pictures</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm p-3 sm:p-4 rounded-lg border border-slate-700">
                  <Video className="w-6 h-6 sm:w-8 sm:h-8 text-rose-400 mb-2" />
                  <h3 className="text-white font-semibold mb-1 text-sm sm:text-base">Videos</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">Receive video messages</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-slate-300 text-sm sm:text-base">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  <span>Protected by advanced moderation</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300 text-sm sm:text-base">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  <span>Messages auto-expire for privacy</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300 text-sm sm:text-base">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  <span>Instant setup in seconds</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-slate-700">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                {isSignUp ? 'Create Your Account' : 'Welcome Back'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 mb-2 text-sm font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-2 text-sm font-medium">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-500/10 border-2 border-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Claim Your Handle</h3>
              <p className="text-slate-400">
                Choose a unique username and get your shareable link
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-400">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Share Your Link</h3>
              <p className="text-slate-400">
                Post your link on social media and let people send you messages
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/10 border-2 border-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-rose-400">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Get Messages</h3>
              <p className="text-slate-400">
                View all your anonymous messages in your secure dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
