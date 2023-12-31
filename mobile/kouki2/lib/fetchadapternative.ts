import { Alert } from "react-native";
import { IFetchAdapter, getSessionId } from "./fetchadapter";

export class FetchAdapterNative implements IFetchAdapter {
  private baseUrl: string = "http://ezhm.local:5054";

  get(uri: string): Promise<Response> {
    return fetch(this.baseUrl + uri);
  }
  post(uri: string, body: string): Promise<any> {
    return fetch(this.baseUrl + uri, {
      method: "POST",
      headers: { "accept": "application/json" }, body: body
    });
  }
  postBuffer(uri: string, body: ArrayBuffer): Promise<any> {
    let sessionId = getSessionId();
    if (sessionId === undefined) {
      throw new Error('Not logged in');
    }
    return fetch(this.baseUrl + uri, {
      method: "POST",
      headers: { "accept": "application/json" }, body: body
    });
  }

  async putFile(url: string, fileName: string, contentType: string): Promise<{ status: number, responseText: string | null }> {
    return new Promise((resolver, rejecter) => {
      const xhr = new XMLHttpRequest();

      xhr.onload = () => {
        resolver({ status: xhr.status, responseText: xhr.responseText });
      };
      xhr.onerror = (error) => {
        rejecter({ status: -1 })
      };

      xhr.open('POST', this.baseUrl + url);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send({ uri: fileName });
    })
  }
}
