import { Module } from '@nestjs/common';
import { AuthModule } from './auth.module.js';
import { AuthController } from './http/auth.controller.js';

@Module({ imports: [AuthModule], controllers: [AuthController] })
export class AuthHttpModule {}
