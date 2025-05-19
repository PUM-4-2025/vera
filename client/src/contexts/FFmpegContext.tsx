import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

interface FFmpegContextProps {
  ffmpeg: FFmpeg | null;
  loading: boolean;
  error: Error | null;
  threadsSupported: boolean;
}

const FFmpegContext = createContext<FFmpegContextProps | undefined>(undefined);

interface FFmpegProviderProps {
  children: ReactNode;
}



export const FFmpegProvider: React.FC<FFmpegProviderProps> = ({ children }) => {
  const [ffmpeg, setFFmpeg] = useState<FFmpeg | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [threadsSupported, setThreadsSupported] = useState<boolean>(false);

  useEffect(() => {
    // Check for SharedArrayBuffer and Atomics support
    const checkThreadingSupport = () => {
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
      const hasAtomics = typeof Atomics !== 'undefined';
      const isSecureContext = window.isSecureContext;
      
      const supported = hasSharedArrayBuffer && hasAtomics && isSecureContext;
      console.log('Multi-threading support:', supported ? 'enabled' : 'disabled');
      
      // Log specific missing features for debugging
      if (!supported) {
        if (!hasSharedArrayBuffer) console.warn('Missing SharedArrayBuffer support');
        if (!hasAtomics) console.warn('Missing Atomics support');
        if (!isSecureContext) console.warn('Not in a secure context');
      }
      
      return supported;
    };

    const loadFFmpeg = async () => {
      setLoading(true);
      setError(null);
      
      // Check for threading support
      const threadSupport = checkThreadingSupport();
      setThreadsSupported(threadSupport);
      
      try {
        const ffmpegInstance = new FFmpeg();
        const baseURL = '/ffmpeg-core';
        
        // Configure FFmpeg with threading options if supported
        const options: Record<string, any> = {
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
        };
        
        // Add threading configuration if supported
        if (threadSupport) {
          // These are the worker URLs for threading support
          options.workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript');
          
          // You may need to specify a different core if using the threaded version
          // options.coreURL = await toBlobURL(`${baseURL}/ffmpeg-core-st.js`, 'text/javascript');
          // options.wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core-st.wasm`, 'application/wasm');
        }
        
        console.log('Loading ffmpeg with options:', options);
        await ffmpegInstance.load(options);
        
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

  // Provide threading support status to consumers
  return (
    <FFmpegContext.Provider value={{ ffmpeg, loading, error, threadsSupported }}>
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