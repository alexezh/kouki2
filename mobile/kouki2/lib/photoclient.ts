import { BatchDelayedQueue } from "./DispatchQueue";
import { fetchAdapter } from "./fetchadapter";

export type WirePhotoEntry = {
  id: number;
  hash: string;
  folderId: number;
  fileName: string;
  fileExt: string;
  fileSize: number;
  favorite: number;
  stars: number;
  color: string;
  width: number;
  height: number;
  format: number;
  originalDateTime: string;
  originalHash: string;
  stackHash: string;
  imageId: string;
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

export type WireCollection = {
  id: number;
  name: string;
  // quick, device, user
  kind: string;
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

export async function wireGetCollections(): Promise<WireCollection[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getcollections`)).json();
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

export type RescanFolderRequest = {
  folderId: number;
}

export type RescanFolderResponse = {
  jobId: string;
  result: string;
}

export async function wireAddFolder(name: string): Promise<AddFolderResponse> {
  let request: AddFolderRequest = { folder: name };
  let response = await (await fetchAdapter!.post(`/api/photolibrary/addsourcefolder`, JSON.stringify(request))).json();
  return response;
}

export async function wireRescanFolder(folderId: number): Promise<RescanFolderResponse> {
  let request: RescanFolderRequest = { folderId: folderId };
  let response = await (await fetchAdapter!.post(`/api/photolibrary/rescansourcefolder`, JSON.stringify(request))).json();
  return response;
}

export type GetJobInfoResponse = {
  addedFiles: number;
  updatedFiles: number;
  result: string;
}

export async function wireGetJobStatus(name: string): Promise<GetJobInfoResponse> {
  let request: AddFolderRequest = { folder: name };
  let response = await (await fetchAdapter!.get(`/api/job/getjobstatus/${name}`)).json();
  return response;
}

export type ExportPhotosRequest = {
  path: string;
  format: string;
  photos: number[];
}

export type ExportPhotosResponse = {
  jobId: string;
  result: string;
}

export async function wireExportPhotos(wire: ExportPhotosRequest): Promise<ExportPhotosResponse> {
  let response = await (await fetchAdapter!.post(`/api/export/exportphotos`, JSON.stringify(wire))).json();
  return response;
}
