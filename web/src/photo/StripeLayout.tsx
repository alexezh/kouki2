import { CSSProperties, useEffect, useRef, useState } from "react";
import { AlbumPhoto, PhotoId } from "./AlbumPhoto"
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import { PhotoLayout } from "./PhotoLayout";
import { PhotoRowLayout } from "./RowLayout";
import { ViewMode, getAppState } from "../commands/AppState";
import { selectionManager } from "../commands/SelectionManager";
import { getCssIntVar } from "../lib/htmlutils";
import { getPhotoById } from "./PhotoStore";
import { PhotoViewer } from "./PhotoViewer";
import { PhotoListPos } from "./PhotoList";

export type StripeLayoutProps = {
  width: number;
  height: number;
  padding: number;
  hideStackIcon?: boolean;
}

export function StripeLayout(props: StripeLayoutProps): JSX.Element {
  let [version, setVersion] = useState(0);
  const listRef = useRef(null);

  console.log("StripeLayout: render");

  useEffect(() => {
    console.log("StripeLayout: useEffect:");

    // add listener to selection manager to track current
    let selectId = selectionManager.addOnSelectionChanged(() => {

      console.log('StripeLayout: selection changed');

      if (listRef.current) {
        if (selectionManager.lastSelectedPhoto) {
          let idx = getAppState().workList.findPhotoPos(selectionManager.lastSelectedPhoto);
          console.log("StripeLayout: scrollSelect to " + idx);
          if (idx !== -1) {
            // @ts-ignore
            listRef.current.scrollToItem(idx);
            setVersion(getAppState().version)
          }
        }
      }
    });

    let collId = getAppState().workList.addOnListChanged(() => {
      setVersion(getAppState().version);
    });

    return () => {
      getAppState().workList.removeOnListChanged(collId);
      selectionManager.removeOnSelectionChanged(selectId);
    }
  });

  let stripeHeight = getCssIntVar("--photostripe-height");
  let photoHeight = stripeHeight - 2 * props.padding;

  function getColumnWidth(idx: number): number {
    let photo = getAppState().workList.getItem(idx as PhotoListPos);
    return photo?.width * (photoHeight / photo.height) + props.padding * 2;
  }

  function handleClick(photoIdx: number) {
    selectionManager.reset([getAppState().workList.getItem(photoIdx as PhotoListPos)]);
  }

  function renderStripePhoto(listProps: ListChildComponentProps): JSX.Element | null {
    let photo = getAppState().workList.getItem(listProps.index as PhotoListPos);
    if (!photo) {
      console.log("renderPhoto: cannot find id");
      return null;
    }

    return (
      <PhotoLayout
        key={photo.wire.hash}
        style={listProps.style}
        photo={photo}
        hideStackIcon={props.hideStackIcon}
        viewMode={ViewMode.stripe}
        height={photoHeight}
        onClick={() => handleClick(listProps.index!)}
        selected={selectionManager.isSelected(photo)}
        padding={props.padding} />
    )
  }

  let stackStyle: CSSProperties = {
    width: props.width,
    height: props.height
  }

  let workList = getAppState().workList;
  return (
    <div className="Photo-stack" style={stackStyle}>
      {(workList.photoCount > 0) ?
        (<PhotoViewer className="Photo-stack-viewer"
          width={props.width}
          height={props.height - stripeHeight}
          photos={getAppState().workList} />
        ) : null}
      {(workList.photoCount > 0) ?
        (<List
          ref={listRef}
          className="Photo-stack-stripe"
          itemCount={getAppState().workList.photoCount}
          width={props.width}
          height={stripeHeight}
          layout="horizontal"
          itemSize={getColumnWidth}
        >
          {renderStripePhoto}
        </List>) : null}
    </div>
  )
}