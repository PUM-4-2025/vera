const url =
  `${window.location.protocol}//${window.location.hostname}` ==
  'http://localhost'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : `${window.location.protocol}//${window.location.hostname}`;

export const getAudio = async (filename: string): Promise<[number] | null> => {
  try {
    // Call the inititate API
    const apiurl = url + '/api/v1/analysis/startAudio';
    const data = {
      fileName: filename,
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

    console.log(response);
    const result = await response.json();
    console.log(result);
    const samples: [number] = result.audio;

    console.log(samples);

    if (samples.length > 0) {
      return samples;
    }
    return null;
  } catch {
    throw new Error('Failed to get analysed audio from server!');
  }
};
