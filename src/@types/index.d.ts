/// <reference types="node" />
declare module 'nexmo' {
  declare interface RequestOptions {
    // The mobile or landline phone number to verify.
    number: number;
    /*
     * The name of the company or App you are using Verify for.
     * This 18 character alphanumeric string is used in the body of Verify message.
     */
    brand: string;
    /**
     * If do not set number in international format or you are not sure if number is correctly formatted,
     *  set `country` with the two-character country code.
     */
    country?: string;
    /**
     * An 11 character alphanumeric string to specify the SenderID for SMS sent by Verify.
     * Depending on the destination of the phone number you are applying,
     * restrictions may apply. By default, `sender_id` is VERIFY.
     */
    sender_id?: string;
    /**
     * The length of the PIN. Possible values are `6` or `4` characters. The default value is `4`.
     */
    code_length?: 4 | 6;
    /**
     * The PIN validity time from generation.
     * This is an integer value between `60` and `3600` seconds. The default is `300`` seconds.
     */
    pin_expiry?: number;
  }
  declare interface CheckOptions {
    /**
     * The identifier of the Verify request to check. This is the `request_id` you received in the Verify Request response.
     */
    request_id: string;
    /*
     * The PIN given by your user.
     */
    code: any;
    /**
     * The IP Address used by your user when they entered the PIN.
     * Nexmo uses this information to identify fraud and spam patterns across our customer base.
     * This ultimately benefits all Nexmo customers.
     */
    ip_address?: string;
  }

  declare interface SearchOptions {
    /**
     * The `request_id` you received in the Verify Request Response.
     */
    request_id?: string;

    /**
     * More than one `request_id`. Each `request_id` is a new parameter in the Verify Search request.
     */
    request_ids?: string[];
  }

  declare interface ControlOptions {
    /**
     * The `request_id` you received in the Verify Request Response.
     */
    request_id: string;

    /**
     * Change the command workflow. Supported values are:
     *  - `cancel` - stop the request
     *  - `trigger_next_event` - advance the request to the next part of the process.
     *
     * Verification requests can't be cancelled within the first 30 seconds.
     * You must wait at least 30s after sending a Verify Request before cancelling.
     */
    cmd: string;
  }

  declare interface Verify {
    /**
     * Submit a Verification Request
     * @param {RequestOptions} options  Request options
     */
    request(options: RequestOptions, callback: any): void;

    /**
     * Use a check request to send the PIN you received from your user to Nexmo.
     * @param {CheckOptions} options  Request options
     */
    check(options: CheckOptions, callback: any): void;

    /**
     * To control the progress of your Verify Requests
     * @param {ControlOptions} options  Request options
     */
    control(options: ControlOptions, callback: any): void;

    /**
     * Send a Verify Search request containing the request_id's of the Verify requests to search for.
     * @param {SearchOptions} request_id  The `request_id` you received in the Verify Request Response.
     * if More than one `request_id`. Each `request_id` is a new parameter in the Verify Search request.
     */
    search(request_id: string | string[], callback: any): void;
  }
  /**
   * Create New Nexmo Client
   */
  export class Nexmo {
    verify: Verify;
    /**
     * @param {Credentials} credentials - Nexmo API credentials
     * @param {string} credentials.apiKey - the Nexmo API key
     * @param {string} credentials.apiSecret - the Nexmo API secret
     * @param {Object} options - Additional options
     * @param {boolean} options.debug - `true` to turn on debug logging
     * @param {Object} options.logger - Set a custom logger.
     * @param {string} options.appendToUserAgent - A value to append to the user agent.
     *                    The value will be prefixed with a `/`
     */
    constructor(credentials: any, options?: any);
  }
  export = Nexmo;
}
