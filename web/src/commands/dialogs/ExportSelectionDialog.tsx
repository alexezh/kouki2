import { useEffect, useState } from "react";
import { wireImportFolder, wireExportPhotos, wireGetJobStatus, wireRescanFolder, ExportJobStatusResponse } from "../../lib/photoclient";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import TextField from "@mui/material/TextField/TextField";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import Typography from "@mui/material/Typography/Typography";
import { sleep } from "../../lib/sleep";
import { triggerRefreshFolders } from "../../photo/FolderStore";
import { selectionManager } from "../SelectionManager";
import { AlbumPhoto } from "../../photo/AlbumPhoto";
import { getStandardCollectionList, triggerRefreshCollections } from "../../photo/CollectionStore";

export function ExportSelectionDialog(props: { onClose: () => void }) {
  const [path, setPath] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState(0);

  function handleClose() {
    props.onClose();
  };

  async function handleExport() {
    setProcessing(true);

    try {
      let photos = selectionManager.map((x: AlbumPhoto) => x.wire.id);

      let exportList = await getStandardCollectionList('export');
      console.log(`Export ${photos.length} photos to ${exportList.id.id}`);

      let exportResponse = await wireExportPhotos({ path: path, format: "jpeg", photos: photos, exportCollection: exportList.id.id });
      if (exportResponse.result !== 'Ok') {
        props.onClose();
        return;
      }

      while (true) {
        let jobInfo = await wireGetJobStatus<ExportJobStatusResponse>(exportResponse.jobId);
        if (jobInfo.result !== 'Processing') {
          break;
        } else {
          setProcessedFiles(jobInfo.addedFiles);
        }
        await sleep(1);
      }

      triggerRefreshCollections();
    }
    catch (e: any) {
      console.log(e.toString());
    }
    finally {
      triggerRefreshFolders();
      props.onClose();
    }
  };

  async function handleChanged(event: React.ChangeEvent) {
    // @ts-ignore
    setPath(event.target.value);
  }

  return (
    <Dialog open={true} onClose={handleClose}>
      <DialogTitle>Add Folder</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter folder name for export folder located under root export folder.
        </DialogContentText>
        {!processing ? (<TextField
          autoFocus
          margin="dense"
          id="name"
          label="Folder"
          type="text"
          fullWidth
          variant="standard"
          value={path}
          onChange={handleChanged}
        />) : (<Typography variant="body1">{'Exported: ' + processedFiles + ' files'}</Typography>)}
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleClose}>Cancel</Button>
        <Button disabled={processing} onClick={handleExport}>Export</Button>
      </DialogActions>
    </Dialog>
  );
}
