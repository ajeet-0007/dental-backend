import { IsNumber, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddToWishlistDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  productId: number;
}
