import { useEffect, useMemo, useState } from "react";
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
import { catchAll, catchAllAsync } from "../../lib/error";
import { wireImportFolder, wireGetJobStatus, wireRescanFolder, wireBuildPHash, JobResponse, GetJobStatusResponse, ImportJobStatusResponse } from "../../lib/photoclient";
import { PhotoListId } from "../../photo/AlbumPhoto";
import { getStandardCollection } from "../../photo/CollectionStore";
import { runJob } from "./BackgroundJobs";

export function ImportFolderDialog(props: { onClose: () => void }) {
  const [value, setValue] = useState("~/Pictures");
  const [statusText, setStatusText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState(0);

  function handleClose() {
    props.onClose();
  };

  async function handleAdd() {
    setProcessing(true);

    catchAllAsync(async () => {
      runJob("import_" + value,
        {
          worker: async () => {
            let importList = await getStandardCollection('import');

            let addResponse = await wireImportFolder({ folder: value, importCollection: importList.id.id });
            return addResponse;
          },
          onStatus: () => (status: GetJobStatusResponse) => {
            let importStatus = status as ImportJobStatusResponse;
            setProcessedFiles(importStatus.addedFiles)
          },
          onComplete: (status: GetJobStatusResponse) => {
            if (status.result === "Ok") {
              triggerRefreshFolders();
              props.onClose();
            } else {
              setProcessing(false);
              setStatusText(status.message);
            }
          }
        });
    });
  };

  async function handleChanged(event: React.ChangeEvent) {
    // @ts-ignore
    setValue(event.target.value);
  }

  return (
    <Dialog open={true}
      onClose={handleClose}
      fullWidth={true}>
      <DialogTitle>Import Folder</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Enter folder path to import.
        </DialogContentText>
        {!processing ? (<TextField
          autoFocus
          margin="dense"
          id="name"
          label=""
          type="text"
          fullWidth
          variant="standard"
          value={value}
          onChange={handleChanged}
        />) : (<Typography variant="body1">{'Added: ' + processedFiles + ' files'}</Typography>)}
        <DialogContentText color="common.red">
          {statusText}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleClose}>Cancel</Button>
        <Button disabled={processing} onClick={handleAdd}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}


