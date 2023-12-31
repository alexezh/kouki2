import { ResultResponse, fetchAdapter } from "./fetchadapter";

type AddDeviceRequest = {
  name: string
}

export type WireDevice = {
  id: number;
  name: string;
  archiveFolderId: number;
  deviceCollectionId: number;
}

export async function wireAddDevice(name: string): Promise<ResultResponse> {
  let request: AddDeviceRequest = { name: name };
  let response = await (await fetchAdapter!.post(`/api/mobilesync/adddevice`, JSON.stringify(request))).json();
  return response;
}

export async function wireGetDevices(): Promise<WireDevice[]> {
  let response = await (await fetchAdapter!.get(`/api/mobilesync/getdevices`)).json();
  return response;
}

export type ConnectDeviceRequest = {
  name: string
}

export type ConnectDeviceResponse = {
  archiveFolderId: number;
  deviceCollectionId: number;
}

export async function wireConnectDevice(name: string): Promise<ConnectDeviceResponse> {
  let request: ConnectDeviceRequest = { name: name };
  let response = await (await fetchAdapter!.post(`/api/mobilesync/connectdevice`, JSON.stringify(request))).json();
  return response;
}

export type GetSyncListRequest = {
  deviceFolderId: number;
  files: string[];
}

export type GetSyncListResponse = ResultResponse & {
  files: string[];
}

export async function wireGetSyncList(request: GetSyncListRequest): Promise<GetSyncListResponse> {
  let response = await (await fetchAdapter!.post(`/api/mobilesync/getsynclist`, JSON.stringify(request))).json();
  return response;
}

export type UploadFileResponse = ResultResponse & {
  hash: string
}

export async function wireGetFile(url: string): Promise<ArrayBuffer> {
  return await (await (await fetchAdapter!.get(url)).blob()).arrayBuffer();
}

export const uploadFileUrl = '/api/mobilesync/uploadfile';

export async function wireUploadFile(buffer: ArrayBuffer): Promise<UploadFileResponse> {
  let response = await (await fetchAdapter!.postBuffer('/api/mobilesync/uploadfile', buffer)).json();
  return response;
}

export type AddFileRequest = {
  archiveFolderId: number;
  deviceCollectionId: number;
  hash: string;
  fileName: string;
  favorite: boolean;
}

export async function wireAddFile(request: AddFileRequest): Promise<ResultResponse> {
  let response = await (await fetchAdapter!.post(`/api/mobilesync/addfile`, JSON.stringify(request))).json();
  return response;
}
