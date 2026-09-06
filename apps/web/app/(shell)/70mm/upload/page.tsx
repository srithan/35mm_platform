import type { Metadata } from "next";
import { ShortFilmUploadContent } from "@/features/70mm/components/upload/ShortFilmUploadContent";

export const metadata: Metadata = {
  title: "Upload to 70mm",
  description:
    "Upload your film or series to 70mm on 35mm. Share your story with a community of film lovers.",
  robots: { index: false, follow: false },
};

export default function SeventyMmUploadPage() {
  return <ShortFilmUploadContent />;
}
