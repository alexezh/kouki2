import { IEventHandler } from "../lib/synceventsource";
import { AlbumPhoto } from "./AlbumPhoto";
import { IPhotoListSource } from "./PhotoList";
import { libraryChanged, photoChanged } from "./PhotoStore";

export abstract class LibraryPhotoSource implements IPhotoListSource {
  private changeHandler: (() => void) | null = null;
  private readonly photoChangedHandler: IEventHandler<AlbumPhoto[]>;
  private readonly libraryChangedHandler: IEventHandler<void>;

  public constructor() {
    let self = this;
    this.photoChangedHandler = {
      invoke(args: AlbumPhoto[]): void {
        return self.onPhotoChanged(args)
      }
    }
    this.libraryChangedHandler = {
      invoke(): void {
        return self.onLibraryChanged()
      }
    }
    libraryChanged.add(this.libraryChangedHandler);
    photoChanged.add(this.photoChangedHandler);
  }

  public setChangeHandler(func: () => void): void {
    this.changeHandler = func;
  }

  addItems(items: AlbumPhoto[]): void {
  }

  removeItems(items: AlbumPhoto[]): void {
  }

  protected onPhotoChanged(photos: AlbumPhoto[]) {
    this.changeHandler?.call(this);
  }

  protected onLibraryChanged() {
    this.changeHandler?.call(this);
  }

  abstract getItems(): readonly AlbumPhoto[];
}