import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SessionExpiredModalProvider } from "@/components/session-expire-modal-provider";
import { triggerSessionExpiredModal } from "./sessionExpired";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  lastLogin: string; // You can use Date if you're parsing to JS Date object
  IsHRLeader: boolean;
  group: string
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLoggedInUser(): User {
  return JSON.parse(sessionStorage.getItem("user") || "{}");
}

// utils/fetchWithCredentials.ts
export const fetchWithCredentials = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const defaultOptions: RequestInit = {
    credentials: 'include',
    ...init,
  };
  // return fetch(input, defaultOptions);
  const response = await fetch(input, defaultOptions)

  if(response.status === 401){
    triggerSessionExpiredModal()
    // alert('Your login has expired, Please login again.')
    // window.location.href = '/'
  }

  return response 
};

// routeAccessRules.ts
type RouteAccess = {
  path: string;
  allow: (user: any) => boolean;
};

const hasRole = (user: any, role: string) => user.group?.split(":").includes(role);

// admin has access to everything
const allowRoles = (...roles: string[]) => (user: any) =>
  hasRole(user, "admin") || roles.some((role) => hasRole(user, role));

export const routeAccessRules: RouteAccess[] = [
  {
    path: "/dashboard",
    allow: allowRoles("hrleader"),
  },
  {
    path: "/jobs",
    allow: allowRoles("hrleader", "functionalleader"),
  },
  {
    path: "/editing",
    allow: allowRoles("hrleader", "functionalleader"),
  },
  {
    path: "/job-final-review",
    allow: allowRoles("hrleader", "functionalleader"),
  },
  {
    path: "/notifications",
    allow: allowRoles("hrleader", "functionalleader"),
  },
  {
    path: "/compare-versions",
    allow: allowRoles("hrleader", "functionalleader"),
  },
  {
    path: "/settings",
    allow: allowRoles(),
  },
  {
    path: "/", // fallback home route
    allow: () => true,
  },
];

// redirectToAccessibleRoute.ts

export function routeToRedirect(user: any) {
  for (const rule of routeAccessRules) {
    if (rule.allow(user)) {
      return rule.path;
    }
  }

  // If no accessible route found, redirect to not found or unauthorized
  return "/notfound" 
}

