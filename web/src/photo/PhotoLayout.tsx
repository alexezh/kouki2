import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto, PhotoReactions } from "./AlbumPhoto";
import { selectionManager } from "../commands/SelectionManager";
import { ViewMode } from "../commands/AppState";
import smiley from "../assets/smiley.svg"
import smiley_sad from "../assets/smiley-sad.svg"
import stack from "../assets/stack.svg"
import * as CSS from "csstype";
import { ReactionsLayout } from "./ReactionsLayout";

// function getFavIcon(favorite: number): string {
//   if (favorite > 0) {
//     return "./assets/heart-full.svg";
//   } else if (favorite < 0) {
//     return "./assets/heart-broken.svg";
//   } else {
//     return "./assets/heart.svg";
//   }
// }

// function getFavIcon(reactions: PhotoReactions): string | null {
//   if (reactions.isFavorite) {
//     return smiley;
//   } else if (reactions.isRejected) {
//     return smiley_sad;
//   } else {
//     return null;
//   }
// }

function getStackIcon(hasStack: boolean): string | null {
  if (hasStack) {
    return stack;
  } else {
    return null;
  }
}

export type PhotoPropTypes = {
  className?: string;
  style?: CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void;
  photo: AlbumPhoto;
  hideFavIcon?: boolean;
  hideStackIcon?: boolean;
  padding: number;
  visibility?: CSS.Property.Visibility;

  viewMode: ViewMode;

  // if set, specify size of div
  // in which case picture is set to 100%
  width?: number;
  height?: number;
  selected: boolean;
};

const imgWithClick = { cursor: 'pointer' };

export function PhotoLayout(props: PhotoPropTypes) {
  let [selected, setSelected] = useState(props.selected);
  // bit of a hack; we are using value since it is immutable
  // but reactions object is mutable
  let [reactions, setReactions] = useState(props.photo.reactions.value);
  let [stackIcon, setStackIcon] = useState(getStackIcon(props.photo.hasStack));

  useEffect(() => {
    let idSelected = selectionManager.addOnSelected(props.photo, (x: AlbumPhoto, selected: boolean) => {
      setSelected(selected);
    })

    let idChanged = props.photo.addOnChanged((photo: AlbumPhoto) => {
      console.log("PhotoLayout - change reactions");
      setReactions(photo.reactions.value);
    });
    return () => {
      selectionManager.removeOnSelected(props.photo, idSelected);
      props.photo.removeOnChanged(idChanged);
    }
  }, [])

  const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (props.onClick) {
      props.onClick(event, props.photo);
    }
  };

  let divStyle: CSSProperties;
  let imgStyle: CSSProperties;
  let src: string;

  if (props.viewMode === ViewMode.grid || props.viewMode === ViewMode.stripe) {
    let scale = 1;
    if (props.viewMode === ViewMode.stripe) {
      scale = props.height! / props.photo.height;
    } else {
      scale = props.photo.scale;
    }

    divStyle = {
      ...props.style,
      backgroundColor: (selected) ? "var(--photo-selectedcolor)" : undefined,
      border: 'solid',
      borderColor: "var(--photo-bordercolor)",
      width: props.photo.width * scale + props.padding * 2,
      height: props.photo.height * scale + props.padding * 2,
      display: 'block',
      visibility: props.visibility,
      position: 'absolute'
    };

    imgStyle = {
      margin: 0,
      left: props.padding,
      top: props.padding,
      width: Math.round(props.photo.width * scale),
      height: Math.round(props.photo.height * scale),
      display: 'block',
      position: 'absolute',
      zIndex: 0
    }

    src = props.photo.getThumbnailUrl();
  } else {
    divStyle = {
      ...props.style,
      width: props.width,
      height: props.height,
      display: 'block',
      visibility: props.visibility,
      position: 'absolute'
    };

    let imageHeight = props.height!;
    let imageWidth = Math.round(imageHeight * props.photo.width / props.photo.height);
    if (imageWidth > props.width!) {
      imageWidth = props.width!;
      imageHeight = Math.round(imageWidth * props.photo.height / props.photo.width);
    }

    imgStyle = {
      margin: 'auto',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      height: imageHeight,
      width: imageWidth,
      display: 'block',
      position: 'absolute',
      zIndex: 0
    };

    src = props.photo.getPhotoUrl();
  }

  return (
    <div className="Photo-layout" key={props.photo.wire.hash} style={divStyle}>
      {(!props.hideStackIcon && stackIcon) ?
        (<img
          className="Photo-layout-stack-icon"
          width={20}
          height={20}
          src={stackIcon}
        />) : null}

      <img
        key={props.photo.id}
        style={props.onClick ? { ...imgStyle, ...imgWithClick } : imgStyle}
        width={props.photo.width * props.photo.scale}
        height={props.photo.height * props.photo.scale}
        src={src}
        onClick={handleClick}
      />
      <ReactionsLayout key="reactions" thumbnail={props.viewMode !== ViewMode.zoom} reactions={props.photo.reactions} />
    </div>
  );
};
