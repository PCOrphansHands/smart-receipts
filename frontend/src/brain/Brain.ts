import { HandleHealthzData } from "./data-contracts";
import { HttpClient, RequestParams, ContentType } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @name handle_healthz
   * @summary Handle Healthz
   * @request GET:/_healthz
   */
  handle_healthz = (params: RequestParams = {}) =>
    this.request<HandleHealthzData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * Gmail Status
   * @name get_gmail_status
   * @request GET:/gmail/status
   */
  get_gmail_status = (params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/gmail/status`,
      method: "GET",
      ...params,
    });

  /**
   * Start Gmail Auth
   * @name start_gmail_auth
   * @request GET:/gmail/auth/start
   */
  start_gmail_auth = (params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/gmail/auth/start`,
      method: "GET",
      ...params,
    });

  /**
   * Scan Receipt Emails
   * @name scan_receipt_emails
   * @request GET:/gmail/scan-receipts
   */
  scan_receipt_emails = (query?: { start_date?: string; end_date?: string }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/gmail/scan-receipts`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * Get Email Attachments
   * @name get_email_attachments
   * @request GET:/gmail/email/{emailId}/attachments
   */
  get_email_attachments = ({ emailId, ...query }: { emailId: string }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/gmail/email/${emailId}/attachments`,
      method: "GET",
      ...params,
    });

  /**
   * Process Gmail Receipt
   * @name process_gmail_receipt
   * @request POST:/receipt-extraction/process-gmail-receipt
   */
  process_gmail_receipt = (data: { email_id: string; attachment_filename: string }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/receipt-extraction/process-gmail-receipt`,
      method: "POST",
      body: data,
      type: "application/json",
      ...params,
    });

  /**
   * Process Email Body
   * @name process_email_body
   * @request POST:/receipt-extraction/process-email-body
   */
  process_email_body = (data: { email_id: string; email_date?: string }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/receipt-extraction/process-email-body`,
      method: "POST",
      body: data,
      type: "application/json",
      ...params,
    });

  /**
   * Dropbox Status
   * @name get_dropbox_status
   * @request GET:/dropbox/status
   */
  get_dropbox_status = (params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/dropbox/status`,
      method: "GET",
      ...params,
    });

  /**
   * Get Dropbox Auth URL
   * @name get_dropbox_auth_url
   * @request GET:/dropbox/auth-url
   */
  get_dropbox_auth_url = (params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/dropbox/auth-url`,
      method: "GET",
      ...params,
    });

  /**
   * Upload to Dropbox
   * @name upload_to_dropbox
   * @request POST:/dropbox/upload
   */
  upload_to_dropbox = (data: { file_content: string; filename: string; folder_path: string }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/dropbox/upload`,
      method: "POST",
      body: data,
      type: "application/json",
      ...params,
    });

  /**
   * Get Dropbox Folder
   * @name get_dropbox_folder
   * @request GET:/dropbox/folder
   */
  get_dropbox_folder = (params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/dropbox/folder`,
      method: "GET",
      ...params,
    });

  /**
   * Set Dropbox Folder
   * @name set_dropbox_folder
   * @request POST:/dropbox/folder
   */
  set_dropbox_folder = (data: { folder_path: string }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/dropbox/folder`,
      method: "POST",
      body: data,
      type: "application/json",
      ...params,
    });

  /**
   * List Dropbox Receipts
   * @name list_dropbox_receipts
   * @request GET:/dropbox/receipts
   */
  list_dropbox_receipts = (params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/dropbox/receipts`,
      method: "GET",
      ...params,
    });

  /**
   * Mark Receipt as Uploaded
   * @name mark_receipt_uploaded
   * @request POST:/upload-tracking/mark-uploaded
   */
  mark_receipt_uploaded = (data: { receipt_key: string; dropbox_paths: string[]; receipt_metadata?: any; source_type?: string }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/upload-tracking/mark-uploaded`,
      method: "POST",
      body: data,
      type: "application/json",
      ...params,
    });

  /**
   * Get Upload Status
   * @name get_upload_status
   * @request POST:/upload-tracking/get-status
   */
  get_upload_status = (data: { receipt_keys: string[] }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/upload-tracking/get-status`,
      method: "POST",
      body: data,
      type: "application/json",
      ...params,
    });

  /**
   * List Uploaded Receipts
   * @name list_uploaded_receipts
   * @request GET:/upload-tracking/list
   */
  list_uploaded_receipts = (query?: { include_uploaded?: boolean; include_not_uploaded?: boolean }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/upload-tracking/list`,
      method: "GET",
      query: query,
      ...params,
    });

  /**
   * Extract Receipt Data
   * @name extract_receipt_data
   * @request POST:/receipt-extraction/extract-receipt-data
   */
  extract_receipt_data = (data: { image_base64: string }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/receipt-extraction/extract-receipt-data`,
      method: "POST",
      body: data,
      type: "application/json",
      ...params,
    });

  /**
   * Process Uploaded Receipt
   * @name process_uploaded_receipt
   * @request POST:/receipt-extraction/process-uploaded-receipt
   */
  process_uploaded_receipt = (data: { file: File }, params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/receipt-extraction/process-uploaded-receipt`,
      method: "POST",
      body: data,
      type: ContentType.FormData,
      ...params,
    });

  /**
   * Detect Language
   * @name detect_language
   * @request GET:/detect-language
   */
  detect_language = (params: RequestParams = {}) =>
    this.request<any, any>({
      path: `/detect-language`,
      method: "GET",
      ...params,
    });
}
