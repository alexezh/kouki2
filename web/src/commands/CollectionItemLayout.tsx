import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import { updateState } from "./AppState";
import { useEffect, useMemo, useState } from "react";
import { PhotoListId } from "../photo/AlbumPhoto";
import { loadPhotoList } from "../photo/LoadPhotoList";
import { PhotoList } from "../photo/PhotoList";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";

// catelog is either collection, or list of collections (like folder)
export function CollectionItemLayout(props: { text: string, id: PhotoListId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let collId = 0;
    let list: PhotoList | null;

    // to avoid race condition, keep track if it was already unmounted
    list = loadPhotoList(props.id);
    setCount(list.photoCount);
    if (collId !== -1) {
      collId = list.addOnChanged(() => {
        setCount(list!.photoCount);
      });
    }

    return () => {
      if (collId > 0) {
        list!.removeOnChanged(collId);
      }
      collId = -1;
    }
  }, [props.id.id]);

  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    updateState({ navListId: props.id });
  }

  return (
    <ListItemButton sx={{ pl: 4 }} onClick={handleClick} key={'coll_' + props.id}>
      <div className="CatalogItem">
        <div>{props.text}</div>
        <div className="CatalogItem-Count">{count}</div>
      </div>
    </ListItemButton>);
}

export function CollectionListLayout(props: { text: string, lists: PhotoListId[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <ListItemButton onClick={() => setOpen(!open)} >
        <div className="FolderItem">{props.text}</div>
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton >
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {props.lists.map((x) => { return (<CollectionItemLayout text="ddd" id={x} />) })}
        </List>
      </Collapse>
    </div>
  );
}
