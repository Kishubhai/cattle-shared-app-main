export interface Cattle {
  id: string;
  tagNumber: string;
  breed: string;
  age: number;
  medicalHistory?: string;
  status: 'active' | 'pending' | 'archived';
  images: {
    muzzle: string[];
    face: string[];
    left?: string[];
    right?: string[];
    fullBodyLeft: string;
    fullBodyRight: string;
  };
  owner: {
    id: string;
    name: string;
  };
  registrationDate: string;
  approvalStatus?: 'approved' | 'rejected' | 'pending';
}

export interface CattleFilterStatus {
  all: boolean;
  active: boolean;
  pending: boolean;
  archived: boolean;
}