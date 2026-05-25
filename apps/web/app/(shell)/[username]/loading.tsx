export default function ProfileLoading() {
  return (
    <div className="min-h-screen w-full box-border px-0">
      <div className="h-40 w-full animate-pulse bg-sunken" />

      <div className="relative border-b border-border px-5 pb-6 md:px-8">
        <div className="absolute -top-14 left-5 h-28 w-28 animate-pulse rounded-full border-4 border-bg bg-sunken md:left-8 md:h-32 md:w-32" />

        <div className="pt-20 md:pt-24">
          <div className="h-8 w-56 animate-pulse rounded bg-sunken" />
          <div className="mt-3 h-6 w-36 animate-pulse rounded-full bg-sunken" />
          <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-sunken" />
          <div className="mt-2 h-4 w-[70%] max-w-lg animate-pulse rounded bg-sunken" />
          <div className="mt-5 flex gap-2">
            <div className="h-10 w-28 animate-pulse rounded-lg bg-sunken" />
            <div className="h-10 w-28 animate-pulse rounded-lg bg-sunken" />
          </div>
        </div>
      </div>

      <div className="mt-4 border-b border-border px-5 pb-3 md:px-8">
        <div className="h-6 w-72 animate-pulse rounded bg-sunken" />
      </div>
    </div>
  );
}
