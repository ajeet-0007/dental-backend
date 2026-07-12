import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { GalleryAlbum } from "./gallery-album.entity";

@Entity("gallery_images")
export class GalleryImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  imageUrl: string;

  @Column({ nullable: true })
  caption: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => GalleryAlbum, (album) => album.images, { onDelete: "CASCADE" })
  @JoinColumn({ name: "albumId" })
  album: GalleryAlbum;

  @Column()
  albumId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
