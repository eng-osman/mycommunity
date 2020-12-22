import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import { standardizeMobileNumber } from './shared.util';

const PhoneNumUtil = PhoneNumberUtil.getInstance();
export function parseAndValidatePhoneNumber(ph: string, cc: string): string | null {
  const phNumber = PhoneNumUtil.parse(ph, cc);
  if (PhoneNumUtil.isValidNumber(phNumber)) {
    const formatedPhoneNum = standardizeMobileNumber(
      PhoneNumUtil.format(phNumber, PhoneNumberFormat.E164),
    );
    return formatedPhoneNum;
  } else {
    return null;
  }
}
