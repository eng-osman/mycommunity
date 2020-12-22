import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { VerifyPaymentDTO } from './dto/verify-payment.dto';
import { PaymentService } from './payment.service';

@ApiUseTags('Payment')
@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ title: 'Verify user Payment' })
  @ApiBearerAuth()
  @Post('verify')
  public async verifyPayment(@User() user, @Body() data: VerifyPaymentDTO) {
    return this.paymentService.verifyPayment(user.id, data);
  }
}
