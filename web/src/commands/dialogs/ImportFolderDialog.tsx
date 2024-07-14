import { useState } from "react";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import TextField from "@mui/material/TextField/TextField";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import { triggerRefreshFolders } from "../../photo/FolderStore";
import { catchAllAsync } from "../../lib/error";
import { wireImportFolder, GetJobStatusResponse, ImportJobStatusResponse } from "../../lib/photoclient";
import { runJob } from "../BackgroundJobs";
import { DialogProps, showDialog } from "./DialogManager";
import { showConfirmationDialog } from "./ConfirmationDialog";
import { createCollectionOfKind } from "../../photo/CollectionStore";
import { ResultResponse } from "../../lib/fetchadapter";

export function onImportFolder() {
  showDialog((props: DialogProps) => {
    return (
      <ImportFolderDialog onClose={props.onClose} />)
  });
}

export function ImportFolderDialog(props: { onClose: () => void }) {
  const [value, setValue] = useState("~/Pictures");
  const [statusText, setStatusText] = useState("");
  const [processing, setProcessing] = useState(false);

  function handleClose() {
    props.onClose();
  };

  async function handleAdd() {
    setProcessing(true);

    catchAllAsync(async () => {
      let importColl = await createCollectionOfKind('import');

      setStatusText("Scanning...");

      let dryJob = runJob("dry_" + value,
        'Import folder',
        async () => {
          let addResponse = await wireImportFolder({
            folder: value,
            dryRun: true,
            importCollection: importColl.id.id
          });
          return addResponse;
        });

      let dryResult = (await dryJob.task) as ImportJobStatusResponse;
      if (dryResult?.result !== 'Done') {
        setStatusText(dryResult ? dryResult.message : 'unknown error');
        setProcessing(false);
        return;
      }

      let res = await showConfirmationDialog('Import photos', `Do you want to import ${dryResult?.addedFiles} files?`);
      if (!res) {
        setStatusText("");
        setProcessing(false);
        return;
      }

      // now start background job
      let job = runJob("import_" + value,
        'Import folder',
        async () => {
          let addResponse = await wireImportFolder({
            folder: value,
            dryRun: false,
            importCollection: importColl.id.id
          });
          return addResponse;
        });

      job.addOnStatus((status: ResultResponse) => {
        let importStatus = status as ImportJobStatusResponse;
        setStatusText('Added: ' + importStatus.addedFiles + ' files')
      });
      let jobResult = await job.task;

      setProcessing(false);
      if (jobResult) {
        if (jobResult.result === "Done") {
          triggerRefreshFolders();
          props.onClose();
        } else {
          setStatusText(jobResult.message);
        }
      }
    });
  };

  function handleChanged(event: React.ChangeEvent) {
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
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label=""
          type="text"
          fullWidth
          variant="standard"
          disabled={processing}
          value={value}
          onChange={handleChanged}
        />
        <DialogContentText color="common.red">
          {statusText}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleAdd}>Add</Button>
        <Button disabled={processing} onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog >
  );
}


