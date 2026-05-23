import Image from "next/image";
import { fetchCarouselFilms } from "../lib/fetchCarouselFilms";

export async function LandingCarousel() {
  const films = await fetchCarouselFilms();

  if (films.length === 0) {
    return (
      <div className="relative z-10 py-8 pb-16">
        <div className="scene">
          <div className="a3d" style={{ "--n": 1 } as React.CSSProperties}>
            <div
              className="card-item w-[208px] aspect-[2/3] bg-white/5 rounded-lg flex items-center justify-center"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              <span className="font-mono text-[0.7rem] text-white/30 uppercase tracking-wider">
                No posters available
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 py-8 pb-16">
      <div className="scene">
        <div
          className="a3d"
          style={{ "--n": films.length } as React.CSSProperties}
        >
          {films.map(({ id, title, posterUrl }, i) => (
            <Image
              key={id}
              className="card-item"
              src={posterUrl}
              alt={title}
              width={208}
              height={312}
              style={{ "--i": i } as React.CSSProperties}
              unoptimized
            />
          ))}
        </div>
      </div>
    </div>
  );
}
