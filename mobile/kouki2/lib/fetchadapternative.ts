import { IFetchAdapter, getSessionId } from "./fetchadapter";

export class FetchAdapterNative implements IFetchAdapter {
  private baseUrl: string = "https://ezhm.local:5054";

  get(uri: string): Promise<Response> {
    return fetch(this.baseUrl + uri);
  }
  post(uri: string, body: string): Promise<any> {
    let sessionId = getSessionId();
    if (sessionId === undefined) {
      throw new Error('Not logged in');
    }
    return fetch(this.baseUrl + uri, {
      method: "POST",
      headers: { "accept": "application/json", "x-session": sessionId }, body: body
    });
  }
  postBuffer(uri: string, body: ArrayBuffer): Promise<any> {
    let sessionId = getSessionId();
    if (sessionId === undefined) {
      throw new Error('Not logged in');
    }
    return fetch(this.baseUrl + uri, {
      method: "POST",
      headers: { "accept": "application/json", "x-session": sessionId }, body: body
    });
  }
}
