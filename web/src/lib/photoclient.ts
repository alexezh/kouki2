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
  // if stacked, id of photo which is main in the stack
  // stack makes sense when original photo is included in the list
  originalId: number;
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
export type ImportFolderRequest = {
  folder: string;
  importCollection: number;
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

export async function wireImportFolder(request: ImportFolderRequest): Promise<AddFolderResponse> {
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
  processedFiles: number;
  result: string;
}

export async function wireGetJobStatus(id: string): Promise<GetJobInfoResponse> {
  let response = await (await fetchAdapter!.get(`/api/job/getjobstatus/${id}`)).json();
  return response;
}

export type ExportPhotosRequest = {
  path: string;
  exportCollection: number;
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

export type BuildPHashRequest = {
  photos: number[] | null;
  folderId?: number;
}

export type JobResponse = ResultResponse & {
  jobId: string;
}

export type BuildPHashResponse = JobResponse & {
}

export async function wireBuildPHash(wire: BuildPHashRequest): Promise<BuildPHashResponse> {
  let response = await (await fetchAdapter!.post(`/api/similarity/buildphash`, JSON.stringify(wire))).json();
  return response;
}

export type GetCorrelationRequest = {
  photos: { left: number, right: number }[];
}

export type GetCorrelationResponse = ResultResponse & {
  corrections: number[];
}

export async function wireGetCorrelation(wire: GetCorrelationRequest): Promise<GetCorrelationResponse> {
  let response = await (await fetchAdapter!.post(`/api/similarity/getcorrelation`, JSON.stringify(wire))).json();
  return response;
}
