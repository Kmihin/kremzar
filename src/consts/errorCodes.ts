// Codes for expected errors, sent from actions to pages as the ActionError
// message, and the Slovenian text shown for each.
export const ErrorCode = {
  wrongPassword: "WRONG_PASSWORD",
  slugTaken: "SLUG_TAKEN",
  notFound: "NOT_FOUND",
  roundPriceMissing: "ROUND_PRICE_MISSING",
  ordersClosed: "ORDERS_CLOSED",
  offerChanged: "OFFER_CHANGED",
  emptyOrder: "EMPTY_ORDER",
  quantityTooHigh: "QUANTITY_TOO_HIGH",
  formRejected: "FORM_REJECTED",
  imageInvalid: "IMAGE_INVALID",
  orderStatusChange: "ORDER_STATUS_CHANGE",
  orderNotEditable: "ORDER_NOT_EDITABLE",
  orderWithoutItems: "ORDER_WITHOUT_ITEMS",
  orderStockShort: "ORDER_STOCK_SHORT",
  newsSlugTaken: "NEWS_SLUG_TAKEN",
} as const;

export const errorMessages: Record<string, string> = {
  [ErrorCode.wrongPassword]: "Geslo ni pravilno.",
  [ErrorCode.slugTaken]: "Izdelek s tem naslovom v povezavi že obstaja.",
  [ErrorCode.notFound]: "Zapisa ni več. Osvežite stran.",
  [ErrorCode.roundPriceMissing]: "Vsak izdelek v ponudbi potrebuje ceno.",
  [ErrorCode.ordersClosed]:
    "Naročila so ta trenutek zaprta, zato naročilo ni bilo oddano.",
  [ErrorCode.offerChanged]:
    "Ponudba se je medtem spremenila. Preverite naročilo in ga oddajte znova.",
  [ErrorCode.emptyOrder]: "Izberite vsaj en izdelek.",
  [ErrorCode.quantityTooHigh]:
    "Nekatere količine so večje, kot jih lahko naročite. Popravite označene vrstice.",
  [ErrorCode.formRejected]:
    "Naročila ni bilo mogoče oddati. Osvežite stran in poskusite znova.",
  [ErrorCode.imageInvalid]:
    "Fotografija mora biti WebP ali JPEG, največ 1600 px in 500 KB. Za pripravo fotografije potrebuje stran JavaScript.",
  [ErrorCode.orderStatusChange]:
    "Tega stanja ni mogoče nastaviti. Osvežite stran.",
  [ErrorCode.orderNotEditable]:
    "Količine lahko spreminjate samo pri novih naročilih.",
  [ErrorCode.orderWithoutItems]:
    "Naročilo mora imeti vsaj en izdelek. Za preklic uporabite Prekliči naročilo.",
  [ErrorCode.orderStockShort]:
    "Za nekatere izdelke ni dovolj zaloge. Njihove količine niso spremenjene, ostale so shranjene.",
  [ErrorCode.newsSlugTaken]: "Novica s tem naslovom v povezavi že obstaja.",
};

export const genericErrorMessage = "Prišlo je do napake. Poskusite znova.";
