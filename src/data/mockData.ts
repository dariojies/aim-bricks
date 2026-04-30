// src/data/mockData.ts
export type ItemType = 'Aim Brickslab' | 'Libro';
export type ItemStatus = 'Disponible' | 'Reservado';

export interface CatalogItem {
  id: string;
  title: string;
  type: string;
  description: string;
  status: ItemStatus;
  isAvailable?: boolean;
  stock?: number;
  imageUrl: string;
  legoReference?: string;
  isbn?: string;
  author?: string;
  isProOnly?: boolean;
  categoryId?: string;
  metadata?: Record<string, any>;
  categoryConfig?: {
    customFields?: Array<{ name: string, label: string, type: string }>;
    reservationMode?: 'brickslab' | 'library';
  };
}

export const mockItems: CatalogItem[] = [
  {
    id: '1',
    title: 'Aim Brickslab Nave Estelar',
    type: 'Aim Brickslab',
    description: 'Una enorme nave estelar de 2000 piezas para construir y conquistar la galaxia. Perfecta para pasar horas en la estación Aim Brickslab.',
    status: 'Disponible',
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '2',
    title: 'La Gran Aventura',
    type: 'Libro',
    description: 'Una novela de fantasía épica que te llevará por tierras mágicas. Edición de tapa dura.',
    status: 'Disponible',
    imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    title: 'Aim Brickslab Rescate en la Ciudad',
    type: 'Aim Brickslab',
    description: 'Construye una bulliciosa estación de rescate con camiones de bomberos y helicópteros.',
    status: 'Reservado',
    imageUrl: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    title: 'Dominando el Desarrollo Web',
    type: 'Libro',
    description: 'Aprende desarrollo web moderno usando React y Vite. Ideal para estudiar en el local.',
    status: 'Disponible',
    imageUrl: 'https://images.unsplash.com/photo-1587614295999-6c1c13675117?auto=format&fit=crop&q=80&w=800'
  }
];

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role?: string;
  readBooks: CatalogItem[];
  builtBrickslabs: CatalogItem[];
  currentReservations: { id: string, status: string, text: string, isBrickslab?: boolean, brickslabId?: string }[];
  permissions?: Record<string, { standard: boolean; pro: boolean }>;
}

export const mockUser: UserProfile = {
  name: 'Estudiante Aim',
  email: 'usuario@aim.com',
  readBooks: [
    {
      id: '101',
      title: 'El Principito',
      type: 'Libro',
      description: 'Un cuento poético clásico e inspirador.',
      status: 'Disponible',
      imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=800'
    }
  ],
  builtBrickslabs: [
    {
      id: '102',
      title: 'Aim Brickslab Coche de Carreras',
      type: 'Aim Brickslab',
      description: 'Coche de carreras rojo clásico para coleccionistas.',
      status: 'Disponible',
      imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&q=80&w=800'
    }
  ],
  currentReservations: []
};
