import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { formatDistanceToNow } from 'date-fns';

interface PresenceState {
  onlineUsers: Set<string>;
  isUserOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => string | null;
}

export const usePresence = (channelName: string): PresenceState => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, Date>>(new Map());

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        
        Object.keys(state).forEach((key) => {
          online.add(key);
        });
        
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers((prev) => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        // Record last seen time when user leaves
        setLastSeenMap((prev) => {
          const next = new Map(prev);
          next.set(key, new Date());
          return next;
        });
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user, channelName]);

  const isUserOnline = useCallback(
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers]
  );

  const getLastSeen = useCallback(
    (userId: string): string | null => {
      const lastSeen = lastSeenMap.get(userId);
      if (!lastSeen) return null;
      return formatDistanceToNow(lastSeen, { addSuffix: true });
    },
    [lastSeenMap]
  );

  return { onlineUsers, isUserOnline, getLastSeen };
};
