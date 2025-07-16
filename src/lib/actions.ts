'use server';

import { generatePresentationImages } from '@/ai/flows/generate-presentation-images';
import { z } from 'zod';

const formSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters long.'),
  style: z.enum(['business', 'educational', 'creative']),
});

export async function generatePresentationAction(values: z.infer<typeof formSchema>) {
  try {
    const validatedValues = formSchema.parse(values);
    const result = await generatePresentationImages(validatedValues);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(', ') };
    }
    return { success: false, error: 'Failed to generate presentation. Please try again.' };
  }
}
