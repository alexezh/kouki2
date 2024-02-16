import { IEventHandler } from "../lib/synceventsource";
import { AlbumPhoto, LibraryUpdateRecord, LibraryUpdateRecordKind } from "./AlbumPhoto";
import { AppFilter, IPhotoListSource } from "./PhotoList";
import { libraryChanged } from "./PhotoStore";

export abstract class LibraryPhotoSource implements IPhotoListSource {
  protected changeHandler: ((update: LibraryUpdateRecord[]) => void) | null = null;
  private readonly libraryChangedHandler: IEventHandler<LibraryUpdateRecord[]>;

  public constructor() {
    let self = this;
    this.libraryChangedHandler = {
      invoke(updates: LibraryUpdateRecord[]): void {
        return self.onLibraryChanged(updates)
      }
    }
    libraryChanged.add(this.libraryChangedHandler);
  }

  public setChangeHandler(func: (update: LibraryUpdateRecord[]) => void): void {
    this.changeHandler = func;
  }

  addItems(items: AlbumPhoto[]): void {
  }

  removeItems(items: AlbumPhoto[]): void {
  }

  public abstract setAppFilter(filter: AppFilter): void;
  public abstract isHidden(photo: AlbumPhoto): boolean;

  protected onLibraryChanged(updates: LibraryUpdateRecord[]) {
    this.changeHandler?.call(this, updates);
  }

  abstract getItems(): readonly AlbumPhoto[];
}