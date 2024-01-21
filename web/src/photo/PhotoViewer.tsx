import { ViewMode, getState } from "../commands/AppState";
import { selectionManager } from "../commands/SelectionManager";
import { AlbumPhoto } from "./AlbumPhoto";
import { PhotoLayout } from "./PhotoLayout";

export type PhotoViewerProps = {
  className?: string,
  width: number,
  height: number,
  getImage: (offs: number) => AlbumPhoto | null
}
/**
 * render 2 photos; switches visibility between them
 */
export function PhotoViewer(props: PhotoViewerProps): JSX.Element {
  let photos = getState().workList;
  let idx = photos.findPhotoPos(selectionManager.lastSelectedPhoto);
  console.log("preview: " + idx);

  let prevPhoto = props.getImage(-1);
  let curPhoto = props.getImage(0);
  let nextPhoto = props.getImage(1);

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

    <PhotoLayout
      visibility="visible"
      photo={curPhoto!}
      padding={0}
      viewMode={ViewMode.zoom}
      width={props.width}
      height={props.height}
      selected={true}></PhotoLayout>

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
