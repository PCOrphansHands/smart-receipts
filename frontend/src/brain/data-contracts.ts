export type HandleHealthzData = any;

// Gmail API Types
export interface ReceiptEmailsResponse {
  emails: Array<{
    email_id: string;
    subject: string;
    sender: string;
    date: string;
    has_attachments: boolean;
    attachment_count: number;
  }>;
  count: number;
}

export interface AttachmentsResponse {
  attachments: Array<{
    filename: string;
    mime_type: string;
    size: number;
  }>;
}

export interface ProcessReceiptResponse {
  success: boolean;
  receipt_data?: {
    vendor: string;
    date: string;
    amount: string;
    currency: string;
    usd_amount?: string;
    exchange_rate?: number;
  };
  suggested_filename?: string;
  pdf_content?: string;
  original_filename?: string;
  error?: string;
}

// Dropbox API Types
export interface DropboxStatusResponse {
  connected: boolean;
  account_name?: string;
  account_email?: string;
}

export interface UploadedReceiptResponse {
  success: boolean;
  receipt_data?: {
    vendor: string;
    date: string;
    amount: string;
    currency: string;
    usd_amount?: string;
    exchange_rate?: number;
  };
  suggested_filename?: string;
  pdf_content?: string;
  original_filename?: string;
  error?: string;
}

// Upload Tracking Types
export interface ReceiptUploadStatus {
  receipt_key: string;
  uploaded_to_dropbox: boolean;
  upload_timestamp?: string;
  dropbox_paths?: string[];
  receipt_metadata?: {
    vendor?: string;
    date?: string;
    amount?: string;
    currency?: string;
  };
  source_type?: 'gmail_attachment' | 'gmail_body' | 'upload';
  created_at?: string;
}

export interface MarkUploadedRequest {
  receipt_key: string;
  dropbox_paths: string[];
  receipt_metadata?: {
    vendor?: string;
    date?: string;
    amount?: string;
    currency?: string;
  };
  source_type?: 'gmail_attachment' | 'gmail_body' | 'upload';
}

export interface GetUploadStatusRequest {
  receipt_keys: string[];
}

export interface GetUploadStatusResponse {
  success: boolean;
  statuses: Record<string, ReceiptUploadStatus>;
}

export interface ListUploadedReceiptsResponse {
  success: boolean;
  receipts: ReceiptUploadStatus[];
  count: number;
}
