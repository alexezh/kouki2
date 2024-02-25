import { useState } from "react";
import { ImportJobStatusResponse, ProcessCollectionStatusResponse, wireProcessCollectionJob } from "../../lib/photoclient";
import DialogTitle from "@mui/material/DialogTitle/DialogTitle";
import DialogContent from "@mui/material/DialogContent/DialogContent";
import Dialog from "@mui/material/Dialog/Dialog";
import DialogContentText from "@mui/material/DialogContentText/DialogContentText";
import DialogActions from "@mui/material/DialogActions/DialogActions";
import Button from "@mui/material/Button/Button";
import Typography from "@mui/material/Typography/Typography";
import { triggerRefreshFolders } from "../../photo/FolderStore";
import { catchAllAsync } from "../../lib/error";
import { runJob, runRescanFolder } from "../BackgroundJobs";
import { DialogProps, showDialog } from "./DialogManager";
import { CollectionId, getCollectioById } from "../../photo/CollectionStore";
import { ResultResponse } from "../../lib/fetchadapter";

export async function showBuildPhashDialog(collId: CollectionId): Promise<void> {

  let coll = getCollectioById(collId);
  if (!coll) {
    return;
  }

  let contentText: string;

  switch (coll.id.kind) {
    case 'all': contentText = 'Update phash for all photos'; break;
    case 'folder': contentText = 'Update phash for folder'; break;
    default: contentText = 'Update phash for collection'; break;
  }

  //getCollectionsByKind(collId);

  let func = async (setStatusText: (val: string) => void): Promise<void> => {
    await runJob<ImportJobStatusResponse>("alt_" + collId,
      'Build PHash',
      () => wireProcessCollectionJob('phash', collId),
      (status: ResultResponse) => `Processed: {status.processedFiles} files`)

    triggerRefreshFolders();
  }

  showDialog((props: DialogProps) => {
    return (
      <ProgressDialog
        title='Build phash'
        contentText='Compute PHash for'
        statusText=""
        onClose={props.onClose}
        actionButtonText="Run"
        onAction={func} />)
  });
}


export async function showRescanFolderDialog(collId: CollectionId) {

  // job = runRescanFolder(collId);

  // showDialog((props: DialogProps) => {
  //   return (
  //     <ProgressDialog
  //       title='Rescan folder'
  //       contentText='Compute PHash for'
  //       statusText=""
  //       onClose={props.onClose}
  //       actionButtonText="Run"
  //       onAction={func} />)
  // });
}

export function showAltTextDialog(collId: CollectionId) {
  let func = async (setStatusText: (val: string) => void): Promise<void> => {
    await runJob<ImportJobStatusResponse>("alt_" + collId,
      'Generate Alternative Text',
      () => wireProcessCollectionJob('alttext', collId),
      (status: ResultResponse) => `Processed: {status.processedFiles} files`)
  }

  showDialog((props: DialogProps) => {
    return (
      <ProgressDialog
        title='Generate text descroption'
        contentText='Generate photos description using LLAMA'
        statusText=""
        onClose={props.onClose}
        actionButtonText="Run"
        onAction={func} />)
  });
}
export type ProgressDialogProps = {
  onClose: () => void,
  title: string,
  contentText: string,
  statusText: string,
  actionButtonText: string,
  onAction: (setStatus: (val: string) => void) => Promise<void>,
}

export function ProgressDialog(props: ProgressDialogProps) {
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState(props.statusText);

  function handleClose() {
    props.onClose();
  };

  async function handleAction() {
    setProcessing(true);
    await props.onAction((val: string) => setStatusText(val));
    setProcessing(false);
    handleClose();
  }

  return (
    <Dialog open={true} onClose={handleClose}>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{props.contentText}</DialogContentText>
        <Typography variant="body1">{statusText}</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={processing} onClick={handleAction}>{props.actionButtonText}</Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
