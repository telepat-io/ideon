import Replicate from 'replicate';

export class ReplicateClient {
  private readonly client: Replicate;

  constructor(apiToken: string) {
    this.client = new Replicate({ auth: apiToken });
  }

  async runModel(model: string, input: Record<string, unknown>): Promise<unknown> {
    return this.client.run(model as `${string}/${string}` | `${string}/${string}:${string}`, { input });
  }
}