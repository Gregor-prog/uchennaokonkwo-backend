import { Module } from '@nestjs/common';
import { PetitionsService } from './petitions.service';
import { PetitionsController } from './petitions.controller';

@Module({
  controllers: [PetitionsController],
  providers: [PetitionsService],
})
export class PetitionsModule {}
