import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';

export default function Settings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [allowMedia, setAllowMedia] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        navigate('/setup');
        return;
      }

      setProfile(data);
      setDisplayName(data.display_name || '');
      setBio(data.bio || '');
      setIsActive(data.is_active);
      setAllowMedia(data.settings?.allow_media ?? true);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setError('');
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio: bio,
          is_active: isActive,
          settings: {
            ...profile.settings,
            allow_media: allowMedia,
          },
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;

    const confirmText = 'DELETE';
    const userInput = prompt(
      `This will permanently delete your profile and all messages. Type "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (error) throw error;

      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Link>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
          <div className="border-b border-slate-700 p-6">
            <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg text-sm">
                Settings saved successfully!
              </div>
            )}

            <div>
              <label className="block text-slate-300 mb-2 text-sm font-medium">
                Handle
              </label>
              <div className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 font-mono">
                @{profile.handle}
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Your handle cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 text-sm font-medium">
                Display Name
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
                Bio
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

            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-slate-900 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-white font-medium">Accept Messages</p>
                    <p className="text-slate-400 text-sm">
                      Allow people to send you anonymous messages
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 text-cyan-500 rounded focus:ring-2 focus:ring-cyan-400"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-900 rounded-lg cursor-pointer">
                  <div>
                    <p className="text-white font-medium">Allow Media</p>
                    <p className="text-slate-400 text-sm">
                      Let senders attach images and videos to messages
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowMedia}
                    onChange={(e) => setAllowMedia(e.target.checked)}
                    className="w-5 h-5 text-cyan-500 rounded focus:ring-2 focus:ring-cyan-400"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          <div className="border-t border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1">Delete Profile</h4>
                  <p className="text-slate-400 text-sm">
                    Permanently delete your profile and all associated messages. This action
                    cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleDeleteProfile}
                  className="ml-4 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
