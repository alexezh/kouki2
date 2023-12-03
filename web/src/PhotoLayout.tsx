import { CSSProperties, useEffect, useState } from "react";
import { AlbumPhoto } from "./PhotoStore";

export type PhotoPropTypes = {
  key: string;
  index: number;
  onClick?: (event: React.MouseEvent<HTMLImageElement>, photo: AlbumPhoto, index: number) => void;
  photo: AlbumPhoto;
  margin: number;
  selected: boolean;
};

const imgWithClick = { cursor: 'pointer' };

export function PhotoLayout(props: PhotoPropTypes) {
  let [selected, setSelected] = useState(props.selected);

  useEffect(() => {
    let id = props.photo.addOnSelected((x) => setSelected(x.selected))
    return () => {
      props.photo.removeOnSelected(id);
    }
  })

  const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (props.onClick) {
      props.onClick(event, props.photo, props.index);
    }
  };

  const handleSelect = (event: React.MouseEvent<HTMLImageElement>) => {
    // change selected on photo which will trigger selected event
    props.photo.selected = !props.photo.selected;
  };

  let divStyle: CSSProperties = {
    width: props.photo.width * props.photo.scale,
    height: props.photo.height * props.photo.scale,
    display: 'block',
    position: 'relative'
  }

  const imgStyle: CSSProperties = {
    margin: props.margin,
    display: 'block',
    position: 'absolute',
    zIndex: 0
  };

  let checkStyle: CSSProperties = {
    position: 'absolute',
    left: 5,
    top: 5,
    zIndex: 1
  }

  return (
    <div style={divStyle}>
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
