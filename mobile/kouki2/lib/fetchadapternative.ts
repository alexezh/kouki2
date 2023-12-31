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
      let xhr: XMLHttpRequest = new XMLHttpRequest();

      xhr.onload = () => {
        xhr.onerror = null;
        xhr.onload = null;
        let result = { status: xhr.status, responseText: xhr.responseText };
        // @ts-ignore
        xhr = null;
        resolver(result);
      };
      xhr.onerror = (error) => {
        xhr.onerror = null;
        xhr.onload = null;
        let result = { status: -1 };
        // @ts-ignore
        xhr = null;
        rejecter(result);
      };

      xhr.open('POST', this.baseUrl + url);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send({ uri: fileName });
    })
  }
}
