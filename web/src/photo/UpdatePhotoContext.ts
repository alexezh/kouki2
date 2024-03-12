import { WirePhotoUpdate, wireUpdatePhotos } from "../lib/photoclient";
import { PhotoUpdateRecord } from "./AlbumPhoto";
import { invokeLibraryChanged } from "./PhotoStore";

export class UpdatePhotoContext {
  private updates: PhotoUpdateRecord[] = [];
  private wireUpdates: WirePhotoUpdate[] = [];
  private sendWire: boolean;

  public constructor(sendWire: boolean = true) {
    this.sendWire = sendWire;
  }

  public addPhoto(update: PhotoUpdateRecord) {
    this.updates.push(update);
    if (this.sendWire) {
      let wireUpdate: WirePhotoUpdate = {
        hash: update.photo.wire.hash,
        hidden: update.hidden,
        favorite: update.favorite,
        stackId: update.stackId,
        reactions: update.reactions
      }
      this.wireUpdates.push(wireUpdate);
    }
  }

  public commit() {
    invokeLibraryChanged(this.updates);
    if (this.sendWire) {
      wireUpdatePhotos(this.wireUpdates);
    }
  }
}

