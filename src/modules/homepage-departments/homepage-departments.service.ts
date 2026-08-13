import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HomepageDepartment, Department, Product } from "../../database/entities";
import { CreateHomepageDepartmentDto, UpdateHomepageDepartmentDto } from "./dto/homepage-department.dto";

const PRODUCTS_PER_DEPARTMENT = 10;

@Injectable()
export class HomepageDepartmentsService {
  constructor(
    @InjectRepository(HomepageDepartment)
    private homepageDepartmentRepository: Repository<HomepageDepartment>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAllForHome(): Promise<{ department: Department; products: Product[]; count: number }[]> {
    const sections = await this.homepageDepartmentRepository.find({
      where: { isActive: true },
      relations: ["department"],
      order: { sortOrder: "ASC", id: "ASC" },
    });

    const result: { department: Department; products: Product[]; count: number }[] = [];

    for (const section of sections) {
      if (!section.department || !section.department.isActive) continue;

      const products = await this.productRepository
        .createQueryBuilder("product")
        .innerJoinAndSelect("product.departments", "departments")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect("product.brandEntity", "brandEntity")
        .leftJoinAndSelect("product.inventories", "inventories")
        .where("product.isActive = :isActive", { isActive: true })
        .andWhere("departments.id = :departmentId", {
          departmentId: section.departmentId,
        })
        .orderBy("product.isFeatured", "DESC")
        .addOrderBy("product.createdAt", "DESC")
        .take(PRODUCTS_PER_DEPARTMENT)
        .getMany();

      const count = await this.productRepository
        .createQueryBuilder("product")
        .innerJoin("product.departments", "departments")
        .where("product.isActive = :isActive", { isActive: true })
        .andWhere("departments.id = :departmentId", {
          departmentId: section.departmentId,
        })
        .getCount();

      result.push({ department: section.department, products, count });
    }

    return result;
  }

  async findAllForAdmin(): Promise<HomepageDepartment[]> {
    return this.homepageDepartmentRepository.find({
      relations: ["department"],
      order: { sortOrder: "ASC", id: "ASC" },
    });
  }

  async create(createHomepageDepartmentDto: CreateHomepageDepartmentDto): Promise<HomepageDepartment> {
    const department = await this.departmentRepository.findOne({
      where: { id: createHomepageDepartmentDto.departmentId },
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    const existing = await this.homepageDepartmentRepository.findOne({
      where: { departmentId: createHomepageDepartmentDto.departmentId },
    });

    if (existing) {
      throw new ConflictException("This department is already configured on the homepage");
    }

    const section = this.homepageDepartmentRepository.create(createHomepageDepartmentDto);
    return this.homepageDepartmentRepository.save(section);
  }

  async update(
    id: string,
    updateHomepageDepartmentDto: UpdateHomepageDepartmentDto,
  ): Promise<HomepageDepartment> {
    const section = await this.homepageDepartmentRepository.findOne({
      where: { id: parseInt(id, 10) },
      relations: ["department"],
    });

    if (!section) {
      throw new NotFoundException("Homepage department not found");
    }

    if (updateHomepageDepartmentDto.departmentId) {
      const department = await this.departmentRepository.findOne({
        where: { id: updateHomepageDepartmentDto.departmentId },
      });

      if (!department) {
        throw new NotFoundException("Department not found");
      }

      if (updateHomepageDepartmentDto.departmentId !== section.departmentId) {
        const existing = await this.homepageDepartmentRepository.findOne({
          where: { departmentId: updateHomepageDepartmentDto.departmentId },
        });

        if (existing) {
          throw new ConflictException("This department is already configured on the homepage");
        }
      }
    }

    Object.assign(section, updateHomepageDepartmentDto);
    return this.homepageDepartmentRepository.save(section);
  }

  async remove(id: string): Promise<void> {
    const section = await this.homepageDepartmentRepository.findOne({
      where: { id: parseInt(id, 10) },
    });

    if (!section) {
      throw new NotFoundException("Homepage department not found");
    }

    await this.homepageDepartmentRepository.remove(section);
  }
}
