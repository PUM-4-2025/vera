import React, { createContext, useState, useContext, ReactNode } from 'react';
import { getAudio } from '@/utils/audio';
import { AnalysisContextType, AnalysisState } from '@/types/analysis';
import { runMotionDetection, MotionDetectionRegion } from '@/utils/motionDetection';


// Create initial state (conforms to ProjectState type)
const initialState: AnalysisState = {
  histograms: {},
  motionFrames: {}
};


// Create the context
const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

// Create a provider component
export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AnalysisState>(initialState);

  const updateHistogram = async (video: string) => {
    const histogramValues = await getAudio(video);
    setState((prevState) => ({
      ...prevState,
      histograms: {
        ...prevState.histograms,
        [video]: histogramValues,
      },
    }));
  };

  // Function to update motionFrames
  const updateMotionFrames = async (video: string, region: MotionDetectionRegion) => {
    const motionValues = await runMotionDetection(video, region);
    setState((prevState) => ({
      ...prevState,
      motionFrames: {
        ...prevState.motionFrames,
        [video]: motionValues,
      },
    }));
  };

  const contextValue: AnalysisContextType = {
    ...state,
    updateHistogram,
    updateMotionFrames,
  };
  return (
    <AnalysisContext.Provider value={contextValue}>
      {children}
    </AnalysisContext.Provider>
  );

};


// --- Custom Hook for Consuming Context ---
export const useAnalysis = (): AnalysisContextType => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('Oopsie occured in useAnalysis()');
  }
  return context;
};
