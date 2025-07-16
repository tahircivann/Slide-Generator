
"use client";

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Image from "next/image";
import { Download, Save, Trash2, Loader2, Image as ImageIcon, BookOpen, BrainCircuit, X } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Logo } from '@/components/icons';
import { generatePresentationAction } from '@/lib/actions';
import type { Presentation, PresentationPreview } from '@/lib/types';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }),
  style: z.enum(['business', 'educational', 'creative']),
});

function PresentationViewer({ presentation }: { presentation: PresentationPreview }) {
  return (
    <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{presentation.topic}</DialogTitle>
      </DialogHeader>
      <div className="flex-grow min-h-0">
        <Carousel className="h-full w-full">
          <CarouselContent className="h-full">
            {presentation.slides.map((slide, index) => (
              <CarouselItem key={index} className="h-full flex flex-col justify-center items-center">
                <div className="w-full aspect-video relative mb-4 bg-muted rounded-lg overflow-hidden">
                  <Image src={slide.thumbnailUrl} alt={slide.title} layout="fill" objectFit="contain" />
                </div>
                <h3 className="text-lg font-semibold">{slide.title}</h3>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </DialogContent>
  );
}


export default function SlideGenerator() {
  const [isPending, startTransition] = useTransition();
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [savedPresentations, setSavedPresentations] = useState<PresentationPreview[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      style: 'business',
    },
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('slidegenius-presentations');
      if (stored) {
        setSavedPresentations(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to parse presentations from localStorage", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load saved presentations." });
    }
  }, [toast]);

  const updateLocalStorage = (presentations: PresentationPreview[]) => {
    try {
      localStorage.setItem('slidegenius-presentations', JSON.stringify(presentations));
    } catch (error) {
      console.error("Failed to save to localStorage", error);
      toast({
        variant: "destructive",
        title: "Could not save presentation",
        description: "There is not enough space in your browser's local storage.",
      });
    }
  };
  
  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      setPresentation(null);
      const result = await generatePresentationAction(values);
      if (result.success && result.data) {
        const { data } = result;
        const newPresentation: Presentation = {
          id: `pres_${Date.now()}`,
          topic: values.topic,
          style: values.style,
          createdAt: new Date().toISOString(),
          slides: [
            { id: 'slide_1', title: 'Title Slide', imageUrl: data.titleSlide.imageUrl },
            { id: 'slide_2', title: 'Introduction', imageUrl: data.introductionSlide.imageUrl },
            { id: 'slide_3', title: 'Main Content 1', imageUrl: data.contentSlide1.imageUrl },
            { id: 'slide_4', title: 'Main Content 2', imageUrl: data.contentSlide2.imageUrl },
            { id: 'slide_5', title: 'Main Content 3', imageUrl: data.contentSlide3.imageUrl },
            { id: 'slide_6', title: 'Conclusion', imageUrl: data.conclusionSlide.imageUrl },
          ],
        };
        setPresentation(newPresentation);
        form.reset({ topic: values.topic, style: values.style });
        toast({ title: "Success!", description: "Your presentation has been generated." });
      } else {
        toast({ variant: "destructive", title: "Generation Failed", description: result.error });
      }
    });
  };

  const handleTitleChange = (slideId: string, newTitle: string) => {
    if (!presentation) return;
    const updatedSlides = presentation.slides.map(slide =>
      slide.id === slideId ? { ...slide, title: newTitle } : slide
    );
    setPresentation({ ...presentation, slides: updatedSlides });
  };

  const compressImage = (dataUrl: string, quality = 0.5): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  };
  
  const handleSave = async () => {
    if (!presentation) return;

    startTransition(async () => {
      try {
        const compressedSlides = await Promise.all(
          presentation.slides.map(async (slide) => ({
            id: slide.id,
            title: slide.title,
            thumbnailUrl: await compressImage(slide.imageUrl),
          }))
        );

        const presentationPreview: PresentationPreview = {
          id: presentation.id,
          topic: presentation.topic,
          style: presentation.style,
          createdAt: presentation.createdAt,
          slides: compressedSlides,
        };
      
        const existingIndex = savedPresentations.findIndex(p => p.id === presentationPreview.id);
        let newSaved: PresentationPreview[];
        if (existingIndex > -1) {
          newSaved = [...savedPresentations];
          newSaved[existingIndex] = presentationPreview;
        } else {
          newSaved = [presentationPreview, ...savedPresentations];
        }
        setSavedPresentations(newSaved);
        updateLocalStorage(newSaved);
        toast({ title: "Presentation Saved", description: `"${presentation.topic}" has been saved.` });
      } catch (error) {
        console.error("Error saving presentation with compressed images:", error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Could not compress images for saving.",
        });
      }
    });
  };
  
  const handleDelete = (id: string) => {
    const updated = savedPresentations.filter(p => p.id !== id);
    setSavedPresentations(updated);
    updateLocalStorage(updated);
    toast({ title: "Presentation Deleted" });
    if (presentation?.id === id) {
      setPresentation(null);
      form.reset();
    }
  };

  const handleDownloadPdf = async () => {
    if (!presentation) return;
    
    startTransition(async () => {
      toast({ title: "Preparing PDF...", description: "Please wait while we generate your file." });

      try {
        const pdf = new jsPDF('landscape', 'px', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < presentation.slides.length; i++) {
          const slideData = presentation.slides[i];
          
          const response = await fetch(slideData.imageUrl);
          const blob = await response.blob();
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
          });

          const imgData = new Uint8Array(arrayBuffer);
          
          const imgProps = pdf.getImageProperties(imgData);
          const ratio = imgProps.height / imgProps.width;
          let imgHeight = pdfWidth * ratio;
          let imgWidth = pdfWidth;

          if (imgHeight > pdfHeight) {
              imgHeight = pdfHeight;
              imgWidth = pdfHeight / ratio;
          }

          const x = (pdfWidth - imgWidth) / 2;
          const y = (pdfHeight - imgHeight) / 2;

          if (i > 0) {
            pdf.addPage();
          }
          
          // Add white background
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
          
          pdf.addImage(imgData, x, y, imgWidth, imgHeight);

          // Add title
          pdf.setFontSize(12);
          pdf.setTextColor(0, 0, 0);
          pdf.text(slideData.title, x, y > 15 ? y - 5 : 10, { align: 'left' });
        }
        pdf.save(`${presentation.topic.replace(/\s+/g, '_')}_presentation.pdf`);
        toast({ title: "Download Complete!", description: "Your PDF has been saved." });
      } catch (error) {
        console.error("Failed to generate PDF", error);
        toast({ variant: "destructive", title: "PDF Export Error", description: `An error occurred while generating the PDF. Please try again.` });
      }
    });
  };

  return (
    <>
      <div id="pdf-container" className="hidden"></div>
      <div className="flex h-screen bg-background text-foreground">
        <aside className="w-1/4 max-w-sm min-w-[320px] bg-card flex flex-col border-r">
          <header className="p-4 border-b">
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-headline font-bold">SlideGenius</h1>
            </div>
            <p className="text-sm text-muted-foreground">AI Presentation Generator</p>
          </header>

          <div className="p-4 flex-grow flex flex-col gap-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presentation Topic</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Quarterly Sales Report" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presentation Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="creative">Creative</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                  Generate Presentation
                </Button>
              </form>
            </Form>
            
            <Separator />
            
            <div className="flex-grow flex flex-col min-h-0">
               <h2 className="text-lg font-headline font-semibold mb-2">Saved Presentations</h2>
              <ScrollArea className="flex-grow">
                <div className="space-y-2 pr-4">
                  {savedPresentations.length > 0 ? (
                    savedPresentations.map(p => (
                      <Dialog key={p.id}>
                        <Card className="p-3 group hover:bg-muted/50 transition-colors">
                          <div className="flex justify-between items-center">
                            <DialogTrigger asChild>
                              <div className="flex items-center gap-3 cursor-pointer">
                                {p.slides[0]?.thumbnailUrl && (
                                   <Image 
                                     src={p.slides[0].thumbnailUrl} 
                                     alt={p.topic}
                                     width={48} 
                                     height={27} 
                                     className="rounded-sm object-cover"
                                   />
                                )}
                                <div>
                                  <span className="font-semibold text-left w-full hover:underline">{p.topic}</span>
                                   <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</p>
                                </div>
                              </div>
                            </DialogTrigger>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete the presentation "{p.topic}". This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(p.id)} className={cn(buttonVariants({variant: "destructive"}))}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </Card>
                        <PresentationViewer presentation={p} />
                      </Dialog>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No saved presentations yet.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {presentation && (
            <header className="flex-shrink-0 p-4 border-b bg-card flex justify-between items-center">
              <div>
                <h2 className="text-xl font-headline font-bold text-primary">{presentation.topic}</h2>
                <p className="text-sm text-muted-foreground capitalize">{presentation.style} Style</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSave} disabled={isPending}>
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button onClick={handleDownloadPdf} disabled={isPending || !presentation}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download PDF
                </Button>
              </div>
            </header>
          )}
          <ScrollArea className="flex-grow">
            <div className="p-8">
              {isPending && !presentation && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                      <CardContent><Skeleton className="w-full h-48" /></CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {!isPending && !presentation && (
                 <Alert className="max-w-2xl mx-auto">
                   <BookOpen className="h-4 w-4" />
                   <AlertTitle className="font-headline">Welcome to SlideGenius!</AlertTitle>
                   <AlertDescription>
                     Enter a topic and select a style on the left to generate your AI-powered presentation.
                   </AlertDescription>
                 </Alert>
              )}

              {presentation && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {presentation.slides.map(slide => (
                    <Card key={slide.id} className="flex flex-col slide-card-container bg-card shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <Input
                          value={slide.title}
                          onChange={(e) => handleTitleChange(slide.id, e.target.value)}
                          className="text-lg font-semibold border-0 focus-visible:ring-1 focus-visible:ring-ring p-1 h-auto"
                        />
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted">
                          {slide.imageUrl ? (
                            <Image src={slide.imageUrl} alt={slide.title} layout="fill" objectFit="cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-12 w-12" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>
    </>
  );
}

    