// types/CardTypes.ts
import { z } from 'zod';
export const CardSchema = z.object({
    id: z.string().min(1, 'L’ID de la carte ne peut pas être vide.'),
    name: z.string().min(1, 'Le nom de la carte ne peut pas être vide.'),
    image: z.string().min(1, 'L’image de la carte ne peut pas être vide.'),
    exhausted: z.boolean().optional(),
});
