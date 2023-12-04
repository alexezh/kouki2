import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import ListItem from "@mui/material/ListItem/ListItem";
import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon/ListItemIcon";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import MenuItem from "@mui/material/MenuItem/MenuItem";
import MenuList from "@mui/material/MenuList/MenuList";
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from "react";
import Divider from "@mui/material/Divider/Divider";
import { AlbumPhoto, loadCollection, loadFolder, loadFolders } from "./PhotoStore";
import { WireFolder } from "./lib/fetchadapter";

type SetPhotoHandler = React.Dispatch<React.SetStateAction<AlbumPhoto[]>>;


function onDevice() {
  //setView(new ViewDesc(CanvasViewKind.Device));
}

function onAlbum(setPhoto: SetPhotoHandler) {
  //setView(new ViewDesc(CanvasViewKind.Album));
}

async function onCollection(setPhotos: SetPhotoHandler, name: string) {
  let photos = await loadCollection(name);
  setPhotos(photos);
}

export function collapsableList(text: string, open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>, items: any) {
  function handleClick() {
    setOpen(!open);
  }

  return [(
    <ListItemButton onClick={handleClick} key={'cat_' + text}>
      <ListItemText primary={text} />
      {open ? <ExpandLess /> : <ExpandMore />}
    </ListItemButton>),
  (<Collapse in={open} timeout="auto" unmountOnExit>
    <List component="div" disablePadding>
      {items}
    </List>
  </Collapse>)]
}

function FolderItem(props: { folder: WireFolder, setPhotos: SetPhotoHandler }) {
  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    let photos = await loadFolder(props.folder.id);
    props.setPhotos(photos);
  }

  return (
    <ListItemButton sx={{ pl: 4 }} onClick={handleClick} key={'folder_' + props.folder.id}>
      <ListItemText className="FolderItem" primary={props.folder.path} />
    </ListItemButton >);
}

function CollectionItem(props: { text: string }) {
  return (
    <ListItemButton sx={{ pl: 4 }} key={'coll_' + props.text}>
      <ListItemText primary={props.text} />
    </ListItemButton>);
}
//export function NavigationBar() {
//  return (
export function NavigationBar(props: { setPhotos: SetPhotoHandler }) {
  let [openCollections, setOpenCollections] = useState(false);
  let [openFolders, setOpenFolders] = useState(false);

  const [folders, setFolders] = useState([] as WireFolder[]);
  useEffect(() => {
    setTimeout(async () => {
      let folders = await loadFolders();
      setFolders(folders);

      if (folders.length > 0) {
        let photos = await loadFolder(folders[0].id);
        props.setPhotos(photos);
      }
    });
    // return () => {
    //   console.log('detach');
    // };
  }, []);

  return (
    <div>
      {collapsableList("Catelog", openCollections, setOpenCollections,
        ['Quick collection', 'All Photos', 'Starred', 'Dups'].map((x) => { return (<CollectionItem text={x} />) }))}
      <Divider />
      {collapsableList("Folders", openFolders, setOpenFolders,
        folders.map((x) => { return (<FolderItem folder={x} setPhotos={props.setPhotos} />) }))}
    </div>);
}
