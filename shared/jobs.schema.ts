import type { JobStatus } from "./job-status";

export interface JobFinalReview {
  essentialFunctions: string[];   // List of function texts
  reviewers: string[];            // List of reviewer names
  jobDetails: {
    id: number;
    jobTitle: string;
    jobCode: string;
    jobFamily: string;
    status: JobStatus;
    lastEditedBy: string;
    lastUpdated: string;          // Use Date if parsing
    jobSummary: string;
  };
}
