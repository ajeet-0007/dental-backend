import { ArrayNotEmpty, IsArray, IsInt } from "class-validator";

export class BulkDeleteProductsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}
