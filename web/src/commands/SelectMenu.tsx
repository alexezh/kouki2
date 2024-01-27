import MenuItem from "@mui/material/MenuItem/MenuItem";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import Divider from "@mui/material/Divider/Divider";
import { ExportSelectionDialog } from "./ExportSelectionDialog";
import { selectionManager } from "./SelectionManager";
import { AlbumPhoto } from "../photo/AlbumPhoto";
import { useState } from "react";
import { PhotoList } from "../photo/PhotoList";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import Typography from "@mui/material/Typography/Typography";
import { MyMenuItem } from "./MyMenuItem";
import { Command, invokeCommand } from "./Commands";
import { getAppState } from "./AppState";

export function EditMenu(props: CommandMenuProps) {
  const [openExport, setOpenExport] = useState(false);

  function handleSelectAll() {
    selectionManager.add(getAppState().workList.asArray());
    props.onMenuClose();
  }

  function handleSelectNone() {
    selectionManager.clear();
    props.onMenuClose();
  }

  function handleInvertSelect() {
    let select: AlbumPhoto[] = [];
    for (let x of getAppState().workList.asArray()) {
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
      <MenuItem key="edit_all" onClick={handleSelectAll}>
        <ListItemText>Select All</ListItemText>
        <Typography variant="body2" color="text.secondary">A</Typography>
      </MenuItem>
      <MenuItem key="edit_none" onClick={handleSelectNone}>Select None</MenuItem>
      <MenuItem key="invert_select" onClick={handleInvertSelect}>Invert Selection</MenuItem>
      <Divider />
      <MyMenuItem key="mark_fav" command={Command.MarkFavorite} text="Mark Favorite" shortcut="A" />
      <MyMenuItem key="mark_rejected" command={Command.MarkRejected} text="Mark Rejected" shortcut="P" />
      <MyMenuItem key="add_stack" command={Command.AddStack} text="Add to Stack" shortcut="K" />
      <MyMenuItem key="remove_stack" command={Command.RemoveStack} text="Remove from Stack" shortcut="K" />
      <MenuItem key="export_selection" onClick={handleExportSelection}>Export</MenuItem>
    </CommandMenu >
  )
}