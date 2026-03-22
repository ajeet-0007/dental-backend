"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../../database/entities");
const slugify_1 = require("../../common/utils/slugify");
let CategoriesService = class CategoriesService {
    constructor(categoryRepository) {
        this.categoryRepository = categoryRepository;
    }
    async create(createCategoryDto) {
        const slug = createCategoryDto.slug || (0, slugify_1.slugify)(createCategoryDto.name);
        const existingCategory = await this.categoryRepository.findOne({
            where: { slug },
        });
        if (existingCategory) {
            throw new common_1.ConflictException("Category with this slug already exists");
        }
        const category = this.categoryRepository.create({
            ...createCategoryDto,
            slug,
        });
        return this.categoryRepository.save(category);
    }
    async findAll(activeOnly = true) {
        const query = this.categoryRepository
            .createQueryBuilder("category")
            .leftJoinAndSelect("category.children", "children")
            .orderBy("category.sortOrder", "ASC");
        if (activeOnly) {
            query.where("category.isActive = :isActive", { isActive: true });
        }
        return query.getMany();
    }
    async findOne(id) {
        const category = await this.categoryRepository.findOne({
            where: { id: parseInt(id, 10) },
            relations: ["children", "products"],
        });
        if (!category) {
            throw new common_1.NotFoundException("Category not found");
        }
        return category;
    }
    async findBySlug(slug) {
        const category = await this.categoryRepository.findOne({
            where: { slug },
            relations: ["children", "products"],
        });
        if (!category) {
            throw new common_1.NotFoundException("Category not found");
        }
        return category;
    }
    async update(id, updateCategoryDto) {
        const category = await this.findOne(id);
        if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
            updateCategoryDto.slug =
                updateCategoryDto.slug || (0, slugify_1.slugify)(updateCategoryDto.name);
        }
        Object.assign(category, updateCategoryDto);
        return this.categoryRepository.save(category);
    }
    async remove(id) {
        const category = await this.findOne(id);
        const hasChildren = await this.categoryRepository.count({
            where: { parentId: id },
        });
        if (hasChildren > 0) {
            throw new common_1.ConflictException("Cannot delete category with children");
        }
        await this.categoryRepository.remove(category);
    }
    async getTree() {
        const rootCategories = await this.categoryRepository.find({
            where: { parentId: undefined },
            relations: ["children", "children.children"],
            order: { sortOrder: "ASC" },
        });
        return rootCategories;
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Category)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map