type Locale =
  | 'af'
  | 'ar'
  | 'ca'
  | 'zh'
  | 'zh-CN'
  | 'zh-HK'
  | 'hr'
  | 'cs'
  | 'da'
  | 'nl'
  | 'en'
  | 'fi'
  | 'fr'
  | 'de'
  | 'el'
  | 'he'
  | 'hi'
  | 'hu'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'ms'
  | 'nb'
  | 'pl'
  | 'pt-BR'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'es'
  | 'sv'
  | 'tl'
  | 'th'
  | 'tr'
  | 'vi';
export interface TwilioSendVerificationCodeRequest {
  via: 'sms' | 'call';
  country_code: number;
  phone_number: string;
  locale?: Locale;
  code_length?: 4 | 5 | 6 | 7 | 8 | 9 | 10;
  custom_code?: number;
}

export interface TwilioSendVerificationCodeResponse {
  carrier?: string;
  is_cellphone?: boolean;
  message: string;
  seconds_to_expire: number;
  uuid: string;
  success: boolean;
}

export interface TwilioCheckVerificationCodeRequest {
  country_code: number;
  phone_number: string;
  verification_code: string;
}

export interface TwilioCheckVerificationCodeResponse {
  success: boolean;
  message: string;
}

export type TwilioStatusVerificationCodeRequest =
  | { uuid: string }
  | {
      country_code: number;
      phone_number: string;
    };

export interface TwilioStatusVerificationCodeResponse {
  status: 'expired' | 'verified' | 'pending' | 'notfound';
  seconds_to_expire: number;
  success: boolean;
  message: string;
}
