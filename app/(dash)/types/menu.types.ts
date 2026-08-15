// types/menu.types.ts

export interface MenuItem {
    id: string;
    label: string;
    url: string;
    children: MenuItem[];
  }
  
  export interface MenuStructure {
    items: MenuItem[];
    version: string;
    updatedAt: string;
  }
  
  export interface FlatMenuItem extends MenuItem {
    depth: number;
    parentId: string | null;
  }
  
  export interface MenuFormData {
    label: string;
    url: string;
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }