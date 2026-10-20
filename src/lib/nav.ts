export function pageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'Tableau de bord';
  if (pathname.startsWith('/sales')) return 'Ventes';
  if (pathname.startsWith('/listings')) return 'Inventaire';
  if (pathname.startsWith('/events')) return 'Événements';
  if (pathname.startsWith('/alerts')) return 'Alertes';
  if (pathname.startsWith('/settings')) return 'Paramètres';
  if (pathname.startsWith('/login')) return 'Connexion';
  return 'SeatShop';
}

export function pageSection(pathname: string): string {
  if (pathname.startsWith('/sales')) return 'Commandes';
  if (pathname.startsWith('/listings')) return 'Catalogue';
  if (pathname.startsWith('/events')) return 'Catalogue';
  if (pathname.startsWith('/alerts')) return 'Notifications';
  if (pathname.startsWith('/settings')) return 'Compte';
  return 'Général';
}
