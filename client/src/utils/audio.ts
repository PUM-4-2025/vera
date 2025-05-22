const url =
  `${window.location.protocol}//${window.location.hostname}` ==
  'http://localhost'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : `${window.location.protocol}//${window.location.hostname}`;

export const getAudio = async (filename: string): Promise<number[] | null> => {
  try {
    // Call the inititate API
    const apiurl = url + '/api/v1/analysis/startAudio';
    const data = {
      fileName: filename,
      token: '7777',
    };
    const response = await fetch(apiurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        'Something went wrong getting audio analysis from server!'
      );
    }

    const result = await response.json();
    const samples: string[] = result.audio.split('\n');

    const cast_samples = [];

    for (let i = 0; i < samples.length - 2; i++) {
      cast_samples[i] = Number(samples[i]);
    }

    if (samples.length > 0) {
      return cast_samples;
    }
    return null;
  } catch {
    throw new Error('Failed to get analysed audio from server!');
  }
};
