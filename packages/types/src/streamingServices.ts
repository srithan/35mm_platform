export const STREAMING_SERVICES = [
  {
    id: "netflix",
    label: "Netflix",
    logoPath: "/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
    providerIds: [8],
  },
  {
    id: "prime-video",
    label: "Prime Video",
    logoPath: "/pvske1MyAoymrs5bguRfVqYiM9a.jpg",
    providerIds: [9],
  },
  {
    id: "hulu",
    label: "Hulu",
    logoPath: "/bxBlRPEPpMVDc4jMhSrTf2339DW.jpg",
    providerIds: [15],
  },
  {
    id: "max",
    label: "Max",
    logoPath: "/jbe4gVSfRlbPTdESXhEKpornsfu.jpg",
    providerIds: [1899],
  },
  {
    id: "mubi",
    label: "MUBI",
    logoPath: "/x570VpH2C9EKDf1riP83rYc5dnL.jpg",
    providerIds: [11],
  },
  {
    id: "disney-plus",
    label: "Disney+",
    logoPath: "/97yvRBw1GzX7fXprcF80er19ot.jpg",
    providerIds: [337],
  },
  {
    id: "apple-tv-plus",
    label: "Apple TV+",
    logoPath: "/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg",
    providerIds: [350],
  },
  {
    id: "peacock",
    label: "Peacock",
    logoPath: "/2aGrp1xw3qhwCYvNGAJZPdjfeeX.jpg",
    providerIds: [386],
  },
  {
    id: "paramount-plus",
    label: "Paramount+",
    logoPath: "/fts6X10Jn4QT0X6ac3udKEn2tJA.jpg",
    providerIds: [2303, 2616],
  },
  {
    id: "criterion-channel",
    label: "Criterion Channel",
    logoPath: "/yhrtzYd43pFIhRq0ruO8umJPuyn.jpg",
    providerIds: [258],
  },
] as const;

export type StreamingServiceId = (typeof STREAMING_SERVICES)[number]["id"];

export const DEFAULT_STREAMING_SERVICE_IDS: StreamingServiceId[] = [
  "netflix",
  "prime-video",
  "hulu",
  "max",
];

const STREAMING_SERVICE_ID_SET = new Set<string>(
  STREAMING_SERVICES.map(function (service) {
    return service.id;
  })
);

export function isStreamingServiceId(value: unknown): value is StreamingServiceId {
  return typeof value === "string" && STREAMING_SERVICE_ID_SET.has(value);
}

export function normalizeStreamingServiceIds(value: unknown): StreamingServiceId[] | null {
  if (!Array.isArray(value) || value.length > STREAMING_SERVICES.length) return null;
  if (!value.every(isStreamingServiceId)) return null;

  const selected = new Set<StreamingServiceId>();
  return value.filter(function (serviceId): serviceId is StreamingServiceId {
    if (!isStreamingServiceId(serviceId) || selected.has(serviceId)) return false;
    selected.add(serviceId);
    return true;
  });
}

export function streamingProviderIds(serviceIds: readonly StreamingServiceId[]): number[] {
  return serviceIds.flatMap(function (serviceId) {
    const service = STREAMING_SERVICES.find(function (candidate) {
      return candidate.id === serviceId;
    });
    return service ? [...service.providerIds] : [];
  });
}
