import cassandra from "cassandra-driver";
import sigV4 from "aws-sigv4-auth-cassandra-plugin";

let client: cassandra.Client | null = null;
let connectPromise: Promise<cassandra.Client> | null = null;

const KEYSPACE = "thirtyFiveMM";

function numberEnv(name: string, fallback: number): number {
  var parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getKeyspacesClient(): cassandra.Client {
  if (client) return client;

  var region = process.env.AWS_REGION ?? "us-east-1";
  var endpoint = process.env.KEYSPACES_ENDPOINT ?? `cassandra.${region}.amazonaws.com`;
  var authProvider = new sigV4.SigV4AuthProvider({ region }) as unknown as cassandra.auth.AuthProvider;
  var localDistance = cassandra.types.distance.local;
  var localQuorum = cassandra.types.consistencies.localQuorum;
  var localOne = cassandra.types.consistencies.localOne;
  var loadBalancing = new cassandra.policies.loadBalancing.DCAwareRoundRobinPolicy(region);
  var retry = new cassandra.policies.retry.FallthroughRetryPolicy();

  client = new cassandra.Client({
    contactPoints: [endpoint],
    localDataCenter: region,
    authProvider,
    protocolOptions: {
      port: 9142,
      maxVersion: 4,
      maxSchemaAgreementWaitSeconds: 0,
    },
    sslOptions: { host: endpoint, rejectUnauthorized: true },
    keyspace: KEYSPACE,
    policies: {
      loadBalancing,
      retry,
    },
    queryOptions: {
      consistency: localQuorum,
      prepare: true,
      isIdempotent: false,
      fetchSize: 100,
    },
    profiles: [
      new cassandra.ExecutionProfile("chat-read", {
        consistency: localOne,
        loadBalancing,
        retry,
        readTimeout: numberEnv("KEYSPACES_READ_TIMEOUT_MS", 2_000),
      }),
      new cassandra.ExecutionProfile("chat-write", {
        consistency: localQuorum,
        loadBalancing,
        retry,
        readTimeout: numberEnv("KEYSPACES_WRITE_TIMEOUT_MS", 2_000),
      }),
    ],
    pooling: {
      coreConnectionsPerHost: {
        [localDistance]: numberEnv("KEYSPACES_CORE_CONNECTIONS", 4),
      },
      maxRequestsPerConnection: numberEnv("KEYSPACES_MAX_REQUESTS_PER_CONNECTION", 1024),
      heartBeatInterval: numberEnv("KEYSPACES_HEARTBEAT_MS", 30_000),
      warmup: true,
    },
    prepareOnAllHosts: true,
    rePrepareOnUp: true,
    socketOptions: {
      connectTimeout: numberEnv("KEYSPACES_CONNECT_TIMEOUT_MS", 3_000),
      readTimeout: numberEnv("KEYSPACES_DEFAULT_TIMEOUT_MS", 2_000),
      keepAlive: true,
      tcpNoDelay: true,
    },
  });

  return client;
}

export async function warmKeyspacesClient(): Promise<cassandra.Client | null> {
  var nextClient = tryGetKeyspacesClient();
  if (!nextClient) return null;
  if (!connectPromise) {
    var connectedClient = nextClient;
    connectPromise = connectedClient.connect().then(function () {
      return connectedClient;
    });
  }
  return connectPromise;
}

export function tryGetKeyspacesClient(): cassandra.Client | null {
  try {
    if (!process.env.AWS_REGION && !process.env.KEYSPACES_ENDPOINT) return null;
    return getKeyspacesClient();
  } catch {
    return null;
  }
}
