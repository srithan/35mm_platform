import type { Metadata } from "next";
import { ShortFilmsContent } from "@/features/70mm";

export const metadata: Metadata = {
  title: "70mm — Watch Films, Shorts, and Series on 35mm",
  description:
    "Browse community-uploaded films, short films, web series, documentaries, and more on 70mm. Stream in HD with no ads.",
  openGraph: {
    title: "70mm — Watch Films, Shorts, and Series on 35mm",
    description:
      "Browse community-uploaded films, short films, web series, documentaries, and more on 70mm. Stream in HD with no ads.",
  },
};

export default function SeventyMmPage() {
  return <ShortFilmsContent />;
}
