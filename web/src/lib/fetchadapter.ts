import { BatchDelayedQueue } from "./DispatchQueue";

export interface IFetchAdapter {
  get(uri: string): Promise<Response>;
  post(uri: string, body?: string): Promise<any>
}

let fetchAdapter: IFetchAdapter | undefined = undefined;
let sessionId: string | undefined;

export function getSessionId(): string | undefined {
  return sessionId;
}

export function setSessionId(id: string) {
  sessionId = id;
}

export function setFetchAdapter(adapter: IFetchAdapter) {
  fetchAdapter = adapter;
}

// get static resource
export async function fetchResource(url: string): Promise<ArrayBuffer> {
  return await (await (await fetchAdapter!.get(url)).blob()).arrayBuffer();
}

export type WirePhotoEntry = {
  id: number;
  hash: string;
  fileName: string;
  fileExt: string;
  favorite: number;
  stars: number;
  color: string;
  width: number;
  height: number;
  format: number;
  originalDateTime: string;
  originalHash: string;
  stackHash: string
}

export type WirePhotoUpdate = {
  hash: string;
  favorite?: number;
  stars?: number;
  color?: UpdateString;
  originalHash?: UpdateString;
  stackHash?: UpdateString;
}

export type WireFolder = {
  id: number;
  path: string;
}

export type UpdateString = {
  val: string;
}

export type UpdatePhotoRequest =
  {
    hash: string;
    favorite: number;
    stars: number;
    color: UpdateString;
    originalHash: UpdateString;
    stackHash: UpdateString;
  }

export async function wireGetFolders(): Promise<WireFolder[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getsourcefolders`)).json();
  return response;
}

export async function wireGetFolder(id: number): Promise<WirePhotoEntry[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getfolder/${id}`)).json();
  return response;
}

export async function wireGetCollection(name: string): Promise<WirePhotoEntry[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getcollection/${name}`)).json();
  return response;
}

export async function wireCheckFolder(name: string): Promise<boolean> {
  let request = { folder: name };
  let response = await (await fetchAdapter!.post(`/api/photolibrary/checksourcefolder`, JSON.stringify(request))).json();
  return response.result === "Ok";
}

let photoUpdateQueue = new BatchDelayedQueue<WirePhotoUpdate>(1000, async (items: WirePhotoUpdate[]) => {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/updatephotos`, JSON.stringify(items))).json();
});

export function wireUpdatePhotos(wire: WirePhotoUpdate) {
  photoUpdateQueue.queue(wire);
}

// ------------- add source folder ----------------
export type AddFolderRequest = {
  folder: string;
}

export type AddFolderResponse = {
  jobId: string;
  result: string;
}

export async function wireAddFolder(name: string): Promise<AddFolderResponse> {
  let request: AddFolderRequest = { folder: name };
  let response = await (await fetchAdapter!.post(`/api/photolibrary/addsourcefolder`, JSON.stringify(request))).json();
  return response;
}

export type GetJobInfoResponse = {
  processedFiles: number;
  result: string;
}

export async function wireGetJobStatus(name: string): Promise<GetJobInfoResponse> {
  let request: AddFolderRequest = { folder: name };
  let response = await (await fetchAdapter!.get(`/api/job/getjobstatus/${name}`)).json();
  return response;
}

