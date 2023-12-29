import { catchAllAsync } from "../lib/error";
import { WireDevice, wireGetDevices } from "../lib/fetchadapter";
import { SimpleEventSource } from "../lib/synceventsource";
import { AlbumPhoto, FolderId } from "./AlbumPhoto";
import { PhotoFolder, getFolder } from "./FolderStore";

export class PhotoCollection {
  private _photos: AlbumPhoto[] = [];
  public get protos(): ReadonlyArray<AlbumPhoto> { return this._photos; }

  public addPhotos(photos: AlbumPhoto[]) {

  }
}

export type CollectionId = number & {
  __tag_collection: boolean;
}

function getCollection(id: CollectionId): PhotoCollection {
  return new PhotoCollection();
}

export class Device {
  public wire: WireDevice;
  public archiveFolder: PhotoFolder;
  public deviceCollection: PhotoCollection;

  public get name(): string { return this.wire.name }

  public constructor(wire: WireDevice, folder: PhotoFolder, coll: PhotoCollection) {
    this.wire = wire;
    this.archiveFolder = folder;
    this.deviceCollection = coll;
  }
}

let devices: Device[] = [];
let deviceChanged = new SimpleEventSource();

export function addOnDeviceChanged(func: () => void): number {
  return deviceChanged.add(func);
}

export function removeOnDeviceChanged(id: number) {
  return deviceChanged.remove(id);
}

export function triggerRefreshDevices() {
  setTimeout(async () => {
    await loadDevices();
  });
}

export function getDevices(): Device[] {
  return devices;
}

export async function loadDevices(): Promise<Device[]> {
  catchAllAsync(async () => {
    devices = [];
    let wireDevices = await wireGetDevices();
    for (let wire of wireDevices) {
      let folder = getFolder(wire.archiveFolderId as FolderId);
      if (!folder) {
        continue;
      }
      let coll = getCollection(wire.deviceCollectionId as CollectionId);

      devices.push(new Device(wire, folder, coll))
    }
  });

  deviceChanged.invoke();
  return devices;
}
