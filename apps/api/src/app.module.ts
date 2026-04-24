import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [PushController],
  providers: [PushService]
})
export class AppModule {}
