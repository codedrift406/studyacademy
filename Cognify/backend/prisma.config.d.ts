declare module "prisma" {
  // minimal typing for Prisma config helper
  export function defineConfig(config: { schema: string }): any;
}