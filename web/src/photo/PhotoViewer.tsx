import { useEffect, useState } from "react";
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
  const [idx, setIdx] = useState(props.photos.findPhotoPos(selectionManager.lastSelectedPhoto));

  useEffect(() => {
    console.log("PhotoViewer: useEffect:" + getAppState().navList?.photoCount);

    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {

      console.log('PhotoViewer changed');
      setIdx(props.photos.findPhotoPos(selectionManager.lastSelectedPhoto));
    });

    return () => {
      selectionManager.removeOnSelectionChanged(selectId);
    }
  }, [props.width]);

  let prevPhoto = props.photos.getPrevPhoto(idx);
  let curPhoto = props.photos.getItem(idx);
  let nextPhoto = props.photos.getNextPhoto(idx);

  return (<div className="Photo-viewer">
    {
      (prevPhoto) ?
        (<PhotoLayout
          key={prevPhoto.id}
          className="Photo"
          visibility="hidden"
          photo={prevPhoto!}
          padding={0}
          hideFavIcon={true}
          viewMode={ViewMode.zoom}
          width={props.width}
          height={props.height}
          selected={true}></PhotoLayout>) : null
    }

    {
      (curPhoto) ?
        (<PhotoLayout
          key={curPhoto.id}
          visibility="visible"
          photo={curPhoto!}
          padding={0}
          hideFavIcon={true}
          viewMode={ViewMode.zoom}
          width={props.width}
          height={props.height}
          selected={true}></PhotoLayout>) : null
    }

    {
      (nextPhoto) ?
        (<PhotoLayout
          key={nextPhoto.id}
          visibility="hidden"
          photo={nextPhoto!}
          padding={0}
          hideFavIcon={true}
          viewMode={ViewMode.zoom}
          width={props.width}
          height={props.height}
          selected={true}></PhotoLayout>) : null
    }
  </div>);
}
