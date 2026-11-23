import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { ErrorCode } from "../consts/errorCodes";
import { publicCodePattern } from "../consts/publicCode";
import { SessionKey } from "../consts/session";
import { OrderStatus } from "../consts/statuses";
import { createProduct, saveProduct } from "../services/adminProductService";
import {
  closeRoundById,
  createRound,
  openRoundById,
  saveRoundForm,
} from "../services/adminRoundService";
import {
  addGalleryPhoto,
  removeGalleryPhoto,
  saveGalleryPhoto,
} from "../services/adminGalleryService";
import { createNews, deleteNews, saveNews } from "../services/adminNewsService";
import {
  changeOrderStatus,
  saveOrderQuantities,
  setOrderPaid,
} from "../services/adminOrderService";
import { isCorrectPassword } from "../services/authService";
import { placeOrder } from "../services/orderService";

// All mutations. Everything under `admin` is guarded by src/middleware.ts:
// only a logged-in admin can call it. submitOrder and login are public.
// Validation messages are Slovenian.

const tooLong = "Besedilo je predolgo.";
const priceFormat = /^\d{1,4}([.,]\d{1,2})?$/;
const priceMessage = "Vpišite ceno, na primer 2,50.";

function requiredText(message: string, max: number) {
  return z.string({ error: message }).trim().min(1, message).max(max, tooLong);
}

// Blank form fields arrive as null; they become "".
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, tooLong)
    .nullable()
    .transform((value) => value ?? "");
}

const id = z.coerce.number().int().positive();

// The photo fields of a form with an ImageField. A file input left empty
// posts an empty file; that counts as no photo.
const imageForm = {
  image: z
    .instanceof(File)
    .nullable()
    .transform((file) => (file === null || file.size === 0 ? null : file)),
  imageWidth: z.coerce.number().int().nullable(),
  imageHeight: z.coerce.number().int().nullable(),
  removeImage: z.coerce.boolean(),
};

const productForm = z.object({
  name: requiredText("Vpišite ime izdelka.", 80),
  slug: optionalText(80).refine(
    (value) => /^[a-z0-9-]*$/.test(value),
    "Samo male črke brez šumnikov, številke in vezaji.",
  ),
  description: optionalText(2000),
  ingredients: optionalText(1000),
  allergens: optionalText(500),
  unit: requiredText("Vpišite enoto, na primer 1 l ali 500 g.", 30),
  price: z
    .string({ error: priceMessage })
    .trim()
    .regex(priceFormat, priceMessage),
  sortOrder: z
    .string({ error: "Vpišite vrstni red." })
    .trim()
    .regex(/^\d{1,3}$/, "Vrstni red je celo število od 0 do 999."),
  isActive: z.coerce.boolean(),
  ...imageForm,
});

const nameMessage = "Vpišite ime in priimek.";
const phoneMessage = "Vpišite telefonsko številko, na primer 041 123 456.";
const quantityMessage = "Količina mora biti celo število.";

// The order form (plan section 7). Quantity limits and stock are checked in
// orderService against the server's copy of the offer. A blank quantity is 0.
const orderForm = z.object({
  name: z
    .string({ error: nameMessage })
    .trim()
    .min(2, nameMessage)
    .max(80, tooLong),
  phone: z
    .string()
    .trim()
    .max(20, phoneMessage)
    .regex(/^[0-9 +/()-]*$/, phoneMessage)
    .nullable()
    .transform((value) => value ?? ""),
  website: z
    .string()
    .nullable()
    .transform((value) => value ?? ""),
  publicCode: z.string().regex(publicCodePattern),
  roundProductId: z.array(id),
  quantity: z.array(
    z
      .string()
      .trim()
      .regex(/^\d{0,2}$/, quantityMessage)
      .transform((value) => (value === "" ? 0 : Number(value))),
  ),
});

const newsForm = z.object({
  title: requiredText("Vpišite naslov novice.", 120),
  slug: optionalText(120).refine(
    (value) => /^[a-z0-9-]*$/.test(value),
    "Samo male črke brez šumnikov, številke in vezaji.",
  ),
  body: requiredText("Vpišite besedilo novice.", 5000),
  isPublished: z.coerce.boolean(),
  ...imageForm,
});

const galleryFields = {
  caption: requiredText("Vpišite opis fotografije.", 200),
  sortOrder: z
    .string({ error: "Vpišite vrstni red." })
    .trim()
    .regex(/^\d{1,3}$/, "Vrstni red je celo število od 0 do 999.")
    .transform(Number),
};

export const server = {
  submitOrder: defineAction({
    accept: "form",
    input: orderForm,
    handler: async (input) => {
      const errorCode = await placeOrder(input);
      if (errorCode !== null) {
        throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
      }
      return { publicCode: input.publicCode };
    },
  }),

  login: defineAction({
    accept: "form",
    input: z.object({
      password: z.string({ error: "Vpišite geslo." }),
    }),
    handler: async (input, context) => {
      if (!(await isCorrectPassword(input.password))) {
        throw new ActionError({
          code: "UNAUTHORIZED",
          message: ErrorCode.wrongPassword,
        });
      }
      await context.session?.regenerate();
      context.session?.set(SessionKey.isAdmin, true);
    },
  }),

  admin: {
    logout: defineAction({
      accept: "form",
      handler: async (_input, context) => {
        context.session?.destroy();
      },
    }),

    createProduct: defineAction({
      accept: "form",
      input: productForm,
      handler: async (input) => {
        // The posted form carries both the product and the photo fields.
        const errorCode = await createProduct(input, input);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    saveProduct: defineAction({
      accept: "form",
      input: productForm.extend({ productId: id }),
      handler: async (input) => {
        // The posted form carries both the product and the photo fields.
        const errorCode = await saveProduct(input.productId, input, input);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    createRound: defineAction({
      accept: "form",
      input: z.object({
        title: requiredText("Vpišite naslov kroga.", 80),
        deliveryInfo: optionalText(500),
        copyPrevious: z.coerce.boolean(),
      }),
      handler: async (input) => {
        const roundId = await createRound(
          input.title,
          input.deliveryInfo,
          input.copyPrevious,
        );
        return { roundId };
      },
    }),

    saveRound: defineAction({
      accept: "form",
      input: z.object({
        roundId: id,
        title: requiredText("Vpišite naslov kroga.", 80),
        deliveryInfo: optionalText(500),
        productId: z.array(id),
        includedProductIds: z.array(id),
        price: z.array(
          z
            .string()
            .trim()
            .refine(
              (value) => value === "" || priceFormat.test(value),
              priceMessage,
            ),
        ),
        stockLimit: z.array(
          z
            .string()
            .trim()
            .regex(/^\d{0,4}$/, "Omejitev je celo število ali prazno polje."),
        ),
      }),
      handler: async (input) => {
        const errorCode = await saveRoundForm(input);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    openRound: defineAction({
      accept: "form",
      input: z.object({ roundId: id }),
      handler: async (input) => {
        const errorCode = await openRoundById(input.roundId);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    closeRound: defineAction({
      accept: "form",
      input: z.object({ roundId: id }),
      handler: async (input) => {
        const errorCode = await closeRoundById(input.roundId);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    createNews: defineAction({
      accept: "form",
      input: newsForm,
      handler: async (input) => {
        // The posted form carries both the post and the photo fields.
        const errorCode = await createNews(input, input);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    saveNews: defineAction({
      accept: "form",
      input: newsForm.extend({ newsId: id }),
      handler: async (input) => {
        // The posted form carries both the post and the photo fields.
        const errorCode = await saveNews(input.newsId, input, input);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    deleteNews: defineAction({
      accept: "form",
      input: z.object({ newsId: id }),
      handler: async (input) => {
        const errorCode = await deleteNews(input.newsId);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    addGalleryPhoto: defineAction({
      accept: "form",
      input: z.object({ ...galleryFields, ...imageForm }),
      handler: async (input) => {
        const errorCode = await addGalleryPhoto(
          input.caption,
          input.sortOrder,
          input,
        );
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    saveGalleryPhoto: defineAction({
      accept: "form",
      input: z.object({ photoId: id, ...galleryFields }),
      handler: async (input) => {
        const errorCode = await saveGalleryPhoto(
          input.photoId,
          input.caption,
          input.sortOrder,
        );
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    deleteGalleryPhoto: defineAction({
      accept: "form",
      input: z.object({ photoId: id }),
      handler: async (input) => {
        const errorCode = await removeGalleryPhoto(input.photoId);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    setOrderStatus: defineAction({
      accept: "form",
      input: z.object({
        orderId: id,
        status: z.enum([
          OrderStatus.new,
          OrderStatus.delivered,
          OrderStatus.cancelled,
        ]),
      }),
      handler: async (input) => {
        const errorCode = await changeOrderStatus(input.orderId, input.status);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    setOrderPaid: defineAction({
      accept: "form",
      input: z.object({
        orderId: id,
        isPaid: z.enum(["0", "1"]).transform((value) => value === "1"),
      }),
      handler: async (input) => {
        const errorCode = await setOrderPaid(input.orderId, input.isPaid);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),

    saveOrderItems: defineAction({
      accept: "form",
      input: z.object({
        orderId: id,
        itemId: z.array(id),
        quantity: z.array(
          z
            .string()
            .trim()
            .regex(/^\d{1,2}$/, "Količina je celo število od 0 do 99.")
            .transform(Number),
        ),
      }),
      handler: async (input) => {
        const errorCode = await saveOrderQuantities(input);
        if (errorCode !== null) {
          throw new ActionError({ code: "BAD_REQUEST", message: errorCode });
        }
      },
    }),
  },
};
