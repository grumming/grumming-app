import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserData } from '@/hooks/useUserData';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const UserMenu = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userData } = useUserData();

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

  const avatarUrl = userData?.profile?.avatar_url;
  const fullName = userData?.profile?.full_name;
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
