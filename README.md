# SlideGenius

Generate stunning presentations in seconds with AI.

---

## Overview

**SlideGenius** is a web application that leverages Google Gemini AI to generate presentation-ready images and assemble them into a six-slide presentation. Users simply enter a topic and select a style (Business, Educational, or Creative), and the app generates images, arranges them into slides, allows for slide title editing, previews the presentation, and exports it as a PDF. Presentations are stored locally in the browser for later access and editing.

---

## Features

- **AI Image Generation:** Generates 6 images tailored to your topic and style using Gemini AI.
- **Automated Slide Layout:** Arranges images into Title, Introduction, 3 Main Content, and Conclusion slides.
- **Presentation Preview:** Preview the full presentation before export.
- **PDF Export:** Export the presentation as a PDF file.
- **Local Storage:** Presentations are saved in your browser for later access and editing.
- **Slide Title Editing:** Customize slide titles for each slide.
- **Style Selection:** Choose from Business, Educational, or Creative styles.

---

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Radix UI, Lucide Icons
- **AI Integration:** Google Gemini via Genkit
- **PDF Generation:** jsPDF, html2canvas
- **State Management:** React hooks, localStorage

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the development server:**
   ```bash
   npm run dev
   ```
3. **(Optional) Start Genkit for AI flows:**
   ```bash
   npm run genkit:dev
   ```

---

## Usage

- Enter a presentation topic and select a style.
- Click "Generate Presentation" to create slides.
- Edit slide titles as needed.
- Preview your presentation.
- Export as PDF or save for later.

---

## Style & Design

- **Primary color:** Deep blue (#3498DB)
- **Background:** Light blue (#EBF5FB)
- **Accent:** Purple (#9B59B6)
- **Fonts:** 'Inter' for body, 'Space Grotesk' for headers
- **Design:** Clean, minimalist, with subtle transitions

---

## License

MIT
