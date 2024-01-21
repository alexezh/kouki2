import { CSSProperties, useEffect, useRef, useState } from "react";
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
  width: number;
  height: number;
  padding: number;
}

export function StripeLayout(props: PhotoStackProps): JSX.Element {
  let [currentPhotoIdx, setCurrentPhotoIdx] = useState<number>(0);
  let [photos, setPhotos] = useState<AlbumPhoto[]>(getState().workList.asArray());
  const listRef = useRef(null);

  console.log("StripeLayout: render");

  useEffect(() => {
    console.log("StripeLayout: useEffect:");

    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {

      console.log('StripeLayout: selection changed');

      if (listRef.current) {
        if (selectionManager.lastSelectedPhoto) {
          let idx = photos.findIndex((x) => x === selectionManager.lastSelectedPhoto);
          console.log("StripeLayout: scrollSelect to " + idx);
          if (idx !== -1) {
            // @ts-ignore
            listRef.current.scrollToItem(idx);
            setCurrentPhotoIdx(idx);
          }
        }
      }
    });

    let collId = getState().workList.addOnChanged(() => {
      setPhotos(getState().workList.asArray())
    });

    return () => {
      getState().workList.removeOnChanged(collId);
      selectionManager.removeOnSelectionChanged(selectId);
    }
  });

  let stripeHeight = getCssIntVar("--photostripe-height");

  function getColumnWidth(idx: number): number {
    let photo = photos[idx];
    return photo?.width * (stripeHeight / photo.height) + 2 * props.padding;
  }

  function handleClick(photoIdx: number) {
    selectionManager.reset([photos[photoIdx]]);
  }

  function renderPhoto(listProps: ListChildComponentProps): JSX.Element | null {
    let photo = photos[listProps.index];
    if (!photo) {
      console.log("renderPhoto: cannot find id");
      return null;
    }

    return (
      <PhotoLayout
        key={photo.wire.hash}
        style={listProps.style}
        photo={photo}
        viewMode={ViewMode.stripe}
        height={stripeHeight}
        onClick={() => handleClick(listProps.index!)}
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
      {(photos.length > 0) ?
        (<PhotoViewer className="Photo-stack-viewer"
          width={props.width}
          height={props.height - stripeHeight}
          getImage={(offs: number): AlbumPhoto | null => {
            if (offs === -1 || offs === 1) {
              return null;
            }
            return photos[currentPhotoIdx];
          }} />
        ) : null}
      {(photos.length > 0) ?
        (<List
          ref={listRef}
          className="Photo-stack-stripe"
          itemCount={photos.length}
          width={props.width}
          height={stripeHeight}
          layout="horizontal"
          itemSize={getColumnWidth}
        >
          {renderPhoto}
        </List>) : null}
    </div>
  )
}