import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

interface FFmpegContextProps {
  ffmpeg: FFmpeg | null;
  loading: boolean;
  error: Error | null;
}

const FFmpegContext = createContext<FFmpegContextProps | undefined>(undefined);

interface FFmpegProviderProps {
  children: ReactNode;
}

export const FFmpegProvider: React.FC<FFmpegProviderProps> = ({ children }) => {
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      setLoading(true);
      setError(null);
      try {
        const ffmpegInstance = new FFmpeg();
        const baseURL = '/ffmpeg-core';
        console.log('Loading ffmpeg from:', `${baseURL}`);
        await ffmpegInstance.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
        });
        console.log('FFmpeg loaded successfully');
        setFFmpeg(ffmpegInstance);
      } catch (err) {
        console.error("Failed to load ffmpeg:", err);
        setError(err instanceof Error ? err : new Error('Failed to load ffmpeg'));
      } finally {
        setLoading(false);
      }
    };
    

    loadFFmpeg();
  }, []);

  return (
    <FFmpegContext.Provider value={{ ffmpeg, loading, error }}>
      {children}
    </FFmpegContext.Provider>
  );
};

export const useFFmpeg = (): FFmpegContextProps => {
  const context = useContext(FFmpegContext);
  if (context === undefined) {
    throw new Error('useFFmpeg must be used within an FFmpegProvider');
  }
  return context;
};