import { AlbumPhoto } from "./AlbumPhoto";
import { PhotoFolder } from "./FolderStore";

export class PhotoCollection {
  private _photos: AlbumPhoto[] = [];
  public get protos(): ReadonlyArray<AlbumPhoto> { return this._photos; }

  public addPhotos(photos: AlbumPhoto[]) {

  }
}

export class Device {
  public folder?: PhotoFolder;
  public collection?: PhotoCollection;
}
