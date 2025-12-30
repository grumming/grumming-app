// Generate notification sounds using Web Audio API
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

export const playNotificationSound = (type: 'booking' | 'success' | 'alert' = 'booking') => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (browsers require user interaction first)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Create oscillator for the main tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Set sound characteristics based on type
    if (type === 'booking') {
      // Pleasant two-tone chime for new bookings
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, now); // D5
      oscillator.frequency.setValueAtTime(880, now + 0.15); // A5
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.17);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.4);
      
      oscillator.start(now);
      oscillator.stop(now + 0.4);
    } else if (type === 'success') {
      // Bright ascending tone
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, now); // C5
      oscillator.frequency.linearRampToValueAtTime(783.99, now + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
      
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } else if (type === 'alert') {
      // Attention-grabbing double beep
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(800, now);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
      
      oscillator.start(now);
      oscillator.stop(now + 0.25);
    }
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

// Check if sound is enabled (could be stored in localStorage)
export const isSoundEnabled = (): boolean => {
  const stored = localStorage.getItem('admin_sound_alerts');
  return stored === null ? true : stored === 'true';
};

export const setSoundEnabled = (enabled: boolean): void => {
  localStorage.setItem('admin_sound_alerts', String(enabled));
};
