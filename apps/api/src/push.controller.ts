import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { PushService } from './push.service.js';
import { BrowserPushSubscription, SendDto, SubscribeDto } from './push.types.js';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('subscriptions')
  list() {
    return this.pushService.getStats();
  }

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.pushService.subscribe(dto);
  }

  @Delete('subscribe')
  unsubscribe(@Body() subscription: BrowserPushSubscription) {
    return this.pushService.unsubscribe(subscription);
  }

  @Post('send')
  send(@Body() dto: SendDto) {
    return this.pushService.send(dto);
  }
}
