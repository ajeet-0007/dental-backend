import { Repository } from 'typeorm';
import { Address } from '../../database/entities';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
export declare class AddressesService {
    private addressRepository;
    constructor(addressRepository: Repository<Address>);
    create(userId: string, createAddressDto: CreateAddressDto): Promise<Address>;
    findAll(userId: string): Promise<Address[]>;
    findOne(id: number, userId: string): Promise<Address>;
    update(id: number, userId: string, updateAddressDto: UpdateAddressDto): Promise<Address>;
    remove(id: number, userId: string): Promise<void>;
    getDefaultAddress(userId: string): Promise<Address | null>;
}
