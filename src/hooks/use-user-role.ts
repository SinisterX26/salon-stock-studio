export type UserRole = "admin" | "staff";

export interface UserPermissions {
  canManageProducts: boolean;
  canDeleteProducts: boolean;
  canEditPrices: boolean;
  canAdjustStockDirectly: boolean;
  canRecordSales: boolean;
  canDeleteSales: boolean;
  canManageTeam: boolean;
  canAssignRoles: boolean;
  canViewFinancialMargins: boolean;
}

export function useUserRole() {
  // Administrator is permanent and cannot switch to staff
  const role: UserRole = "admin";
  const isAdmin = true;

  const permissions: UserPermissions = {
    canManageProducts: true,
    canDeleteProducts: true,
    canEditPrices: true,
    canAdjustStockDirectly: true,
    canRecordSales: true,
    canDeleteSales: true,
    canManageTeam: true,
    canAssignRoles: true, // Only administrator can assign roles to staff
    canViewFinancialMargins: true,
  };

  const userName = "Heavic Administrator";
  const userEmail = "admin@heavicventures.com";

  return {
    role,
    isAdmin,
    permissions,
    userName,
    userEmail,
  };
}
