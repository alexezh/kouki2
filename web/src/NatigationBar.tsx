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
import { AlbumPhoto, addOnFoldersChanged, loadCollection, loadFolder, loadFolders, removeOnFoldersChanged } from "./PhotoStore";
import { WireFolder } from "./lib/fetchadapter";
import { Typography } from "@mui/material";

type SetPhotoHandler = React.Dispatch<React.SetStateAction<AlbumPhoto[]>>;


function onDevice() {
  //setView(new ViewDesc(CanvasViewKind.Device));
}

function onAlbum(setPhoto: SetPhotoHandler) {
  //setView(new ViewDesc(CanvasViewKind.Album));
}

let catalogs: { name: string, id: string }[] =
  [
    { name: 'Quick collection', id: 'quick' },
    { name: 'All Photos', id: 'all' },
    { name: 'Starred', id: 'starred' },
    { name: 'Dups', id: 'dups' },
  ];

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
    <ListItemButton className="FolderItem" sx={{ pl: 4 }} onClick={handleClick} key={'folder_' + props.folder.id}>
      <Typography noWrap>{props.folder.path}</Typography>
    </ListItemButton>);
}

function CollectionItem(props: { text: string, id: string, setPhotos: SetPhotoHandler }) {
  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    let photos = await loadCollection(props.id);
    props.setPhotos(photos);
  }

  return (
    <ListItemButton sx={{ pl: 4 }} onClick={handleClick} key={'coll_' + props.id}>
      <Typography noWrap>{props.text}</Typography>
    </ListItemButton>);
}
//export function NavigationBar() {
//  return (
export function NavigationBar(props: { setPhotos: SetPhotoHandler }) {
  let [openCollections, setOpenCollections] = useState(false);
  let [openFolders, setOpenFolders] = useState(false);

  const [folders, setFolders] = useState([] as WireFolder[]);
  useEffect(() => {
    let id = addOnFoldersChanged(async () => {
      let folders = await loadFolders();
      setFolders(folders);
    });

    setTimeout(async () => {
      let folders = await loadFolders();
      setFolders(folders);

      if (folders.length > 0) {
        let photos = await loadFolder(folders[0].id);
        props.setPhotos(photos);
      }
    });
    return () => {
      removeOnFoldersChanged(id);
    };
  }, []);

  return (
    <div>
      {collapsableList("Catalogs", openCollections, setOpenCollections,
        catalogs.map((x) => { return (<CollectionItem text={x.name} id={x.id} setPhotos={props.setPhotos} />) }))}
      <Divider />
      {collapsableList("Folders", openFolders, setOpenFolders,
        folders.map((x) => { return (<FolderItem folder={x} setPhotos={props.setPhotos} />) }))}
    </div>);
}
