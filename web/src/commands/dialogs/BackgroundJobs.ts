import { GetJobStatusResponse, JobResponse, wireGetJobStatus } from "../../lib/photoclient";
import { sleep } from "../../lib/sleep";

let jobMap = new Map<string, boolean>();

export interface IBackgroundJob<T extends GetJobStatusResponse> {
  worker(): Promise<JobResponse>;
  onStatus(status: GetJobStatusResponse): void;
  onComplete(status: GetJobStatusResponse | null): void;
}

/**
 * execute new job if needed. If job already running, exits
 */
export function runJob<T extends GetJobStatusResponse>(
  key: string,
  job: IBackgroundJob<T>): boolean {

  let hasJob = jobMap.get(key);
  if (hasJob) {
    return false;
  }

  setTimeout(async () => {
    let jobInfo: GetJobStatusResponse | null = null;
    try {
      jobMap.set(key, true);
      console.log("start job " + key);

      let jobResponse = await job.worker();
      if (jobResponse.result !== 'Ok') {
        job.onComplete(jobResponse);
        return;
      }

      while (true) {
        jobInfo = await wireGetJobStatus<GetJobStatusResponse>(jobResponse.jobId);
        if (jobInfo.result !== 'Processing') {
          break;
        } else {
          job.onStatus(jobInfo);
        }
        await sleep(1);
      }
    }
    catch (e) {
      jobInfo = {
        result: 'Failed',
        message: 'Unknown failure'
      }
    }
    finally {
      jobMap.delete(key);
      job.onComplete(jobInfo);
    }
  });

  return true;
}