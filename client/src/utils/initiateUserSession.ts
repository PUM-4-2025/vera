import { UploadSession } from './uploadMedia';

export interface UserSession {
  userId: number;
}

const url =
  `${window.location.protocol}//${window.location.hostname}` ==
  'http://localhost'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : `${window.location.protocol}//${window.location.hostname}`;

export const initiateUserSession = async (): Promise<UserSession> => {
  try {
    //Prepare URL and JSON object for initialisation
    const initUrl = url + '/api/v1/user/initiate';
    const userToken = 7777; //change this to cookie or smthng
    const initData = { userId: userToken };

    const initResponse = await fetch(initUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initData),
    });

    if (!initResponse.ok) {
      throw new Error('Failed to initiate user session');
    }

    console.log(initResponse);
    const initResult = await initResponse.json();
    console.log(initResult);

    const userSession: UserSession = {
      userId: userToken,
    };

    return userSession;
  } catch {
    throw new Error('Failed to initiate user session');
  }
};
