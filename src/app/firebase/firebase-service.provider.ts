import { FirebaseConfig } from '@app/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@shared/services';
import { app, initializeApp, messaging } from 'firebase-admin';
type FirebaseApp = app.App;
type Messaging = messaging.Messaging;
@Injectable()
export class FirebaseServiceProvider implements OnModuleInit, OnModuleDestroy {
  get currentApp(): FirebaseApp {
    return this.firebaseApp;
  }

  get messaging(): Messaging {
    return this.firebaseApp.messaging();
  }
  public isAppDeleted = false;
  private readonly logger: LoggerService = new LoggerService('FirebaseService');
  private readonly firebaseApp: FirebaseApp;
  constructor() {
    this.firebaseApp = initializeApp(FirebaseConfig, 'My Community');
  }
  public onModuleInit() {
    this.logger.log(`Initialized Applications: ${this.firebaseApp.name}`);
  }
  public async onModuleDestroy() {
    if (!this.isAppDeleted) {
      this.logger.log('Removing Current Firebase App..');
      this.isAppDeleted = true;
      await this.firebaseApp.delete();
    }
  }
}
