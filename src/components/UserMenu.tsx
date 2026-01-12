import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

const UserMenu = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setAvatarUrl(null);
      setFullName(null);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setAvatarUrl(data.avatar_url);
      setFullName(data.full_name);
    }
  };

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/auth')}
        className="h-8 px-3 text-xs font-medium"
      >
        Sign In
      </Button>
    );
  }

  const displayName = fullName || user.user_metadata?.full_name;

  return (
    <Button 
      variant="ghost" 
      className="relative h-9 w-9 rounded-full p-0 transition-all duration-200 hover:scale-110 active:scale-95"
      onClick={() => navigate('/profile')}
    >
      <Avatar className="h-9 w-9 border-2 border-primary/30 shadow-sm">
        <AvatarImage src={avatarUrl || undefined} alt={displayName || 'User'} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
    </Button>
  );
};

export default UserMenu;
