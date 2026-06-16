import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto, CreatePaymentSessionDto } from "./dto/payment.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { VerifiedOnlyGuard } from "../../common/guards/verified-only.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../database/entities";
import { Request as ExpressRequest } from "express";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("create-checkout-session")
  @UseGuards(JwtAuthGuard, VerifiedOnlyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create Stripe checkout session" })
  async createCheckoutSession(
    @Request() req: any,
    @Body() createPaymentSessionDto: CreatePaymentSessionDto,
  ) {
    return this.paymentsService.createPaymentSession(
      req.user.id,
      createPaymentSessionDto,
    );
  }

  @Post("webhook")
  @ApiOperation({ summary: "Stripe webhook endpoint" })
  async handleWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers("stripe-signature") signature: string,
  ) {
    const payload = req.body;
    if (!payload || !Buffer.isBuffer(payload)) {
      console.error("Webhook error: No payload received");
      console.error("Payload type:", typeof payload);
      console.error("Payload:", payload);
      throw new Error("No payload received");
    }
    console.log("Webhook received, payload size:", payload.length);
    return this.paymentsService.handleWebhook(payload, signature);
  }

  @Get("verify/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify payment status" })
  async verifyPayment(@Param("orderId") orderId: string) {
    return this.paymentsService.verifyPayment(orderId);
  }

  @Post("verify-session")
  @ApiOperation({ summary: "Verify Stripe session and confirm order" })
  async verifySession(@Body() body: { sessionId: string }) {
    return this.paymentsService.verifyAndConfirmPayment(body.sessionId);
  }

  @Get("order/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get payment by order ID" })
  async getPaymentByOrder(@Param("orderId") orderId: string) {
    return this.paymentsService.getPaymentByOrder(orderId);
  }

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all payments (Admin only)" })
  async getPaymentsForAdmin(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.paymentsService.getPaymentsForAdmin(+page, +limit);
  }

  @Post("confirm-cod/:orderId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm COD payment (when cash collected)" })
  async confirmCODPayment(
    @Param("orderId") orderId: string,
    @Body() body: { transactionId?: string },
  ) {
    return this.paymentsService.confirmCODPayment(orderId, body.transactionId);
  }

  @Post("cod-failed/:orderId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark COD payment as failed" })
  async markCODPaymentFailed(
    @Param("orderId") orderId: string,
    @Body() body: { reason: string },
  ) {
    return this.paymentsService.markCODPaymentFailed(orderId, body.reason);
  }
}
