import type { Metadata } from "next";
import { ShortFilmUploadContent } from "@/features/short-films/components/upload/ShortFilmUploadContent";

export const metadata: Metadata = {
  title: "Upload short film",
  description:
    "Upload your short film to 35mm. Share your story with a community of film lovers.",
  robots: { index: false, follow: false },
};

export default function ShortFilmUploadPage() {
  return <ShortFilmUploadContent />;
}
