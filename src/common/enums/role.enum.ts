/**
 * Role enum — mirrors the Prisma Role enum so guards/decorators
 * stay decoupled from the generated client.
 */
export enum Role {
  ADMIN = 'ADMIN',
  MEDIA = 'MEDIA',
  VOLUNTEER = 'VOLUNTEER',
}
