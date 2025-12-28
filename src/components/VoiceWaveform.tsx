import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface VoiceWaveformProps {
  isActive: boolean;
}

const VoiceWaveform = ({ isActive }: VoiceWaveformProps) => {
  const [bars, setBars] = useState<number[]>(Array(5).fill(0.3));
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isActive) {
      startAudioAnalysis();
    } else {
      stopAudioAnalysis();
    }

    return () => {
      stopAudioAnalysis();
    };
  }, [isActive]);

  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 32;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const animate = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Get 5 frequency bands for the bars
        const newBars = [
          dataArray[1] / 255,
          dataArray[2] / 255,
          dataArray[3] / 255,
          dataArray[4] / 255,
          dataArray[5] / 255,
        ].map(v => Math.max(0.15, v)); // Minimum height

        setBars(newBars);
        animationRef.current = requestAnimationFrame(animate);
      };

      animate();
    } catch (error) {
      console.error("Error accessing microphone for visualization:", error);
      // Fallback to random animation
      const animateFallback = () => {
        const newBars = Array(5).fill(0).map(() => 
          0.2 + Math.random() * 0.8
        );
        setBars(newBars);
        animationRef.current = requestAnimationFrame(animateFallback);
      };
      animateFallback();
    }
  };

  const stopAudioAnalysis = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setBars(Array(5).fill(0.3));
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex items-center justify-center gap-0.5 h-6"
    >
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className="w-1 rounded-full bg-primary"
          animate={{
            height: `${height * 24}px`,
          }}
          transition={{
            duration: 0.1,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.div>
  );
};

export default VoiceWaveform;
