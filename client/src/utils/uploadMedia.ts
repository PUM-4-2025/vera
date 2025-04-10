import fs from 'fs';

export interface UploadSession {
    uploadId: number;
    fileName: string;
    fileSize: number;
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

const uploadMedia = async (file: string): Promise<UploadSession> => {
    const fileSize = fs.statSync(file).size;

    try {
        // Call the inititate API
        const initUrl = url + "/api/v1/uploads/initiate"
        const initData = {
            fileName: file,
            fileSize: fileSize,
        }
        const initResponse = await fetch(initUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json"} ,
            body: JSON.stringify(initData)
        });

        if (!initResponse.ok) {
            throw new Error("Failed to initiate upload with server!")
        }

        const initResult = await initResponse.json();
        const uploadId = initResult.uploadId;
        
        const status = await uploadStatus(uploadId);

        if (status.completedChunks != 0) {
            throw new Error("Server returned completedChunks != 0 when upload was just initialized!")
        }

        const newSession: UploadSession = {
            uploadId: uploadId,
            fileName: file,
            fileSize: fileSize,
            completedChunks: status.completedChunks,
            totalChunks: status.totalChunks,
        }

        return newSession;

    } catch {
        throw new Error("Failed to initiate upload with server!")
    }
}

const uploadStatus = async (uploadId: number): Promise<UploadStatus> => {
    try {
        // Call the status API to get information about how many chunks
        // are expected.
        const statusUrl = url + "/api/v1/uploads/status"
        const statusData = {
            uploadId: uploadId
        }
        const statusResponse = await fetch(statusUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json"} ,
            body: JSON.stringify(statusData)
        });

        if (!statusResponse.ok) {
            throw new Error("Failed to get upload status from server!")
        }

        const statusResult = await statusResponse.json();
        const status = statusResult.status;
        const completedChunks = statusResult.uploadedChunks;
        const totalChunks = statusResult.totalChunks;

        return {
            uploadId: uploadId,
            status: status,
            completedChunks: completedChunks,
            totalChunks: totalChunks
        }
    } catch {
        throw new Error("Failed to get upload status!")
    }
}

const uploadChunk = async () => {

}

const uploadComplete = async () => {

}