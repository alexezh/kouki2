import MenuItem from "@mui/material/MenuItem/MenuItem";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import Divider from "@mui/material/Divider/Divider";
import { ExportSelectionDialog } from "./ExportSelectionDialog";
import { selectionManager } from "./SelectionManager";
import { AlbumPhoto } from "../photo/AlbumPhoto";
import { useState } from "react";
import { PhotoList } from "../photo/PhotoList";

export function EditMenu(props: CommandMenuProps & { photos: PhotoList | null }) {
  const [openExport, setOpenExport] = useState(false);

  function handleSelectAll() {
    if (!props.photos) {
      return;
    }
    selectionManager.add(props.photos.photos);
    props.onMenuClose();
  }

  function handleSelectNone() {
    if (!props.photos) {
      return;
    }
    selectionManager.remove(props.photos.photos);
    props.onMenuClose();
  }

  function handleInvertSelect() {
    if (!props.photos) {
      return;
    }
    let select: AlbumPhoto[] = [];
    for (let x of props.photos.photos) {
      if (!selectionManager.items.get(x.wire.hash)) {
        select.push(x);
      }
    }
    selectionManager.clear();
    selectionManager.add(select);
    props.onMenuClose();
  }

  function handleExportSelection() {
    setOpenExport(true);
    props.onMenuClose();
  }

  // async function handleAddPhone() {
  //   let device = await wireConnectDevice("Ezh14");
  //   let listResp = await wireGetSyncList({ deviceFolderId: device.archiveFolderId, files: ["hello"] });
  //   let photos = await loadPhotoList(new PhotoListId('all', 0));
  //   let blob = await wireGetFile(photos.photos[0].getPhotoUrl());
  //   let uploadResp = await wireUploadFile(blob);
  //   await wireAddFile({
  //     hash: uploadResp.hash,
  //     fileName: "hello.jpg",
  //     favorite: false,
  //     archiveFolderId: device.archiveFolderId,
  //     deviceCollectionId: device.deviceCollectionId
  //   })
  // }

  function renderDialogs() {
    return (<div>
      {
        (openExport) ? (<ExportSelectionDialog onClose={() => setOpenExport(false)} />) : null
      }
    </div>)
  }

  return (
    <CommandMenu {...props} extra={renderDialogs}>
      <MenuItem key="edit_all" onClick={handleSelectAll}>Select All</MenuItem>
      <MenuItem key="edit_none" onClick={handleSelectNone}>Select None</MenuItem>
      <MenuItem key="invert_select" onClick={handleInvertSelect}>Invert Selection</MenuItem>
      <Divider />
      <MenuItem key="export_selection" onClick={handleExportSelection}>Export Selection</MenuItem>
    </CommandMenu>
  )
}