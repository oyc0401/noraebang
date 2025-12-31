import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'typesense';

@Injectable()
export class TypesenseService implements OnModuleInit {
  private client: Client;

  constructor(private configService: ConfigService) {
    this.client = new Client({
      nodes: [
        {
          host: this.configService.get<string>('TYPESENSE_HOST', 'localhost'),
          port: this.configService.get<number>('TYPESENSE_PORT', 8108),
          protocol: this.configService.get<string>('TYPESENSE_PROTOCOL', 'http'),
        },
      ],
      apiKey: this.configService.get<string>('TYPESENSE_API_KEY', ''),
      connectionTimeoutSeconds: 2,
    });
  }

  async onModuleInit() {
    try {
      const health = await this.client.health.retrieve();
      console.log('Typesense connection successful:', health);
    } catch (error) {
      console.error('Typesense connection failed:', error);
    }
  }

  getClient(): Client {
    return this.client;
  }
}
