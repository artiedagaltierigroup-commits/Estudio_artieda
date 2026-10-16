import { z } from "zod";

export const SignaturePlacementSchema = z.object({
  pageNumber: z.coerce.number().finite().int().min(1),
  x: z.coerce.number().finite().min(0).max(1),
  y: z.coerce.number().finite().min(0).max(1),
  width: z.coerce.number().finite().min(0.01).max(1),
  height: z.coerce.number().finite().min(0.01).max(1),
}).refine((placement) => placement.x + placement.width <= 1.0001 && placement.y + placement.height <= 1.0001, {
  message: "La ubicacion de firma debe quedar dentro de la pagina",
});
