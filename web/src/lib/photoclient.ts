import { AlbumPhoto } from "../photo/AlbumPhoto";
import { BatchDelayedQueue } from "./DispatchQueue";
import { ResultResponse, fetchAdapter } from "./fetchadapter";

export enum ReactionKind {
  Grinning = '1',
  PurpleHeart = '2',
  ThumbsUp = '3',
  ThumbsDown = '4',
}

export function reactionKindToEmoji(c: string) {
  switch (c) {
    case ReactionKind.Grinning: return String.fromCodePoint(0x1F600);
    case ReactionKind.PurpleHeart: return String.fromCodePoint(0x1FA77);
    case ReactionKind.ThumbsUp: return String.fromCodePoint(0x1F44D);
    case ReactionKind.ThumbsDown: return String.fromCodePoint(0x1F44E);
    default: return "Unknown";
  }
}

export type WirePhotoEntry = {
  id: number;
  hash: string;
  folderId: number;
  fileName: string;
  fileExt: string;
  fileSize: number;
  reactions?: string;
  stars: number;
  // indicates that photo is hidden from "all phptos" collection
  hidden: boolean;
  color: string;
  width: number;
  height: number;
  format: number;
  originalDt: string;
  // if stacked, id of photo which is main in the stack
  // stack makes sense when original photo is included in the list
  stackId: number;
  originalId: number;
  originalCorrelation: number;
  altText: string;
}

export type WirePhotoUpdate = {
  hash: string;
  favorite?: number;
  hidden?: boolean;
  stars?: number;
  color?: UpdateString;
  stackId?: number;
  reactions?: string;
}

export type WireCollectionMetadata = {
  totalPhotos: number;
}

export type WireFolderMetadata = WireCollectionMetadata & {
  path: string;
}

export type WireCollectionItem = {
  photoId: number;
  updateDt: string;
}

export type PhotoListKind = 'quick' |
  'all' |
  'favorite' |
  'rejected' |
  'import' |
  'export' |
  'folder' |
  'stack' |
  'unknown' |
  'hidden';

export type WireCollection = {
  id: number;
  name: string;
  // quick, device, user
  kind: PhotoListKind;
  createDt: string;
  metadata: string;
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
    stackHash: UpdateString;
  }

export async function wireGetCollections(): Promise<WireCollection[]> {
  let response = await (await fetchAdapter!.get(`/api/photolibrary/getcollections`)).json();
  return response;
}

export type WireUpdateCollectionRequest = {
  totalPhotos?: number;
}

export async function wireUpdateCollection(id: number, update: WireUpdateCollectionRequest): Promise<ResultResponse> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/updatecollection/${id}`)).json();
  return response;
}

export async function wireAddCollection(request: WireAddCollectionRequest): Promise<WireAddCollectionResponse> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/addcollection`, JSON.stringify(request))).json();
  return response;
}

export type WireGetLibraryRequest = {
  minId: number
}

export async function wireGetLibrary(minId: number): Promise<WirePhotoEntry[]> {
  let request: WireGetLibraryRequest = {
    minId: minId
  }
  let response = await (await fetchAdapter!.post(`/api/photolibrary/getlibrary`, JSON.stringify(request))).json();
  return response;
}

export type WireGetPhotosRequest = {
  minId: number;
  /**
   * if set, start day for photos
   */
  startDt?: string;

  /**
   * if set, list of IDs to get
   */
  photoIds?: number[];

  /**
   * if set, collection to retrieve photos
   */
  collectionId?: number;
}

export async function wireGetPhotos(request: WireGetPhotosRequest): Promise<WirePhotoEntry[]> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/getphotos`, JSON.stringify(request))).json();
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

export async function wireRemoveCollectionItems(id: number, items: WireCollectionItem[]): Promise<ResultResponse> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/removecollectionitems/${id}`, JSON.stringify(items))).json();
  return response;
}

export type TextSearchRequest = {
  collKind: string;
  collId: number;
  search: string;
  startDt?: string;
}

export async function wireTextSearch(request: TextSearchRequest): Promise<WireCollectionItem[]> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/textsearch`, JSON.stringify(request))).json();
  return response;
}

let photoUpdateQueue = new BatchDelayedQueue<WirePhotoUpdate>(1000, async (items: WirePhotoUpdate[]) => {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/updatephotos`, JSON.stringify(items))).json();
});

export function wireUpdatePhotos(wire: WirePhotoUpdate[]) {
  if (wire.length === 0) {
    return;
  }

  photoUpdateQueue.queue(wire);
}

export function wireUpdatePhoto(wire: WirePhotoUpdate) {
  photoUpdateQueue.queue(wire);
}

// ------------- add source folder ----------------
export type ImportFolderRequest = {
  folder: string;
  dryRun: boolean;
  importCollection: number;
}

export type ImportFolderResponse = StartJobResponse & {
}

export type GetFolderInfoRequest = {
  folder: string;
}

export async function wireImportFolder(request: ImportFolderRequest): Promise<ImportFolderResponse> {
  let response = await (await fetchAdapter!.post(`/api/photolibrary/importsourcefolder`, JSON.stringify(request))).json();
  return response;
}

export type CollectionJobKind = 'phash' | 'alttext' | 'rescan' | 'similarity';
export type ProcessCollectionJobRequest = {
  cmd: CollectionJobKind;
  collKind: string;
  collId: number;
  forceUpdate: boolean;
}

export async function wireProcessCollectionJob(request: ProcessCollectionJobRequest): Promise<StartJobResponse> {

  let response = await (await fetchAdapter!.post(`/api/job/processcollection`, JSON.stringify(request))).json();
  return response;
}

export type GetJobStatusResponse = ResultResponse & {
}

export type ImportJobStatusResponse = GetJobStatusResponse & {
  addedFiles: number;
  updatedFiles: number;
}

export type ProcessCollectionStatusResponse = GetJobStatusResponse & {
  processedFiles: number;
}

export async function wireGetJobStatus<T extends ResultResponse>(id: string): Promise<T> {
  try {
    let response = await (await fetchAdapter!.get(`/api/job/getjobstatus/${id}`)).json();
    return response;
  }
  catch (e: any) {
    return { result: 'Failed', message: e.toString() } as T;
  }
}

export type ExportPhotosRequest = {
  path: string;
  exportCollection: number;
  format: string;
  photos: number[];
}

export type ExportPhotosResponse = StartJobResponse & {
}

export async function wireExportPhotos(wire: ExportPhotosRequest): Promise<ExportPhotosResponse> {
  let response = await (await fetchAdapter!.post(`/api/export/exportphotos`, JSON.stringify(wire))).json();
  return response;
}

export type StartJobResponse = ResultResponse & {
  jobId: string;
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
