import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto } from "./PhotoStore";
import { selectionManager } from "./SelectionManager";

export type PhotoPropTypes = {
  key: string;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void;
  onSelected?: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto) => void;
  photo: AlbumPhoto;
  margin: number;
  // if set, specify size of div
  // in which case picture is set to 100%
  width?: number;
  height?: number;
  selected: boolean;
};

const imgWithClick = { cursor: 'pointer' };

export function PhotoLayout(props: PhotoPropTypes) {
  let [selected, setSelected] = useState(props.selected);

  useEffect(() => {
    let id = selectionManager.addOnSelected(props.photo, (x: AlbumPhoto, selected: boolean) => {
      setSelected(selected);
    })
    return () => {
      selectionManager.removeOnSelected(props.photo, id);
    }
  })

  const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (props.onClick) {
      props.onClick(event, props.photo);
    }
  };

  const handleSelect = (event: React.MouseEvent<HTMLImageElement>) => {
    if (props.onSelected) {
      props.onSelected(event, props.photo);
    }
  };

  let divStyle: CSSProperties = (!props.width) ? {
    width: props.photo.width * props.photo.scale,
    height: props.photo.height * props.photo.scale,
    display: 'block',
    position: 'relative'
  } : {
    width: props.width,
    height: props.height,
    display: 'block',
    position: 'relative'
  }

  let imgStyle: CSSProperties;

  if (!props.width) {
    imgStyle = {
      margin: 0,
      width: Math.round(props.photo.width * props.photo.scale),
      height: Math.round(props.photo.height * props.photo.scale),
      display: 'block',
      position: 'absolute',
      zIndex: 0
    }
  } else {
    let imageHeight = props.height!;
    let imageWidth = Math.round(imageHeight * props.photo.width / props.photo.height);
    if (imageWidth > props.width) {
      imageWidth = props.width;
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
  }

  let checkStyle: CSSProperties = {
    position: 'absolute',
    left: 5,
    top: 5,
    zIndex: 1
  }

  return (
    <div style={divStyle} className={props.className}>
      <img
        style={checkStyle}
        width={20}
        height={20}
        src={(selected) ? './assets/checkbox-check.svg' : './assets/checkbox-unchecked.svg'
        }
        onClick={handleSelect}
      />
      <img
        style={props.onClick ? { ...imgStyle, ...imgWithClick } : imgStyle}
        width={props.photo.width * props.photo.scale}
        height={props.photo.height * props.photo.scale}
        src={props.photo.src}
        onClick={handleClick}
      />
    </div>
  );
};
