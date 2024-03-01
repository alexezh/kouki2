import { ResultResponse } from "../lib/fetchadapter";
import { GetJobStatusResponse, ProcessCollectionJobRequest, ProcessCollectionStatusResponse, StartJobResponse, wireGetJobStatus, wireProcessCollectionJob } from "../lib/photoclient";
import { sleep } from "../lib/sleep";
import { SimpleEventSource } from "../lib/synceventsource";
import { PhotoListId } from "../photo/AlbumPhoto";
import { CollectionId } from "../photo/CollectionStore";

let jobColl: BackgroundJob[] = [];

export type JobStatus = {
  text: string;
  response: GetJobStatusResponse;
}

/**
 * jobs run in background and we do not want to block UI
 * an application can wait for job to complete; or it can sign for status notifications
 * this way we can show progress UI
 */
export interface IBackgroundJob {
  readonly description: string;
  readonly task: Promise<ResultResponse>;
  addOnStatus(func: (status: JobStatus) => void): number;
  removeOnStatus(id: number): void;
}

export class BackgroundJob implements IBackgroundJob {
  readonly task: Promise<ResultResponse>;
  public readonly description: string;
  private readonly _onStatus: SimpleEventSource<JobStatus> = new SimpleEventSource();
  private readonly makeStatusText: (response: GetJobStatusResponse) => string;

  public constructor(
    descrition: string,
    worker: () => Promise<StartJobResponse>,
    makeStatusText: (response: GetJobStatusResponse) => string) {

    this.description = descrition;
    this.makeStatusText = makeStatusText;
    this.task = new Promise<ResultResponse>((resolve) => {
      setTimeout(async () => {
        let jobStatusResponse: GetJobStatusResponse | null = null;
        try {
          let startJobResponse = await worker();
          if (startJobResponse.result !== 'Ok') {
            resolve(startJobResponse!);
            return;
          }

          while (true) {
            jobStatusResponse = await wireGetJobStatus<GetJobStatusResponse>(startJobResponse.jobId);
            if (jobStatusResponse.result !== 'Processing') {
              break;
            } else {
              this.invokeOnStatus(jobStatusResponse);
            }
            await sleep(1);
          }
          resolve(jobStatusResponse!);
        }
        catch (e) {
          resolve({
            result: 'Failed',
            message: 'Unknown failure'
          });
        }
        finally {
          let idx = jobColl.findIndex((job: BackgroundJob) => job === this);
          if (idx !== -1) {
            jobColl.splice(idx, 1);
          }
        }
      });
    });
  }

  addOnStatus(func: (status: JobStatus) => void): number {
    return this._onStatus.add(func);
  }

  removeOnStatus(id: number): void {
    this._onStatus.remove(id);
  }

  private invokeOnStatus(res: GetJobStatusResponse) {
    this._onStatus.invoke({ response: res, text: this.makeStatusText(res) });
  }
}

/**
 * execute new job if needed. If job already running, exits
 */
export function runJob<T extends GetJobStatusResponse>(
  key: string,
  descrition: string,
  worker: () => Promise<StartJobResponse>,
  makeStatusText: (response: GetJobStatusResponse) => string): IBackgroundJob {

  let job = new BackgroundJob(descrition, worker, makeStatusText);
  jobColl.push(job);

  return job;
}


export function runRescanFolder(listId: PhotoListId): IBackgroundJob {
  return runJob(
    'rescan' + listId.kind,
    'Rescan Folder',
    () => wireProcessCollectionJob('rescan', listId.kind, listId.id),
    (response: GetJobStatusResponse) => `Processed ${(response as ProcessCollectionStatusResponse).processedFiles} files`
  );
  //    onStatus: (status: PHashJobStatusResponse) => setStatusText(`Processed: {status.processedFiles} files`),
};

