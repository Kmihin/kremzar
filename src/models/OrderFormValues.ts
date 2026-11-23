// The order form as typed, to show it again after an error. The two arrays
// are the posted product rows, in the order of the form.
export interface OrderFormValues {
  name: string;
  phone: string;
  publicCode: string;
  roundProductIds: string[];
  quantities: string[];
}
