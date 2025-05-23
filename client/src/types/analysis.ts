import { MotionDetectionRegion } from "@/utils/motionDetection";

// Represents the overall state managed by the ProjectContext
export interface AnalysisState {
  histograms: Record<string, any>,
  motionFrames: Record<string, any>,
}

// Defines the shape of the ProjectContext including state and actions
export interface AnalysisContextType extends AnalysisState {
  updateHistogram: (video: string) => Promise<void>;
  updateMotionFrames: (video: string, region: MotionDetectionRegion) => Promise<void>;
}
