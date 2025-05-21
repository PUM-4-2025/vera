const url =
  `${window.location.protocol}//${window.location.hostname}` ==
  'http://localhost'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : `${window.location.protocol}//${window.location.hostname}`;

interface MotionDetectionRegion {
  topLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  width: number;
  height: number;
}

export const startMotionDetection = async (
  filename: string,
  region: MotionDetectionRegion
): Promise<boolean> => {
  try {
    // Call the motion detection API
    const apiurl = url + '/api/v1/analysis/startMotion';
    const data = {
      fileName: filename,
      token: '7777',
      x: region.topLeft.x,
      y: region.topLeft.y,
      w: region.width,
      h: region.height,
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
    return result.status === 'OK';
  } catch (error) {
    console.error('Error starting motion detection:', error);
    throw new Error('Failed to start motion detection analysis!');
  }
};
