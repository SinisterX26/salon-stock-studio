import { useState, useEffect } from "react";

export type UserRole = "admin" | "staff";

export interface UserPermissions {
  canManageProducts: boolean;
  canDeleteProducts: boolean;
  canEditPrices: boolean;
  canAdjustStockDirectly: boolean;
  canRecordSales: boolean;
  canDeleteSales: boolean;
  canManageTeam: boolean;
  canManageRoles: boolean;
  canViewFinancialMargins: boolean;
}

const STORAGE_KEY = "heavic_user_role";

export function useUserRole() {
  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "admin" || saved === "staff") return saved;
    }
    return "admin";
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "admin" || e.newValue === "staff")) {
        setRoleState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newRole);
      // Dispatch custom event for same-window listeners
      window.dispatchEvent(new Event("heavic_role_changed"));
    }
  };

  useEffect(() => {
    const handleCustomEvent = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "admin" || saved === "staff") {
        setRoleState(saved);
      }
    };
    window.addEventListener("heavic_role_changed", handleCustomEvent);
    return () => window.removeEventListener("heavic_role_changed", handleCustomEvent);
  }, []);

  const isAdmin = role === "admin";

  const permissions: UserPermissions = {
    canManageProducts: isAdmin,
    canDeleteProducts: isAdmin,
    canEditPrices: isAdmin,
    canAdjustStockDirectly: isAdmin,
    canRecordSales: true,
    canDeleteSales: isAdmin,
    canManageTeam: isAdmin,
    canManageRoles: isAdmin,
    canViewFinancialMargins: isAdmin,
  };

  const userName = isAdmin ? "Heavic Administrator" : "Salome (Stylist & Cashier)";
  const userEmail = isAdmin ? "admin@heavicventures.com" : "salome@heavicventures.com";

  return {
    role,
    setRole,
    isAdmin,
    permissions,
    userName,
    userEmail,
  };
}
