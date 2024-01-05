import Collapse from "@mui/material/Collapse/Collapse";
import List from "@mui/material/List/List";
import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from "react";
import Divider from "@mui/material/Divider/Divider";
import { AlbumPhoto, AlbumRow, FolderId, PhotoListId, PhotoListKind } from "../photo/AlbumPhoto";
import { PhotoInfo } from "./PhotoInfo";
import { PhotoFolder, addOnFoldersChanged, getFolders, loadFolders, removeOnFoldersChanged } from "../photo/FolderStore";
import { updateState } from "./AppState";
import { getPhotoListSize, getQuickCollection } from "../photo/PhotoStore";
import { Device, addOnDeviceChanged, getDevices, loadDevices, removeOnDeviceChanged } from "../photo/Device";

type SetPhotoHandler = React.Dispatch<React.SetStateAction<AlbumPhoto[]>>;

function onDevice() {
  //setView(new ViewDesc(CanvasViewKind.Device));
}

function onAlbum(setPhoto: SetPhotoHandler) {
  //setView(new ViewDesc(CanvasViewKind.Album));
}

let catalogs: { name: string, id: PhotoListId }[] =
  [
    { name: 'Quick collection', id: new PhotoListId('quick', 0) },
    { name: 'All Photos', id: new PhotoListId('all', 0) },
    { name: 'Import', id: new PhotoListId('import', 0) },
    { name: 'Export', id: new PhotoListId('export', 0) },
  ];

export function collapsableList(text: string, open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>>, items: any) {
  return [(
    <ListItemButton onClick={() => setOpen(!open)} key={'cat_' + text} >
      <ListItemText primary={text} />
      {open ? <ExpandLess /> : <ExpandMore />}
    </ListItemButton >),
  (<Collapse in={open} timeout="auto" unmountOnExit>
    <List component="div" disablePadding>
      {items}
    </List>
  </Collapse>)]
}

export function collapsablePane(
  text: string,
  open: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
  renderPane: () => JSX.Element) {

  return [(
    <ListItemButton onClick={() => setOpen(!open)} key={'cat_' + text}>
      <ListItemText primary={text} />
      {open ? <ExpandLess /> : <ExpandMore />}
    </ListItemButton>),
  (<Collapse in={open} timeout="auto" unmountOnExit>
    {renderPane()}
  </Collapse>)]
}

function FolderLayout(props: { folder: PhotoFolder }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setTimeout(async () => {
      if (props.folder.wire) {
        setCount(await getPhotoListSize(new PhotoListId('folder', props.folder.wire.id as FolderId)));
      }
    })
  });
  let [openFolders, setOpenFolders] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    //props.setPhotos(photos);
    updateState({ currentListId: new PhotoListId('folder', props.folder.wire!.id as FolderId) });
  }

  if (props.folder.children.length > 0) {
    return (
      <div>
        <ListItemButton onClick={() => setOpenFolders(!openFolders)} key={'cat_' + props.folder.path} >
          <div className="FolderItem">{props.folder.relname}</div>
          {openFolders ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton >
        <Collapse in={openFolders} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {props.folder.children.map((x) => { return (<FolderLayout folder={x} />) })}
          </List>
        </Collapse>
      </div>)
  } else {
    return (
      <ListItemButton className="FolderItem" sx={{ pl: 4 }} onClick={handleClick} key={'folder_' + props.folder.wire!.id}>
        <div className="FolderItem">
          <div>
            {props.folder.relname}
          </div>
          <div className="FolderItem-Count">
            {count}
          </div>
        </div>
      </ListItemButton>);
  }
}

function CatalogLayout(props: { text: string, id: PhotoListId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let collId = 0;
    if (props.id.kind === 'quick') {
      collId = getQuickCollection().addOnChanged(() => {
        setCount(getQuickCollection().photoCount);
      });
    } else {

      setTimeout(async () => {
        setCount(await getPhotoListSize(props.id));
      });
    }

    return () => {
      if (collId) {
        getQuickCollection().removeOnChanged(collId);
      }
    }
  });
  async function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    updateState({ currentListId: props.id });
  }

  return (
    <ListItemButton sx={{ pl: 4 }} onClick={handleClick} key={'coll_' + props.id}>
      <div className="CatalogItem">
        <div>{props.text}</div>
        <div className="CatalogItem-Count">{count}</div>
      </div>
    </ListItemButton>);
}

function DeviceLayout(props: { device: Device }) {
  return (
    <ListItemButton sx={{ pl: 4 }} key={'device_' + props.device.wire.id}>
      <div className="CatalogItem">
        <div>{props.device.name}</div>
      </div>
      <List component="div" disablePadding>
        <FolderLayout folder={props.device.archiveFolder} />
      </List>
    </ListItemButton>);
}

//export function NavigationBar() {
//  return (
export function NavigationBar() {
  let [openCollections, setOpenCollections] = useState(true);
  let [openFolders, setOpenFolders] = useState(false);
  let [openDevices, setOpenDevices] = useState(false);
  let [openInfo, setOpenInfo] = useState(true);

  const [folders, setFolders] = useState([] as PhotoFolder[]);
  const [devices, setDevices] = useState([] as Device[]);
  useEffect(() => {
    // reload folder list when folders change
    let idFolders = addOnFoldersChanged(() => {
      setFolders(getFolders());
    });

    // reload folder list when folders change
    let idDevives = addOnDeviceChanged(() => {
      setDevices(getDevices());
    });

    // initially, open "All collection"
    setFolders(getFolders());
    setDevices(getDevices());
    updateState({ currentListId: new PhotoListId('all', 0) });

    return () => {
      removeOnFoldersChanged(idFolders);
      removeOnDeviceChanged(idDevives);
    };
  }, []);

  // TODO: add by month navigation in photo-all.

  return (
    <div>
      {collapsableList("Catalogs", openCollections, setOpenCollections,
        catalogs.map((x) => { return (<CatalogLayout text={x.name} id={x.id} />) }))}
      <Divider />
      {collapsableList("Folders", openFolders, setOpenFolders,
        folders.map((x) => { return (<FolderLayout folder={x} />) }))}
      <Divider />
      {collapsableList("Devices", openDevices, setOpenDevices,
        devices.map((x) => { return (<DeviceLayout device={x} />) }))}
      <Divider />
      {collapsablePane("Photo Info", openInfo, setOpenInfo,
        () => (<PhotoInfo />))
      }
    </div>);
}
