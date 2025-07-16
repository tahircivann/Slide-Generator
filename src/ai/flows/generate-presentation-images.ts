'use server';

/**
 * @fileOverview A presentation image generator AI agent.
 *
 * - generatePresentationImages - A function that generates six presentation images based on a topic.
 * - GeneratePresentationImagesInput - The input type for the generatePresentationImages function.
 * - GeneratePresentationImagesOutput - The return type for the generatePresentationImages function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePresentationImagesInputSchema = z.object({
  topic: z.string().describe('The topic of the presentation.'),
  style: z.enum(['business', 'educational', 'creative']).describe('The style of the presentation.'),
});
export type GeneratePresentationImagesInput = z.infer<typeof GeneratePresentationImagesInputSchema>;

const GeneratePresentationImagesOutputSchema = z.object({
  titleSlide: z.object({
    imageUrl: z.string().describe('URL of the image for the title slide.'),
  }),
  introductionSlide: z.object({
    imageUrl: z.string().describe('URL of the image for the introduction slide.'),
  }),
  contentSlide1: z.object({
    imageUrl: z.string().describe('URL of the image for the first content slide.'),
  }),
  contentSlide2: z.object({
    imageUrl: z.string().describe('URL of the image for the second content slide.'),
  }),
  contentSlide3: z.object({
    imageUrl: z.string().describe('URL of the image for the third content slide.'),
  }),
  conclusionSlide: z.object({
    imageUrl: z.string().describe('URL of the image for the conclusion slide.'),
  }),
});
export type GeneratePresentationImagesOutput = z.infer<typeof GeneratePresentationImagesOutputSchema>;

export async function generatePresentationImages(
  input: GeneratePresentationImagesInput
): Promise<GeneratePresentationImagesOutput> {
  return generatePresentationImagesFlow(input);
}

const presentationImagePrompt = ai.definePrompt({
  name: 'presentationImagePrompt',
  input: {
    schema: z.object({
      topic: z.string(),
      slideType: z.string(),
      style: z.string(),
    }),
  },
  output: {
    schema: z.object({
      imageUrl: z.string().describe('The generated image URL.'),
    }),
  },
  prompt: `Generate an image for a presentation about {{topic}}. This image is for the {{slideType}} slide. The presentation style is {{style}}. The image should be relevant to the slide type and presentation topic.`,
});

const generatePresentationImagesFlow = ai.defineFlow(
  {
    name: 'generatePresentationImagesFlow',
    inputSchema: GeneratePresentationImagesInputSchema,
    outputSchema: GeneratePresentationImagesOutputSchema,
  },
  async input => {
    async function generateImage(slideType: string): Promise<string> {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `Generate an image for a presentation about ${input.topic}. This image is for the ${slideType} slide. The presentation style is ${input.style}. The image should be relevant to the slide type and presentation topic.`, // Directly constructing the prompt to avoid Handlebars issues.
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media || !media.url) {
        throw new Error(`Failed to generate image for ${slideType} slide`);
      }
      return media.url;
    }

    const [titleSlideImageUrl, introductionSlideImageUrl, contentSlide1ImageUrl, contentSlide2ImageUrl, contentSlide3ImageUrl, conclusionSlideImageUrl] = await Promise.all([
      generateImage('title'),
      generateImage('introduction'),
      generateImage('content 1'),
      generateImage('content 2'),
      generateImage('content 3'),
      generateImage('conclusion'),
    ]);

    return {
      titleSlide: {imageUrl: titleSlideImageUrl},
      introductionSlide: {imageUrl: introductionSlideImageUrl},
      contentSlide1: {imageUrl: contentSlide1ImageUrl},
      contentSlide2: {imageUrl: contentSlide2ImageUrl},
      contentSlide3: {imageUrl: contentSlide3ImageUrl},
      conclusionSlide: {imageUrl: conclusionSlideImageUrl},
    };
  }
);

