import MenuItem from "@mui/material/MenuItem/MenuItem";
import { CommandMenu, CommandMenuProps } from "./CommandMenu";
import Divider from "@mui/material/Divider/Divider";
import { ExportSelectionDialog } from "./ExportSelectionDialog";
import { selectionManager } from "./SelectionManager";
import { AlbumPhoto } from "../photo/AlbumPhoto";
import { useState } from "react";

export function SelectMenu(props: CommandMenuProps & { photos: AlbumPhoto[] }) {
  const [openExport, setOpenExport] = useState(false);

  function handleSelectAll() {
    selectionManager.add(props.photos);
    props.onMenuClose();
  }

  function handleSelectNone() {
    selectionManager.remove(props.photos);
    props.onMenuClose();
  }

  function handleInvertSelect() {
    let select: AlbumPhoto[] = [];
    for (let x of props.photos) {
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