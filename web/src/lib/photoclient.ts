import { AlbumPhoto } from "../photo/AlbumPhoto";
import { BatchDelayedQueue } from "./DispatchQueue";
import { ResultResponse, fetchAdapter } from "./fetchadapter";

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

export type WireCollectionItem = {
  photoId: number;
  updateDt: string;
}

export type PhotoListKind = 'quick' | 'all' | 'import' | 'export' | 'folder' | 'unknown';

export type WireCollection = {
  id: number;
  name: string;
  // quick, device, user
  kind: PhotoListKind;
  updateDt: string;
}

export type WireAddCollectionRequest = {
  kind: string;
  name: string;
  createDt: string;
}

export type WireAddCollectionResponse = ResultResponse & {
  collection: WireCollection;
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

export async function wireGetFolder(id: number): Promise<WireCollectionItem[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getfolder/${id}`)).json();
  return response;
}

export async function wireGetCollections(): Promise<WireCollection[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getcollections`)).json();
  return response;
}

export async function wireAddCollection(request: WireAddCollectionRequest): Promise<WireAddCollectionResponse> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/addcollection`, JSON.stringify(request))).json();
  return response;
}

export async function wireGetLibrary(): Promise<WirePhotoEntry[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getlibrary`)).json();
  return response;
}

export async function wireGetCollectionItems(id: number): Promise<WireCollectionItem[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getcollectionitems/${id}`)).json();
  return response;
}

export async function wireAddCollectionItems(id: number, items: WireCollectionItem[]): Promise<ResultResponse> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/addcollectionitems/${id}`, JSON.stringify(items))).json();
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

