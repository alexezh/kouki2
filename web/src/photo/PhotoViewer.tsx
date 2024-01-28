import { ViewMode, getAppState } from "../commands/AppState";
import { selectionManager } from "../commands/SelectionManager";
import { AlbumPhoto } from "./AlbumPhoto";
import { PhotoLayout } from "./PhotoLayout";
import { PhotoList } from "./PhotoList";

export type PhotoViewerProps = {
  className?: string,
  width: number,
  height: number,
  photos: PhotoList
}
/**
 * render 2 photos; switches visibility between them
 */
export function PhotoViewer(props: PhotoViewerProps): JSX.Element {
  let idx = props.photos.findPhotoPos(selectionManager.lastSelectedPhoto);
  console.log("preview: " + idx);

  let prevPhoto = props.photos.getPrevPhoto(idx);
  let curPhoto = props.photos.getItem(idx);
  let nextPhoto = props.photos.getNextPhoto(idx);

  return (<div className="Photo-viewer">
    {
      (prevPhoto) ?
        (<PhotoLayout
          className="Photo"
          visibility="hidden"
          photo={prevPhoto!}
          padding={0}
          viewMode={ViewMode.zoom}
          width={props.width}
          height={props.height}
          selected={true}></PhotoLayout>) : null
    }

    {
      (curPhoto) ?
        (<PhotoLayout
          visibility="visible"
          photo={curPhoto!}
          padding={0}
          viewMode={ViewMode.zoom}
          width={props.width}
          height={props.height}
          selected={true}></PhotoLayout>) : null
    }

    {
      (nextPhoto) ?
        (<PhotoLayout
          visibility="hidden"
          photo={nextPhoto!}
          padding={0}
          viewMode={ViewMode.zoom}
          width={props.width}
          height={props.height}
          selected={true}></PhotoLayout>) : null
    }
  </div>);
}
