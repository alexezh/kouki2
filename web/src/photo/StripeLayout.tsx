import { CSSProperties, useState } from "react";
import { AlbumPhoto, PhotoId } from "./AlbumPhoto"
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { PhotoLayout } from "./PhotoLayout";
import { PhotoRowLayout } from "./RowLayout";
import { ViewMode, getState } from "../commands/AppState";
import { selectionManager } from "../commands/SelectionManager";
import { getCssIntVar } from "../lib/htmlutils";
import { getPhotoById } from "./PhotoStore";
import { PhotoViewer } from "./PhotoViewer";

export type PhotoStackProps = {
  photos: ReadonlyArray<PhotoId>;
  currentPhoto: AlbumPhoto | null;
  width: number;
  height: number;
  padding: number;
}

export function StripeLayout(props: PhotoStackProps): JSX.Element {
  let [currentPhoto, setCurrentPhoto] = useState<AlbumPhoto | null>(props.currentPhoto);

  let stripeHeight = getCssIntVar("--photostripe-height");

  function getColumnWidth(idx: number): number {
    let photoId = props.photos[idx];
    let photo = getPhotoById(photoId)!;
    return photo?.width * (stripeHeight / photo.height) + 2 * props.padding;
  }

  function handleClick(photo: AlbumPhoto) {
    setCurrentPhoto(photo);
  }

  function renderPhoto(listProps: ListChildComponentProps): JSX.Element | null {
    let photoId = props.photos[listProps.index];
    if (!photoId) {
      console.log("renderPhoto: cannot find id");
      return null;
    }
    let photo = getPhotoById(photoId);
    if (!photo) {
      console.log("renderPhoto: cannot find photo");
      return null;
    }

    return (
      <PhotoLayout
        key={photo.wire.hash}
        style={listProps.style}
        photo={photo}
        viewMode={ViewMode.stripe}
        height={stripeHeight}
        onClick={() => handleClick(photo!)}
        selected={selectionManager.isSelected(photo)}
        padding={props.padding} />
    )
  }

  let stackStyle: CSSProperties = {
    width: props.width,
    height: props.height
  }

  return (
    <div className="Photo-stack" style={stackStyle}>
      <PhotoViewer className="Photo-stack-viewer"
        width={props.width}
        height={props.height - stripeHeight}
        getImage={(offs: number): AlbumPhoto | null => {
          if (offs === -1 || offs === 1) {
            return null;
          }
          return currentPhoto;
        }} />
      <List
        className="Photo-stack-stripe"
        itemCount={props.photos.length}
        width={props.width}
        height={stripeHeight}
        layout="horizontal"
        itemSize={getColumnWidth}
      >
        {renderPhoto}
      </List>
    </div>
  )
}