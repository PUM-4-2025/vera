import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
// Import VideoMetadata type from ProjectContext (adjust path if needed)
import { VideoFFmpegHandle, VideoMetadata } from '@/types/project';

const MAX_METADATA_SIZE = 50 * 1024 * 1024;

/**
 * Extracts basic video metadata using ffmpeg -i.
 * @param file The video File object.
 * @param ffmpeg Initialized FFmpeg instance.
 * @returns A promise resolving to the VideoMetadata object.
 */
export const getMetadata = async (
  file: File,
  ffmpeg: FFmpeg
): Promise<VideoMetadata> => {
  if (!ffmpeg.loaded) {
    throw new Error('FFmpeg is not loaded.');
  }

  const inputFilename = `input-${file.name}`; // Simple filename for FS
  const logMessages: string[] = [];

  // Logger callback to capture stderr
  const logger = ({ type, message }: { type: string; message: string }) => {
    // Only store messages relevant for parsing (usually on fferr)
    if (type === 'stderr') {
      logMessages.push(message);
    }
  };

  // Attach logger
  ffmpeg.on('log', logger);

  let fileBlob: Blob | File; // Declare fileBlob here to make it accessible later

  if (file.size > MAX_METADATA_SIZE * 2) {
    // If the file is large, take the beginning and end chunks
    const fileBlobStart = file.slice(0, MAX_METADATA_SIZE);
    // Get the last MAX_METADATA_SIZE bytes of the file
    const fileBlobEnd = file.slice(file.size - MAX_METADATA_SIZE);
    fileBlob = new Blob([fileBlobStart, fileBlobEnd], { type: file.type });
  } else {
    // Otherwise, use the whole file
    fileBlob = file;
  }

  try {
    // Write the potentially smaller blob or the full file to FFmpeg's filesystem
    await ffmpeg.writeFile(inputFilename, await fetchFile(fileBlob));

    try {
      // Execute ffmpeg -i command. Expected to throw/reject.
      await ffmpeg.exec(['-i', inputFilename]);
    } catch (e) {
      // Expected error, ignore.
      // console.error('ffmpeg -i command failed (expected for metadata extraction), error:', e); // Removed debug log
    }

    // Combine log lines for parsing
    const output = logMessages.join('\n');
    // console.log('Combined FFmpeg log output for parsing:\n', output); // Removed debug log

    // --- Individual Regex Matching ---

    /* eslint-disable */

    // Duration (likely on its own line)
    const durationMatch = output.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);

    // Video Codec (looking for the word after "Video:" on a stream line)
    const codecMatch = output.match(/Stream #\d:\d+.*Video: (\w+)/);

    // Dimensions (looking for WxH, potentially with extra info around it)
    const dimensionsMatch = output.match(/, (\d{2,})x(\d{2,})/);

    // FPS (looking for the number before "fps")
    const fpsMatch = output.match(/([\d\.]+) fps/);

    // Audio Codec (looking for the word after "Audio:" on a stream line)
    const audioMatch = output.match(/Stream #\d:\d+.*Audio: (\w+)/);

    /* eslint-enable */

    // --- Parsing with Fallbacks ---
    let durationSeconds = 0;
    const durationStr = durationMatch?.[1];
    if (durationStr) {
      const timeParts = durationStr.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (timeParts) {
        const hours = parseInt(timeParts[1] ?? '0', 10);
        const minutes = parseInt(timeParts[2] ?? '0', 10);
        const seconds = parseInt(timeParts[3] ?? '0', 10);
        const milliseconds = parseInt(timeParts[4] ?? '0', 10);
        durationSeconds =
          hours * 3600 + minutes * 60 + seconds + milliseconds / 100;
      }
    }

    // Extract individual pieces with fallbacks
    const videoCodec = codecMatch?.[1] ?? 'unknown';
    const width = parseInt(dimensionsMatch?.[1] ?? '0', 10);
    const height = parseInt(dimensionsMatch?.[2] ?? '0', 10);
    const fps = parseFloat(fpsMatch?.[1] ?? '0');
    const audioCodec = audioMatch?.[1]; // Undefined is acceptable

    // --- Calculate Total Frames ---
    let totalFrames: number | undefined = undefined;
    if (durationSeconds > 0 && fps > 0) {
      totalFrames = Math.round(durationSeconds * fps);
    }

    // --- Construct Metadata Object ---
    const metadata: VideoMetadata = {
      filename: file.name,
      duration: durationSeconds,
      videoCodec: videoCodec,
      width: width,
      height: height,
      fps: fps,
      audioCodec: audioCodec,
      sizeBytes: file.size,
      totalFrames: totalFrames, // Add calculated frames
      isTranscoded: false,
      isTransmuxed: false,
    };

    // Optional: Log warnings if specific matches failed
    if (!codecMatch)
      console.warn(
        `[ffmpegUtils] Could not parse video codec for file: ${file.name}`
      );
    if (!dimensionsMatch)
      console.warn(
        `[ffmpegUtils] Could not parse dimensions for file: ${file.name}`
      );
    if (!fpsMatch)
      console.warn(`[ffmpegUtils] Could not parse FPS for file: ${file.name}`);

    // console.log('Extracted Metadata:', metadata); // Removed debug log

    return metadata;
  } catch (error) {
    console.error(`Error getting metadata for ${file.name}:`, error);
    throw error; // Re-throw
  } finally {
    // Cleanup: remove logger and delete file
    ffmpeg.off('log', logger);
    try {
      // Check if file exists before deleting
      const files = await ffmpeg.listDir('/');
      if (files.some((f) => f.name === inputFilename && !f.isDir)) {
        await ffmpeg.deleteFile(inputFilename);
      }
    } catch (cleanupError) {
      // Log cleanup error but don't throw
      console.warn(
        `Failed to cleanup temporary file ${inputFilename}:`,
        cleanupError
      );
    }
  }
};

async function ensureFFmpegFile(ffmpeg: FFmpeg, videoFile: File, ffmpegHandle?: VideoFFmpegHandle) {
  if (ffmpegHandle) {
    const files = await ffmpeg.listDir('/');
    const fileExists = files.some(file => file.name === ffmpegHandle.filename);
    if (!fileExists) {
      await ffmpeg.writeFile(ffmpegHandle.filename, await fetchFile(videoFile));
    }
    return ffmpegHandle.filename;
  } else {
    const tempFilename = `temp-${Date.now()}.mp4`;
    await ffmpeg.writeFile(tempFilename, await fetchFile(videoFile));
    return tempFilename;
  }
}

export const captureFrame = async (
  file: File,
  ffmpeg: FFmpeg,
  timestamp: number,
  ffmpegHandle?: VideoFFmpegHandle
): Promise<string> => {
  if (!ffmpeg.loaded) {
    throw new Error('FFmpeg is not loaded.');
  }


  const outputFilename = `frame-${Date.now()}.png`;

  const inputFilename = await ensureFFmpegFile(ffmpeg, file, ffmpegHandle);

  try {
    // Use -ss before -i for fast seeking
    await ffmpeg.exec([
      '-ss', timestamp.toString(),
      '-i', inputFilename,
      '-vframes', '1',
      '-c:v', 'png',
      '-pix_fmt', 'rgba',
      '-vsync', '0',
      '-an',
      outputFilename
    ]);

    const frameData = await ffmpeg.readFile(outputFilename);
    const frameBlob = new Blob([frameData], { type: 'image/png' });
    const base64Data = await blobToBase64(frameBlob);
    return base64Data;
  } finally {
    if (!ffmpegHandle) {
      await ffmpeg.deleteFile(inputFilename);
    }
    await ffmpeg.deleteFile(outputFilename);
  }
};


// Helper function to convert Blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
