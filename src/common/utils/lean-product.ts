import { SelectQueryBuilder } from "typeorm";
import { Product } from "../../database/entities";

export const LEAN_PRODUCT_FIELDS: string[] = [
  "product.id",
  "product.name",
  "product.slug",
  "product.images",
  "product.sellingPrice",
  "product.mrp",
  "product.unit",
  "product.brand",
  "product.isFeatured",
  "product.createdAt",
];

export function leanProductQuery(
  qb: SelectQueryBuilder<Product>,
): SelectQueryBuilder<Product> {
  return qb
    .leftJoinAndSelect("product.brandEntity", "brandEntity")
    .select([
      ...LEAN_PRODUCT_FIELDS,
      "brandEntity.id",
      "brandEntity.name",
      "brandEntity.slug",
      "brandEntity.logo",
    ]);
}
