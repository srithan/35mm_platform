declare module "aws-sigv4-auth-cassandra-plugin" {
  export class SigV4AuthProvider {
    constructor(options: { region: string });
  }

  var sigV4: {
    SigV4AuthProvider: typeof SigV4AuthProvider;
  };

  export default sigV4;
}
