const url =
  `${window.location.protocol}//${window.location.hostname}` ==
  'http://localhost'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : `${window.location.protocol}//${window.location.hostname}`;

interface MotionDetectionRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const startMotionDetection = async (
  filename: string,
  region: MotionDetectionRegion
): Promise<number[]> => {
  try {
    // Call the motion detection API
    const apiurl = url + '/api/v1/analysis/startMotion';
    const data = {
      fileName: filename,
      token: '7777',
      x: region.x,
      y: region.y,
      w: region.w,
      h: region.h,
    };

    const response = await fetch(apiurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to start motion detection analysis!');
    }

    const result = await response.json();
    console.log('Motion detection started:', result);
    return result.motion;
  } catch (error) {
    console.error('Error starting motion detection:', error);
    throw new Error('Failed to start motion detection analysis!');
  }
};
