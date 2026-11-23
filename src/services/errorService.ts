import type { ActionError } from "astro:actions";
import { errorMessages, genericErrorMessage } from "../consts/errorCodes";

// Slovenian text for an action error. Unknown errors get the general text,
// so exception text never reaches the page.
export function messageForActionError(error: ActionError): string {
  return errorMessages[error.message] ?? genericErrorMessage;
}
