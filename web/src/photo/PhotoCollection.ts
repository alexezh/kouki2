import { PhotoListKind, WireCollection, WireCollectionMetadata } from "../lib/photoclient";
import { SimpleEventSource } from "../lib/synceventsource";
import { PhotoListId } from "./AlbumPhoto";
import { CollectionId } from "./CollectionStore";

export class PhotoCollection {
  public readonly wire: WireCollection;
  public readonly createDt: Date;
  private _id: PhotoListId;
  private _metadata: WireCollectionMetadata;
  private readonly onChanged: SimpleEventSource<void> = new SimpleEventSource();

  public constructor(wire: WireCollection) {
    this.wire = wire;
    this.createDt = new Date(Date.parse(wire.createDt));
    this._id = new PhotoListId(this.wire.kind, this.wire.id as CollectionId)
    this._metadata = JSON.parse(this.wire.metadata);
  }

  public get id(): PhotoListId { return this._id }
  public get metadata(): WireCollectionMetadata { return this._metadata }
  public get totalPhotos(): number { return this._metadata?.totalPhotos ?? 0 }

  public update(wire: WireCollection): void {
    this.wire.metadata = wire.metadata;
  }
  public addOnChanged(func: () => void): number {
    return this.onChanged.add(func);
  }
  public removeOnChanged(id: number) {
    return this.onChanged.remove(id);
  }

  public updateCount(delta: number) {
    if (this._metadata) {
      this._metadata.totalPhotos += delta;
    }
    wireUpdateCollection({ totalPhotos: this._metadata.totalPhotos })
    this.onChanged.invoke();
  }
}

