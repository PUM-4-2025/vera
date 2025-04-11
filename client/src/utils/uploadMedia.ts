export interface UploadSession {
  uploadId: number;
  file: File;
  completedChunks: number;
  totalChunks: number;
}

export interface UploadStatus {
  uploadId: number;
  status: string;
  completedChunks: number;
  totalChunks: number;
}

const url = `${window.location.protocol}//${window.location.hostname}`;

export const uploadMedia = async (file: File): Promise<UploadSession> => {
  try {
    // Call the inititate API
    const initUrl = url + '/api/v1/uploads/initiate';
    const initData = {
      fileName: file.name,
      fileSize: file.size,
    };
    const initResponse = await fetch(initUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initData),
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initiate upload with server!');
    }

    const initResult = await initResponse.json();
    const uploadId = initResult.uploadId;

    const status = await uploadStatus(uploadId);

    if (status.completedChunks != 0) {
      throw new Error(
        'Server returned completedChunks != 0 when upload was just initialized!'
      );
    }

    const newSession: UploadSession = {
      uploadId: uploadId,
      file: file,
      completedChunks: status.completedChunks,
      totalChunks: status.totalChunks,
    };

    return newSession;
  } catch {
    throw new Error('Failed to initiate upload with server!');
  }
};

export const uploadStatus = async (uploadId: number): Promise<UploadStatus> => {
  try {
    // Call the status API to get information about how many chunks
    // are expected.
    const statusUrl = url + '/api/v1/uploads/status';
    const statusData = {
      uploadId: uploadId,
    };
    const statusResponse = await fetch(statusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusData),
    });

    if (!statusResponse.ok) {
      throw new Error('Failed to get upload status from server!');
    }

    const statusResult = await statusResponse.json();
    const status = statusResult.status;
    const completedChunks = statusResult.uploadedChunks;
    const totalChunks = statusResult.totalChunks;

    return {
      uploadId: uploadId,
      status: status,
      completedChunks: completedChunks,
      totalChunks: totalChunks,
    };
  } catch {
    throw new Error('Failed to get upload status!');
  }
};

// TODO: Properly handle failed uploads
export const uploadChunks = async (uploadSession: UploadSession) => {
  const chunkSize = 5 * 1024 * 1024; // 5 MiB

  for (let i = 1; i <= uploadSession.totalChunks; i++) {
    const chunk = uploadSession.file.slice((i - 1) * chunkSize, i * chunkSize);

    const uploadUrl = url + '/api/v1/uploads/chunks';
    const uploadData = {
      uploadId: uploadSession.uploadId,
      chunkData: chunk,
      chunkIndex: i,
    };
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uploadData),
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload chunk: ' + i);
    }

    const uploadResult = await uploadResponse.json();
    if (uploadResult.status != 'Success') {
      throw new Error('Failed to upload chunk: ' + i);
    }
  }
};

export const uploadComplete = async (uploadId: number) => {
  try {
    // Call the status API to get information about how many chunks
    // are expected.
    const completeUrl = url + '/api/v1/uploads/complete';
    const statusData = {
      uploadId: uploadId,
    };
    const completeResponse = await fetch(completeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statusData),
    });

    if (!completeResponse.ok) {
      throw new Error('Failed to get upload status from server!');
    }

    const completeResult = await completeResponse.json();
    const status = completeResult.status;

    if (status != 'Completed') {
      throw new Error('Server returned error when finishing upload!');
    }
  } catch {
    throw new Error('Finishing upload failed!');
  }
};
