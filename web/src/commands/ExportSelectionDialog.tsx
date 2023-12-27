import { useEffect, useState } from "react";
import { wireAddFolder, wireGetJobStatus, wireRescanFolder } from "../lib/fetchadapter";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import TextField from "@mui/material/TextField/TextField";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import Typography from "@mui/material/Typography/Typography";
import { sleep } from "../lib/sleep";
import { triggerRefreshFolders } from "../photo/FolderStore";

export function ExportSelectionDialog(props: { onClose: () => void }) {
  const [value, setValue] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState(0);

  function handleClose() {
    props.onClose();
  };

  async function handleExport() {
    setProcessing(true);

    try {
      let addResponse = await wireAddFolder(value);
      if (addResponse.result !== 'Ok') {
        props.onClose();
        return;
      }

      while (true) {
        let jobInfo = await wireGetJobStatus(addResponse.jobId);
        if (jobInfo.result !== 'Processing') {
          break;
        } else {
          setProcessedFiles(jobInfo.addedFiles);
        }
        await sleep(1);
      }
    }
    finally {
      triggerRefreshFolders();
      props.onClose();
    }
  };

  async function handleChanged(event: React.ChangeEvent) {
    // @ts-ignore
    setValue(event.target.value);
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
          value={value}
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
