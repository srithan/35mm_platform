import Image from "next/image";
import { fetchCarouselFilms } from "../lib/fetchCarouselFilms";

export async function LandingCarousel() {
  const films = await fetchCarouselFilms();

  if (films.length === 0) {
    return (
      <div className="relative overflow-hidden py-2">
        <div className="scene">
          <div className="a3d" style={{ "--n": 1 } as React.CSSProperties}>
            <div
              className="card-item flex w-[208px] items-center justify-center rounded-lg bg-[#fafafa] aspect-[2/3]"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              <span className="font-mono text-[0.7rem] uppercase tracking-wider text-[#bbb]">
                No posters available
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden py-2">
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
