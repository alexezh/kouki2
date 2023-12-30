import { IFetchAdapter, getSessionId } from "./fetchadapter";

export class FetchAdapterWeb implements IFetchAdapter {
  get(uri: string): Promise<Response> {
    return fetch(uri);
  }
  post(uri: string, body: string): Promise<any> {
    let sessionId = getSessionId();
    if (sessionId === undefined) {
      throw new Error('Not logged in');
    }
    return fetch(uri, { method: "POST", headers: { "accept": "application/json", "x-session": sessionId }, body: body });
  }
  postBuffer(uri: string, body: ArrayBuffer): Promise<any> {
    let sessionId = getSessionId();
    if (sessionId === undefined) {
      throw new Error('Not logged in');
    }
    return fetch(uri, { method: "POST", headers: { "accept": "application/json", "x-session": sessionId }, body: body });
  }
}

