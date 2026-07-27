import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { BrevoService } from '../brevo/brevo.service'
import { CreateSupportMessageDto } from './dto/create-support-message.dto'

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly brevoService: BrevoService) {}

  @Post()
  @ApiOperation({ summary: 'Send a support/contact message' })
  async sendSupportMessage(@Body() dto: CreateSupportMessageDto) {
    await this.brevoService.sendSupportEmail(dto)
    return { message: 'Message sent successfully' }
  }
}
