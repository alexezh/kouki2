import { IFetchAdapter, getSessionId } from "./fetchadapter";

export class FetchAdapterWeb implements IFetchAdapter {
  get(uri: string): Promise<Response> {
    return fetch(uri);
  }
  post(uri: string, body: string): Promise<any> {
    return fetch(uri, { method: "POST", headers: { "accept": "application/json" }, body: body });
  }
  postBuffer(uri: string, body: ArrayBuffer): Promise<any> {
    return fetch(uri, { method: "POST", headers: { "accept": "application/json" }, body: body });
  }
  putFile(url: string, fileName: string, contentType: string): Promise<{ status: number, responseText: string | null }> {
    throw new Error("not implemented");
  }
}

