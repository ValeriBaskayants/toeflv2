import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  async getStats(adminId: string) {
    const totalUsers = await this.prisma.user.count();
    
    const adminData = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, role: true } 
    });

    return {
      adminInfo: adminData,
      platformStats: {
        totalUsers,
      }
    };
  }
}